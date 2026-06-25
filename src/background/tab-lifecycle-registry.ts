import { hasStorageArea, storageGet, storageSet } from '../shared/api-adapter';
import { LIMITS } from '../shared/constants';
import { createContentCommand, type ContentCommandPayload } from '../shared/messages';
import { inspectContentCommandResponse } from '../shared/response-contract';
import {
  BACKGROUND_RUNTIME_EPOCH,
  invalidateTabDocuments,
  replaceTabDocuments,
  targetDocumentInstanceForTab,
} from './document-registry';
import { tryRebindRuntimeEpoch } from './permission-manager';

const INTENT_KEY = 'rtlx:tab-intents:v1';
const INTENT_TTL_MS = 5 * 60_000;
const MAX_INTENTS = 256;
const BROADCAST_CONCURRENCY = 8;

export type TabDeliveryStatus =
  | 'delivered'
  | 'discarded'
  | 'loading'
  | 'frozen'
  | 'unreachable'
  | 'timeout'
  | 'invalid_response'
  | 'missing_tab';

export type TabDeliveryResult = Readonly<{
  status: TabDeliveryStatus;
  reasonCode: string;
  data: unknown;
}>;

export type TabRuntimeState =
  | 'active'
  | 'background'
  | 'discarded'
  | 'loading'
  | 'frozen'
  | 'unreachable'
  | 'removed';

interface TabStateEntry {
  tabId: number;
  state: TabRuntimeState;
  updatedAt: string;
}

interface TabIntent {
  id: string;
  tabId: number;
  command: ContentCommandWithoutMeta;
  createdAt: string;
  expiresAt: string;
}

type ContentCommandWithoutMeta = ContentCommandPayload;
const states = new Map<number, TabStateEntry>();
let intentOperation: Promise<void> = Promise.resolve();

export function observeTabUpdated(
  tabId: number,
  changeInfo: chrome.tabs.OnUpdatedInfo,
  tab: chrome.tabs.Tab
): void {
  if (tab.discarded === true || changeInfo.discarded === true) {
    setState(tabId, 'discarded');
    invalidateTabDocuments(tabId);
  } else if (changeInfo.status === 'loading') {
    setState(tabId, 'loading');
    invalidateTabDocuments(tabId);
  } else if (changeInfo.status === 'complete') {
    setState(tabId, tab.active ? 'active' : 'background');
    void flushTabIntents(tabId);
  } else if (tab.active) {
    setState(tabId, 'active');
  }
}

export function observeTabActivated(tabId: number): void {
  setState(tabId, 'active');
  void flushTabIntents(tabId);
}

export function observeTabRemoved(tabId: number): void {
  setState(tabId, 'removed');
  states.delete(tabId);
  invalidateTabDocuments(tabId);
  void removeTabIntents(tabId);
}

export function observeTabReplaced(addedTabId: number, removedTabId: number): void {
  const previous = states.get(removedTabId);
  states.delete(removedTabId);
  if (previous)
    states.set(
      addedTabId,
      Object.freeze({ ...previous, tabId: addedTabId, updatedAt: new Date().toISOString() })
    );
  replaceTabDocuments(removedTabId, addedTabId);
  void transferTabIntents(removedTabId, addedTabId);
}

export async function sendTabCommand(
  tabId: number,
  command: ContentCommandWithoutMeta,
  options: Readonly<{
    expectResponse?: boolean;
    queueIfUnavailable?: boolean;
    timeoutMs?: number;
  }> = {}
): Promise<unknown> {
  const result = await sendTabCommandDetailed(tabId, command, options);
  if (result.status === 'delivered') return result.data;
  if (result.status === 'discarded') return undefined;
  throw new Error(result.reasonCode);
}

