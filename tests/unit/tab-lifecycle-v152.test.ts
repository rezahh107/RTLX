import { beforeEach, describe, expect, it } from 'vitest';
import {
  broadcastTabCommand,
  observeTabUpdated,
  pendingTabIntentCount,
  resetTabLifecycleForTests,
  sendTabCommand,
  sendTabCommandDetailed,
  tabLifecycleSnapshot,
} from '../../src/background/tab-lifecycle-registry';
import { resetDocumentRegistryForTests } from '../../src/background/document-registry';

const session: Record<string, unknown> = {};
let tabs: chrome.tabs.Tab[];
let sent: Array<{ tabId: number; payload: unknown; options?: chrome.tabs.MessageSendOptions }>;
let concurrent: number;
let maxConcurrent: number;

function tab(partial: Partial<chrome.tabs.Tab> & Pick<chrome.tabs.Tab, 'id'>): chrome.tabs.Tab {
  return {
    id: partial.id,
    index: partial.index ?? 0,
    pinned: partial.pinned ?? false,
    highlighted: partial.highlighted ?? false,
    active: partial.active ?? false,
    incognito: partial.incognito ?? false,
    selected: partial.selected ?? false,
    discarded: partial.discarded ?? false,
    autoDiscardable: partial.autoDiscardable ?? true,
    windowId: partial.windowId ?? 1,
    frozen: partial.frozen ?? false,
    ...partial,
  } as chrome.tabs.Tab;
}

beforeEach(() => {
  for (const key of Object.keys(session)) delete session[key];
  tabs = [];
  sent = [];
  concurrent = 0;
  maxConcurrent = 0;
  resetTabLifecycleForTests();
  resetDocumentRegistryForTests();
  const area = (store: Record<string, unknown>) => ({
    get: (key: string | null, callback: (items: Record<string, unknown>) => void) =>
      callback(key === null ? { ...store } : key in store ? { [key]: store[key] } : {}),
    set: (items: Record<string, unknown>, callback: () => void) => {
      Object.assign(store, items);
      callback();
    },
    remove: (keys: string | string[], callback: () => void) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete store[key];
      callback();
    },
  });
  Object.assign(globalThis, {
    chrome: {
      runtime: { lastError: null },
      storage: { session: area(session), local: area({}), sync: area({}) },
      tabs: {
        get: (tabId: number, callback: (tab: chrome.tabs.Tab) => void) =>
          callback(tabs.find((tab) => tab.id === tabId) ?? ({ id: tabId } as chrome.tabs.Tab)),
        query: (_query: chrome.tabs.QueryInfo, callback: (value: chrome.tabs.Tab[]) => void) =>
          callback(tabs.map((tab) => ({ ...tab }))),
        sendMessage: (
          tabId: number,
          payload: unknown,
          optionsOrCallback: chrome.tabs.MessageSendOptions | ((response: unknown) => void),
          maybeCallback?: (response: unknown) => void
        ) => {
          const options = typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback;
          const callback =
            typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback!;
          sent.push(options === undefined ? { tabId, payload } : { tabId, payload, options });
          concurrent += 1;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          setTimeout(() => {
            concurrent -= 1;
            callback({ ok: true, data: { delivered: true } });
          }, 1);
        },
      },
    },
  });
});

describe('RH-007/RH-009 discarded-tab recovery and bounded broadcast', () => {
  it('queues one bounded intent for a discarded tab and flushes after reload', async () => {
    tabs = [tab({ id: 7, discarded: true, active: false })];
    await sendTabCommand(7, { type: 'RTLX_REPROCESS' }, { queueIfUnavailable: true });
    await sendTabCommand(7, { type: 'RTLX_REPROCESS' }, { queueIfUnavailable: true });
    expect(sent).toHaveLength(0);
    expect(await pendingTabIntentCount()).toBe(1);
    expect(tabLifecycleSnapshot()).toMatchObject([{ tabId: 7, state: 'discarded' }]);

    tabs = [tab({ id: 7, discarded: false, active: true, status: 'complete' })];
    observeTabUpdated(7, { status: 'complete', discarded: false }, tabs[0]!);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sent).toHaveLength(1);
    expect(await pendingTabIntentCount()).toBe(0);
    expect(tabLifecycleSnapshot()).toMatchObject([{ tabId: 7, state: 'active' }]);
  });

  it('limits a multi-tab broadcast to eight concurrent sends and skips discarded tabs', async () => {
    tabs = Array.from({ length: 21 }, (_, index) =>
      tab({ id: index + 1, active: index === 0, discarded: index === 20 })
    );
    const result = await broadcastTabCommand({ type: 'RTLX_REPROCESS' });
    expect(result).toEqual({ attempted: 21, delivered: 20, skipped: 1, failed: 0 });
    expect(maxConcurrent).toBeLessThanOrEqual(8);
  });
});

