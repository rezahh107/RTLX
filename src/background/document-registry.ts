import type { RequestMessage } from '../shared/messages';

export const BACKGROUND_RUNTIME_EPOCH = crypto.randomUUID();

export interface DocumentIdentity {
  tabId: number;
  frameId: number;
  browserDocumentId: string | null;
  contentDocumentInstanceId: string;
  documentGeneration: number;
  lifecycle: string;
  registeredAt: string;
  lastSeenAt: string;
}

export type DocumentValidationResult =
  | Readonly<{ ok: true; identity: DocumentIdentity }>
  | Readonly<{ ok: false; code: string; reason: string }>;

const documents = new Map<string, DocumentIdentity>();
const MAX_DOCUMENTS = 512;

export function registerContentDocument(
  message: RequestMessage,
  sender: chrome.runtime.MessageSender
): DocumentValidationResult {
  if (!message.meta)
    return Object.freeze({
      ok: false,
      code: 'RTLX-DOCUMENT-001',
      reason: 'Missing message metadata',
    });
  const tabId = sender.tab?.id;
  if (tabId === undefined)
    return Object.freeze({ ok: false, code: 'RTLX-DOCUMENT-002', reason: 'Missing sender tab' });
  const lifecycle = senderLifecycle(sender);
  if (!isAllowedLifecycle(lifecycle))
    return Object.freeze({
      ok: false,
      code: 'RTLX-DOCUMENT-003',
      reason: `Document lifecycle rejected: ${lifecycle}`,
    });
  if (message.meta.runtimeEpoch !== null && message.meta.runtimeEpoch !== BACKGROUND_RUNTIME_EPOCH)
    return Object.freeze({ ok: false, code: 'RTLX-DOCUMENT-004', reason: 'Stale runtime epoch' });
  const frameId = sender.frameId ?? 0;
  const now = new Date().toISOString();
  const identity = Object.freeze({
    tabId,
    frameId,
    browserDocumentId: senderDocumentId(sender),
    contentDocumentInstanceId: message.meta.documentInstanceId,
    documentGeneration: message.meta.documentGeneration,
    lifecycle,
    registeredAt: now,
    lastSeenAt: now,
  });
  documents.set(key(tabId, frameId), identity);
  pruneDocuments();
  return Object.freeze({ ok: true, identity });
}

export function validateContentDocument(
  message: RequestMessage,
  sender: chrome.runtime.MessageSender
): DocumentValidationResult {
  if (!message.meta)
    return Object.freeze({
      ok: false,
      code: 'RTLX-DOCUMENT-001',
      reason: 'Missing message metadata',
    });
  if (message.meta.runtimeEpoch !== BACKGROUND_RUNTIME_EPOCH)
    return Object.freeze({ ok: false, code: 'RTLX-DOCUMENT-004', reason: 'Stale runtime epoch' });
  const tabId = sender.tab?.id;
  if (tabId === undefined)
    return Object.freeze({ ok: false, code: 'RTLX-DOCUMENT-002', reason: 'Missing sender tab' });
  const lifecycle = senderLifecycle(sender);
  if (!isAllowedLifecycle(lifecycle))
    return Object.freeze({
      ok: false,
      code: 'RTLX-DOCUMENT-003',
      reason: `Document lifecycle rejected: ${lifecycle}`,
    });
  const frameId = sender.frameId ?? 0;
  const existing = documents.get(key(tabId, frameId));
  if (!existing)
    return Object.freeze({
      ok: false,
      code: 'RTLX-DOCUMENT-005',
      reason: 'Document handshake missing',
    });
  const browserDocumentId = senderDocumentId(sender);
  if (
    existing.contentDocumentInstanceId !== message.meta.documentInstanceId ||
    existing.documentGeneration !== message.meta.documentGeneration ||
    (existing.browserDocumentId !== null &&
      browserDocumentId !== null &&
      existing.browserDocumentId !== browserDocumentId)
  )
    return Object.freeze({
      ok: false,
      code: 'RTLX-DOCUMENT-006',
      reason: 'Document identity mismatch',
    });
  const updated = Object.freeze({ ...existing, lifecycle, lastSeenAt: new Date().toISOString() });
  documents.set(key(tabId, frameId), updated);
  return Object.freeze({ ok: true, identity: updated });
}

export function targetDocumentInstanceForTab(tabId: number, frameId = 0): string | null {
  return documents.get(key(tabId, frameId))?.contentDocumentInstanceId ?? null;
}

export function isCurrentDocumentIdentity(
  input: Readonly<{
    tabId: number;
    frameId: number;
    browserDocumentId: string | null;
    contentDocumentInstanceId: string;
    documentGeneration: number;
  }>
): boolean {
  const existing = documents.get(key(input.tabId, input.frameId));
  if (!existing) return false;
  if (existing.browserDocumentId !== null && input.browserDocumentId !== null)
    return (
      existing.browserDocumentId === input.browserDocumentId &&
      existing.documentGeneration === input.documentGeneration
    );
  return (
    existing.contentDocumentInstanceId === input.contentDocumentInstanceId &&
    existing.documentGeneration === input.documentGeneration
  );
}

export function currentDocumentIdentityForTab(tabId: number, frameId = 0): DocumentIdentity | null {
  const identity = documents.get(key(tabId, frameId));
  return identity ? Object.freeze({ ...identity }) : null;
}

export function invalidateTabDocuments(tabId: number): void {
  for (const [documentKey, identity] of documents)
    if (identity.tabId === tabId) documents.delete(documentKey);
}

export function replaceTabDocuments(removedTabId: number, addedTabId: number): void {
  const moved = [...documents.values()].filter((entry) => entry.tabId === removedTabId);
  invalidateTabDocuments(removedTabId);
  for (const identity of moved)
    documents.set(
      key(addedTabId, identity.frameId),
      Object.freeze({ ...identity, tabId: addedTabId, lastSeenAt: new Date().toISOString() })
    );
}

export function documentRegistrySnapshot(): readonly DocumentIdentity[] {
  return Object.freeze(
    [...documents.values()]
      .sort((a, b) => a.tabId - b.tabId || a.frameId - b.frameId)
      .map((entry) => Object.freeze({ ...entry }))
  );
}

export function resetDocumentRegistryForTests(): void {
  documents.clear();
}

function senderDocumentId(sender: chrome.runtime.MessageSender): string | null {
  const value = (sender as chrome.runtime.MessageSender & { documentId?: unknown }).documentId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function senderLifecycle(sender: chrome.runtime.MessageSender): string {
  const value = (sender as chrome.runtime.MessageSender & { documentLifecycle?: unknown })
    .documentLifecycle;
  return typeof value === 'string' ? value : 'active';
}

function isAllowedLifecycle(value: string): boolean {
  return value !== 'prerender' && value !== 'pending_deletion';
}

function key(tabId: number, frameId: number): string {
  return `${tabId}:${frameId}`;
}

function pruneDocuments(): void {
  if (documents.size <= MAX_DOCUMENTS) return;
  const oldest = [...documents.entries()].sort(([, a], [, b]) => {
    const time = a.lastSeenAt.localeCompare(b.lastSeenAt, 'en');
    return time === 0 ? a.tabId - b.tabId || a.frameId - b.frameId : time;
  });
  for (const [documentKey] of oldest.slice(0, documents.size - MAX_DOCUMENTS))
    documents.delete(documentKey);
}
