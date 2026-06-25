import { beforeEach, describe, expect, it } from 'vitest';
import { ensureCurrentTabRuntime, injectCurrentTab } from '../../src/background/permission-manager';

let pingResponse: unknown;
let pingError: string | null;
let reprocessCalls: number;
let rebindResponse: unknown;
let rebindError: string | null;
let executeCalls: number;
let executeMode:
  | { kind: 'callback'; results: chrome.scripting.InjectionResult[]; error?: string }
  | { kind: 'promise'; results: chrome.scripting.InjectionResult[] }
  | { kind: 'throw'; error: string };

beforeEach(() => {
  pingResponse = undefined;
  pingError = 'no receiver';
  reprocessCalls = 0;
  rebindResponse = undefined;
  rebindError = 'no receiver';
  executeCalls = 0;
  executeMode = {
    kind: 'callback',
    results: [{ frameId: 0, documentId: 'doc-0', result: undefined }],
  };

  Object.assign(globalThis, {
    chrome: {
      runtime: { lastError: null },
      tabs: {
        sendMessage: (_tabId: number, payload: unknown, callback: (value: unknown) => void) => {
          const type =
            typeof payload === 'object' && payload !== null && 'type' in payload
              ? String(payload.type)
              : '';
          if (type === 'RTLX_PING') {
            if (pingError)
              Object.assign(globalThis.chrome.runtime, { lastError: { message: pingError } });
            callback(pingResponse);
            Object.assign(globalThis.chrome.runtime, { lastError: undefined });
            return;
          }
          if (type === 'RTLX_REBIND_RUNTIME_EPOCH') {
            if (rebindError)
              Object.assign(globalThis.chrome.runtime, { lastError: { message: rebindError } });
            callback(rebindResponse);
            Object.assign(globalThis.chrome.runtime, { lastError: undefined });
            return;
          }
          if (type === 'RTLX_REPROCESS') reprocessCalls += 1;
          callback({ ok: true });
        },
      },
      scripting: {
        executeScript: (
          _injection: chrome.scripting.ScriptInjection<[], unknown>,
          callback: (results: chrome.scripting.InjectionResult[]) => void
        ) => {
          executeCalls += 1;
          if (executeMode.kind === 'throw') throw new Error(executeMode.error);
          if (executeMode.kind === 'promise') return Promise.resolve(executeMode.results);
          if (executeMode.error)
            Object.assign(globalThis.chrome.runtime, { lastError: { message: executeMode.error } });
          callback(executeMode.results);
          Object.assign(globalThis.chrome.runtime, { lastError: undefined });
          return undefined;
        },
      },
    },
  });
});

describe('v15.9.1 cross-browser injection normalization', () => {
  it('returns explicit existing-runtime evidence when reprocessing', async () => {
    pingError = null;
    pingResponse = { ok: true };
    await expect(injectCurrentTab(5)).resolves.toEqual({
      schemaVersion: '1.0.0',
      mode: 'reprocessed',
      coverage: 'existing-runtime',
      coverageCertainty: 'observed-results-only',
      allFramesRequested: false,
      mainFrameInjected: true,
      successfulFrameIds: [],
      resultCount: 0,
    });
    expect(reprocessCalls).toBe(1);
  });

  it('rebinds a live stale-epoch runtime without injecting a duplicate content script', async () => {
    rebindError = null;
    rebindResponse = {
      ok: true,
      data: { documentInstanceId: '123e4567-e89b-42d3-a456-426614174000' },
    };
    await expect(injectCurrentTab(5)).resolves.toMatchObject({
      mode: 'reprocessed',
      coverage: 'existing-runtime',
    });
    expect(reprocessCalls).toBe(1);
    expect(executeCalls).toBe(0);
  });

  it('ensures a stale-epoch runtime for reporting without reprocessing or reinjecting it', async () => {
    rebindError = null;
    rebindResponse = {
      ok: true,
      data: { documentInstanceId: '123e4567-e89b-42d3-a456-426614174000' },
    };
    await expect(ensureCurrentTabRuntime(5)).resolves.toBeUndefined();
    expect(reprocessCalls).toBe(0);
    expect(executeCalls).toBe(0);
  });

  it('accepts Firefox-style partial success while reporting only observed main-frame coverage', async () => {
    executeMode = {
      kind: 'callback',
      results: [{ frameId: 0, documentId: 'doc-0', result: undefined }],
    };
    await expect(injectCurrentTab(6)).resolves.toEqual({
      schemaVersion: '1.0.0',
      mode: 'injected',
      coverage: 'main-frame-only',
      coverageCertainty: 'observed-results-only',
      allFramesRequested: true,
      mainFrameInjected: true,
      successfulFrameIds: [0],
      resultCount: 1,
    });
  });

  it('normalizes multi-frame Promise results deterministically', async () => {
    executeMode = {
      kind: 'promise',
      results: [
        { frameId: 4, documentId: 'doc-4', result: undefined },
        { frameId: 0, documentId: 'doc-0', result: undefined },
        { frameId: 4, documentId: 'doc-4', result: undefined },
      ],
    };
    await expect(injectCurrentTab(7)).resolves.toMatchObject({
      coverage: 'multiple-frames',
      mainFrameInjected: true,
      successfulFrameIds: [0, 4],
      resultCount: 3,
    });
  });

  it('preserves Chrome-style total failure from runtime.lastError', async () => {
    executeMode = {
      kind: 'callback',
      results: [],
      error: 'Cannot access contents of the page',
    };
    await expect(injectCurrentTab(8)).rejects.toThrow('Cannot access contents of the page');
  });

  it('rejects a result set that does not confirm main-frame injection', async () => {
    executeMode = {
      kind: 'callback',
      results: [{ frameId: 9, documentId: 'doc-9', result: undefined }],
    };
    await expect(injectCurrentTab(9)).rejects.toThrow('RTLX-INJECTION-MAIN-FRAME-001');
  });
});