export async function sendTabCommandDetailed(
  tabId: number,
  command: ContentCommandWithoutMeta,
  options: Readonly<{
    expectResponse?: boolean;
    queueIfUnavailable?: boolean;
    timeoutMs?: number;
  }> = {}
): Promise<TabDeliveryResult> {
  const tab = await getTab(tabId);
  if (!tab) return delivery('missing_tab', 'RTLX-TAB-MISSING');
  if (tab.discarded === true) {
    setState(tabId, 'discarded');
    if (options.queueIfUnavailable === true && command.type !== 'RTLX_ROLLBACK')
      await queueTabIntent(tabId, command);
    return delivery('discarded', 'RTLX-TAB-DISCARDED');
  }
  if (tab.status === 'loading') {
    setState(tabId, 'loading');
    if (options.queueIfUnavailable === true && command.type !== 'RTLX_ROLLBACK')
      await queueTabIntent(tabId, command);
    return delivery('loading', 'RTLX-TAB-LOADING');
  }
  if ((tab as chrome.tabs.Tab & { frozen?: unknown }).frozen === true) {
    setState(tabId, 'frozen');
    return delivery('frozen', 'RTLX-TAB-FROZEN');
  }
  const envelope = createContentCommand(
    command,
    BACKGROUND_RUNTIME_EPOCH,
    targetDocumentInstanceForTab(tabId)
  );
  try {
    const response = await send(
      tabId,
      envelope,
      options.timeoutMs ??
        (options.expectResponse === true ? LIMITS.maxFailureEvidenceContentTimeoutMs : undefined)
    );
    setState(tabId, tab.active ? 'active' : 'background');
    if (options.expectResponse) {
      if (!isContentResponse(response))
        return delivery('invalid_response', 'RTLX-CONTENT-RESPONSE-INVALID');
      return delivery('delivered', 'RTLX-CONTENT-DELIVERED', response.data);
    }
    return delivery('delivered', 'RTLX-CONTENT-DELIVERED', response);
  } catch (error) {
    let deliveryError: unknown = error;
    const rebound = await tryRebindRuntimeEpoch(tabId, Math.min(options.timeoutMs ?? 500, 500));
    if (rebound) {
      const reboundEnvelope = createContentCommand(
        command,
        BACKGROUND_RUNTIME_EPOCH,
        targetDocumentInstanceForTab(tabId)
      );
      try {
        const response = await send(
          tabId,
          reboundEnvelope,
          options.timeoutMs ??
            (options.expectResponse === true
              ? LIMITS.maxFailureEvidenceContentTimeoutMs
              : undefined)
        );
        setState(tabId, tab.active ? 'active' : 'background');
        if (options.expectResponse) {
          if (!isContentResponse(response))
            return delivery('invalid_response', 'RTLX-CONTENT-RESPONSE-INVALID');
          return delivery('delivered', 'RTLX-CONTENT-DELIVERED', response.data);
        }
        return delivery('delivered', 'RTLX-CONTENT-DELIVERED', response);
      } catch (retryError) {
        deliveryError = retryError;
      }
    }
    const timedOut =
      deliveryError instanceof Error && deliveryError.message === 'RTLX-CONTENT-TIMEOUT';
    setState(tabId, 'unreachable');
    if (options.queueIfUnavailable === true && command.type !== 'RTLX_ROLLBACK')
      await queueTabIntent(tabId, command);
    return timedOut
      ? delivery('timeout', 'RTLX-CONTENT-TIMEOUT')
      : delivery('unreachable', 'RTLX-CONTENT-UNREACHABLE');
  }
}

export async function broadcastTabCommand(
  command: ContentCommandWithoutMeta,
  predicate: (tab: chrome.tabs.Tab) => boolean = () => true
): Promise<Readonly<{ attempted: number; delivered: number; skipped: number; failed: number }>> {
  const tabs = await queryTabs({});
  const candidates = tabs
    .filter((tab) => tab.id !== undefined && predicate(tab))
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  let delivered = 0;
  let skipped = 0;
  let failed = 0;
  for (let index = 0; index < candidates.length; index += BROADCAST_CONCURRENCY) {
    const batch = candidates.slice(index, index + BROADCAST_CONCURRENCY);
    const outcomes = await Promise.all(
      batch.map(async (tab) => {
        if (tab.id === undefined || tab.discarded === true) return 'skipped' as const;
        try {
          await sendTabCommand(tab.id, command);
          return 'delivered' as const;
        } catch {
          return 'failed' as const;
        }
      })
    );
    for (const outcome of outcomes) {
      if (outcome === 'delivered') delivered += 1;
      else if (outcome === 'skipped') skipped += 1;
      else failed += 1;
    }
  }
  return Object.freeze({ attempted: candidates.length, delivered, skipped, failed });
}

export function tabLifecycleSnapshot(): readonly TabStateEntry[] {
  return Object.freeze(
    [...states.values()]
      .sort((a, b) => a.tabId - b.tabId)
      .map((entry) => Object.freeze({ ...entry }))
  );
}

export async function pendingTabIntentCount(): Promise<number> {
  return (await readIntents()).length;
}

export function resetTabLifecycleForTests(): void {
  states.clear();
  intentOperation = Promise.resolve();
}

async function queueTabIntent(tabId: number, command: ContentCommandWithoutMeta): Promise<void> {
  return serializeIntents(async () => {
    const now = Date.now();
    const current = (await readIntents()).filter((intent) => Date.parse(intent.expiresAt) > now);
    const deduped = current.filter(
      (intent) => !(intent.tabId === tabId && intent.command.type === command.type)
    );
    deduped.push(
      Object.freeze({
        id: crypto.randomUUID(),
        tabId,
        command: Object.freeze({ ...command }),
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + INTENT_TTL_MS).toISOString(),
      })
    );
    await writeIntents(
      deduped
        .sort(
          (a, b) => a.createdAt.localeCompare(b.createdAt, 'en') || a.id.localeCompare(b.id, 'en')
        )
        .slice(-MAX_INTENTS)
    );
  });
}