describe('v15.5.4 FEC delivery reason hardening', () => {
  it('returns explicit loading and frozen delivery statuses without messaging the tab', async () => {
    tabs = [tab({ id: 9, active: true, status: 'loading' })];
    await expect(sendTabCommandDetailed(9, { type: 'RTLX_PING' })).resolves.toMatchObject({
      status: 'loading',
      reasonCode: 'RTLX-TAB-LOADING',
    });
    tabs = [tab({ id: 10, active: true, frozen: true })];
    await expect(sendTabCommandDetailed(10, { type: 'RTLX_PING' })).resolves.toMatchObject({
      status: 'frozen',
      reasonCode: 'RTLX-TAB-FROZEN',
    });
    expect(sent).toHaveLength(0);
  });

  it('bounds response-bearing content calls with a deterministic timeout', async () => {
    tabs = [tab({ id: 11, active: true, status: 'complete' })];
    globalThis.chrome.tabs.sendMessage = ((tabId: number, payload: unknown) => {
      sent.push({ tabId, payload });
    }) as typeof chrome.tabs.sendMessage;
    await expect(
      sendTabCommandDetailed(
        11,
        { type: 'RTLX_FAILURE_SNAPSHOT', captureId: '11111111-1111-4111-8111-111111111111' },
        { expectResponse: true, timeoutMs: 5 }
      )
    ).resolves.toMatchObject({ status: 'timeout', reasonCode: 'RTLX-CONTENT-TIMEOUT' });
  });
});

describe('v15.9.11 main-frame response targeting', () => {
  it('targets snapshot and fixture response commands to frame zero only', async () => {
    tabs = [tab({ id: 12, active: true, status: 'complete' })];
    await sendTabCommandDetailed(12, { type: 'RTLX_RUNTIME_SNAPSHOT' }, { expectResponse: true });
    await sendTabCommandDetailed(12, { type: 'RTLX_RECORD_FIXTURE' }, { expectResponse: true });
    await sendTabCommandDetailed(
      12,
      { type: 'RTLX_FAILURE_SNAPSHOT', captureId: '11111111-1111-4111-8111-111111111111' },
      { expectResponse: true }
    );
    expect(sent.map((entry) => entry.options)).toEqual([
      { frameId: 0 },
      { frameId: 0 },
      { frameId: 0 },
    ]);
  });
  it('preserves broadcast delivery for commands that do not expect a frame-specific response', async () => {
    tabs = [tab({ id: 13, active: true, status: 'complete' })];
    await sendTabCommand(13, { type: 'RTLX_REPROCESS' });
    expect(sent[0]?.options).toBeUndefined();
  });
});

describe('v15.9.11 content response consumer contract parity', () => {
  it('rejects ambiguous and extra-key content responses at the background boundary', async () => {
    tabs = [tab({ id: 14, active: true, status: 'complete' })];
    const malformed = [{ ok: false }, { ok: true, data: null, extra: true }];
    for (const response of malformed) {
      globalThis.chrome.tabs.sendMessage = ((
        tabId: number,
        payload: unknown,
        optionsOrCallback: chrome.tabs.MessageSendOptions | ((response: unknown) => void),
        maybeCallback?: (response: unknown) => void
      ) => {
        const options = typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback;
        const callback =
          typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback!;
        sent.push(options === undefined ? { tabId, payload } : { tabId, payload, options });
        callback(response);
      }) as typeof chrome.tabs.sendMessage;
      await expect(
        sendTabCommandDetailed(14, { type: 'RTLX_RUNTIME_SNAPSHOT' }, { expectResponse: true })
      ).resolves.toMatchObject({
        status: 'invalid_response',
        reasonCode: 'RTLX-CONTENT-RESPONSE-INVALID',
      });
    }
  });
});