async function flushTabIntents(tabId: number): Promise<void> {
  const intents = await serializeIntents(async () => {
    const now = Date.now();
    const current = await readIntents();
    const selected = current.filter(
      (intent) => intent.tabId === tabId && Date.parse(intent.expiresAt) > now
    );
    await writeIntents(
      current.filter((intent) => intent.tabId !== tabId && Date.parse(intent.expiresAt) > now)
    );
    return selected;
  });
  for (const intent of intents) {
    try {
      await sendTabCommand(tabId, intent.command);
    } catch {
      await queueTabIntent(tabId, intent.command);
      break;
    }
  }
}

async function removeTabIntents(tabId: number): Promise<void> {
  return serializeIntents(async () =>
    writeIntents((await readIntents()).filter((intent) => intent.tabId !== tabId))
  );
}

async function transferTabIntents(removedTabId: number, addedTabId: number): Promise<void> {
  return serializeIntents(async () => {
    const next = (await readIntents()).map((intent) =>
      intent.tabId === removedTabId ? Object.freeze({ ...intent, tabId: addedTabId }) : intent
    );
    await writeIntents(next);
  });
}

async function readIntents(): Promise<readonly TabIntent[]> {
  const stored = await storageGet<unknown>(intentArea(), INTENT_KEY);
  if (!Array.isArray(stored)) return Object.freeze([]);
  return Object.freeze(stored.filter(isTabIntent).map((intent) => Object.freeze(intent)));
}

async function writeIntents(intents: readonly TabIntent[]): Promise<void> {
  await storageSet(intentArea(), { [INTENT_KEY]: intents });
}

function intentArea(): 'session' | 'local' {
  return hasStorageArea('session') ? 'session' : 'local';
}

function isTabIntent(value: unknown): value is TabIntent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.tabId === 'number' &&
    Number.isInteger(record.tabId) &&
    record.tabId > 0 &&
    typeof record.createdAt === 'string' &&
    Number.isFinite(Date.parse(record.createdAt)) &&
    typeof record.expiresAt === 'string' &&
    Number.isFinite(Date.parse(record.expiresAt)) &&
    isIntentCommand(record.command)
  );
}

function isIntentCommand(value: unknown): value is ContentCommandWithoutMeta {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.type === 'RTLX_START_PICKER')
    return typeof record.kind === 'string' && Object.keys(record).sort().join('|') === 'kind|type';
  if (record.type === 'RTLX_START_FAILURE_PICKER') return Object.keys(record).join('|') === 'type';
  if (record.type === 'RTLX_QUICK_OVERRIDE')
    return (
      (record.mode === 'content' || record.mode === 'ltr' || record.mode === 'ignore') &&
      Object.keys(record).sort().join('|') === 'mode|type'
    );
  return (
    typeof record.type === 'string' &&
    [
      'RTLX_ROLLBACK',
      'RTLX_PING',
      'RTLX_REPROCESS',
      'RTLX_RUNTIME_SNAPSHOT',
      'RTLX_RECORD_FIXTURE',
    ].includes(record.type) &&
    Object.keys(record).join('|') === 'type'
  );
}

function isContentResponse(value: unknown): value is { ok: true; data: unknown } {
  const inspection = inspectContentCommandResponse(value);
  return inspection.ok && inspection.value.ok === true && 'data' in inspection.value;
}

function delivery(
  status: TabDeliveryStatus,
  reasonCode: string,
  data: unknown = null
): TabDeliveryResult {
  return Object.freeze({ status, reasonCode, data });
}

function setState(tabId: number, state: TabRuntimeState): void {
  states.set(tabId, Object.freeze({ tabId, state, updatedAt: new Date().toISOString() }));
}

function send(tabId: number, payload: unknown, timeoutMs?: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer =
      timeoutMs === undefined
        ? null
        : setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error('RTLX-CONTENT-TIMEOUT'));
          }, timeoutMs);
    const callback = (response: unknown) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    };
    if (targetsMainFrame(payload))
      chrome.tabs.sendMessage(tabId, payload, { frameId: 0 }, callback);
    else chrome.tabs.sendMessage(tabId, payload, callback);
  });
}

function targetsMainFrame(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return false;
  const type = (payload as { type?: unknown }).type;
  return (
    type === 'RTLX_RUNTIME_SNAPSHOT' ||
    type === 'RTLX_RECORD_FIXTURE' ||
    type === 'RTLX_FAILURE_SNAPSHOT'
  );
}

function getTab(tabId: number): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve) =>
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(tab);
    })
  );
}

function queryTabs(query: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve) => chrome.tabs.query(query, resolve));
}

function serializeIntents<T>(work: () => Promise<T>): Promise<T> {
  const result = intentOperation.then(work, work);
  intentOperation = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}
