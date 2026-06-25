import { createContentCommand } from '../shared/messages';
import { BACKGROUND_RUNTIME_EPOCH, targetDocumentInstanceForTab } from './document-registry';
const SCRIPT_ID = 'rtlx-v15-persistent';
const RUNTIME_REBIND_TIMEOUT_MS = 500;
let requestedGeneration = 0;
let reconciliation: Promise<ContentScriptReconciliation> = Promise.resolve(
  Object.freeze({ status: 'unchanged', generation: 0, origins: Object.freeze([]), fallback: false })
);

export interface ContentInjectionOutcome {
  schemaVersion: '1.0.0';
  mode: 'reprocessed' | 'injected';
  coverage: 'existing-runtime' | 'main-frame-only' | 'multiple-frames';
  coverageCertainty: 'observed-results-only';
  allFramesRequested: boolean;
  mainFrameInjected: boolean;
  successfulFrameIds: readonly number[];
  resultCount: number;
}

export interface ContentScriptReconciliation {
  status: 'registered' | 'updated' | 'unregistered' | 'unchanged' | 'superseded';
  generation: number;
  origins: readonly string[];
  fallback: boolean;
}

export function resetContentScriptReconciliationForTests(): void {
  requestedGeneration = 0;
  reconciliation = Promise.resolve(
    Object.freeze({
      status: 'unchanged',
      generation: 0,
      origins: Object.freeze([]),
      fallback: false,
    })
  );
}

export function synchronizeRegisteredContentScript(): Promise<ContentScriptReconciliation> {
  const generation = ++requestedGeneration;
  const next = reconciliation.then(
    () => reconcile(generation),
    () => reconcile(generation)
  );
  reconciliation = next;
  return next;
}

export async function injectCurrentTab(tabId: number): Promise<ContentInjectionOutcome> {
  const alreadyRunning = await ping(tabId);
  const rebound = alreadyRunning ? false : await tryRebindRuntimeEpoch(tabId);
  if (alreadyRunning || rebound) {
    await sendTabMessage(
      tabId,
      createContentCommand(
        { type: 'RTLX_REPROCESS' },
        BACKGROUND_RUNTIME_EPOCH,
        targetDocumentInstanceForTab(tabId)
      )
    );
    return Object.freeze({
      schemaVersion: '1.0.0',
      mode: 'reprocessed',
      coverage: 'existing-runtime',
      coverageCertainty: 'observed-results-only',
      allFramesRequested: false,
      mainFrameInjected: true,
      successfulFrameIds: Object.freeze([]),
      resultCount: 0,
    });
  }
  const results = await executeContentScript(tabId);
  const frameIds = Object.freeze(
    [...new Set(results.map((result) => result.frameId).filter(Number.isInteger))].sort(
      (a, b) => a - b
    )
  );
  const mainFrameInjected = frameIds.includes(0);
  if (!mainFrameInjected)
    throw new Error('RTLX-INJECTION-MAIN-FRAME-001: main frame injection was not confirmed');
  return Object.freeze({
    schemaVersion: '1.0.0',
    mode: 'injected',
    coverage: frameIds.length > 1 ? 'multiple-frames' : 'main-frame-only',
    coverageCertainty: 'observed-results-only',
    allFramesRequested: true,
    mainFrameInjected,
    successfulFrameIds: frameIds,
    resultCount: results.length,
  });
}

export async function ensureCurrentTabRuntime(tabId: number): Promise<void> {
  if (await ping(tabId)) return;
  if (await tryRebindRuntimeEpoch(tabId)) return;
  const results = await executeContentScript(tabId);
  if (!results.some((result) => result.frameId === 0))
    throw new Error('RTLX-INJECTION-MAIN-FRAME-001: main frame injection was not confirmed');
}

export async function tryRebindRuntimeEpoch(
  tabId: number,
  timeoutMs: number = RUNTIME_REBIND_TIMEOUT_MS
): Promise<boolean> {
  try {
    const response = await sendTabMessage(
      tabId,
      createContentCommand({ type: 'RTLX_REBIND_RUNTIME_EPOCH' }, BACKGROUND_RUNTIME_EPOCH, null),
      timeoutMs
    );
    return (
      typeof response === 'object' && response !== null && 'ok' in response && response.ok === true
    );
  } catch {
    return false;
  }
}

function executeContentScript(tabId: number): Promise<readonly chrome.scripting.InjectionResult[]> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const complete = (
      error: Error | undefined,
      results: chrome.scripting.InjectionResult[] | undefined
    ): void => {
      if (settled) return;
      settled = true;
      if (error) {
        reject(error);
        return;
      }
      resolve(Object.freeze([...(results ?? [])]));
    };
    try {
      const executeScript = chrome.scripting.executeScript as unknown as (
        injection: chrome.scripting.ScriptInjection<[], unknown>,
        callback: (results: chrome.scripting.InjectionResult[]) => void
      ) => Promise<chrome.scripting.InjectionResult[]> | void;
      const invocation = executeScript.call(
        chrome.scripting,
        { target: { tabId, allFrames: true }, files: ['content.js'], world: 'ISOLATED' },
        (results) => {
          const error = chrome.runtime.lastError;
          complete(error ? new Error(error.message) : undefined, results);
        }
      );
      if (invocation && typeof invocation.then === 'function')
        void invocation.then(
          (results) => complete(undefined, results),
          (error: unknown) =>
            complete(error instanceof Error ? error : new Error(String(error)), undefined)
        );
    } catch (error) {
      complete(error instanceof Error ? error : new Error(String(error)), undefined);
    }
  });
}

async function reconcile(generation: number): Promise<ContentScriptReconciliation> {
  const all = await getAllPermissions();
  const origins = Object.freeze(
    (all.origins?.filter((origin) => origin.startsWith('http')) ?? []).sort((a, b) =>
      a.localeCompare(b, 'en')
    )
  );
  const current = (await getRegistered())[0];
  if (generation !== requestedGeneration)
    return Object.freeze({ status: 'superseded', generation, origins, fallback: false });
  if (origins.length === 0) {
    if (current) await unregister();
    return Object.freeze({
      status: current ? 'unregistered' : 'unchanged',
      generation,
      origins,
      fallback: false,
    });
  }
  const preferred = registration(origins, true);
  const fallback = registration(origins, false);
  if (current && equivalent(current, preferred))
    return Object.freeze({ status: 'unchanged', generation, origins, fallback: false });
  if (current) {
    try {
      await update(preferred);
      return Object.freeze({ status: 'updated', generation, origins, fallback: false });
    } catch (preferredError) {
      try {
        await update(fallback);
        return Object.freeze({ status: 'updated', generation, origins, fallback: true });
      } catch {
        const usedFallback = await rollbackSafeReplace(
          current,
          preferred,
          fallback,
          preferredError
        );
        return Object.freeze({ status: 'updated', generation, origins, fallback: usedFallback });
      }
    }
  }
  try {
    await register(preferred);
    return Object.freeze({ status: 'registered', generation, origins, fallback: false });
  } catch {
    await register(fallback);
    return Object.freeze({ status: 'registered', generation, origins, fallback: true });
  }
}

function registration(
  origins: readonly string[],
  matchOriginAsFallback: boolean
): chrome.scripting.RegisteredContentScript {
  return {
    id: SCRIPT_ID,
    matches: [...origins],
    js: ['content.js'],
    allFrames: true,
    runAt: 'document_idle',
    persistAcrossSessions: true,
    matchOriginAsFallback,
    world: 'ISOLATED',
  };
}

async function rollbackSafeReplace(
  current: chrome.scripting.RegisteredContentScript,
  preferred: chrome.scripting.RegisteredContentScript,
  fallback: chrome.scripting.RegisteredContentScript,
  preferredError: unknown
): Promise<boolean> {
  await unregister();
  try {
    await register(preferred);
    return false;
  } catch {
    try {
      await register(fallback);
      return true;
    } catch (error) {
      try {
        await register(current);
      } catch {
        // The original error below remains the primary failure; initialization records it.
      }
      throw error instanceof Error
        ? error
        : preferredError instanceof Error
          ? preferredError
          : new Error('Content script reconciliation failed');
    }
  }
}

async function ping(tabId: number): Promise<boolean> {
  try {
    const response = await sendTabMessage(
      tabId,
      createContentCommand(
        { type: 'RTLX_PING' },
        BACKGROUND_RUNTIME_EPOCH,
        targetDocumentInstanceForTab(tabId)
      )
    );
    return typeof response === 'object' && response !== null && 'ok' in response;
  } catch {
    return false;
  }
}

function sendTabMessage(tabId: number, payload: unknown, timeoutMs?: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer =
      timeoutMs === undefined
        ? null
        : setTimeout(
            () => {
              if (settled) return;
              settled = true;
              reject(new Error('RTLX-RUNTIME-REBIND-TIMEOUT'));
            },
            Math.max(1, timeoutMs)
          );
    chrome.tabs.sendMessage(tabId, payload, (response: unknown) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    });
  });
}

function update(script: chrome.scripting.RegisteredContentScript): Promise<void> {
  const api = chrome.scripting as typeof chrome.scripting & {
    updateContentScripts?: (
      scripts: chrome.scripting.RegisteredContentScript[],
      callback?: () => void
    ) => Promise<void> | void;
  };
  if (typeof api.updateContentScripts !== 'function')
    return Promise.reject(new Error('updateContentScripts not supported'));
  const updateContentScripts = api.updateContentScripts;
  return callbackOrPromise((callback) => updateContentScripts([script], callback));
}

function register(script: chrome.scripting.RegisteredContentScript): Promise<void> {
  return callbackOrPromise((callback) =>
    chrome.scripting.registerContentScripts([script], callback)
  );
}

function unregister(): Promise<void> {
  return callbackOrPromise((callback) =>
    chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] }, callback)
  );
}

function getRegistered(): Promise<chrome.scripting.RegisteredContentScript[]> {
  return new Promise((resolve, reject) =>
    chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] }, (scripts) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(scripts);
    })
  );
}

function getAllPermissions(): Promise<chrome.permissions.Permissions> {
  return new Promise((resolve, reject) =>
    chrome.permissions.getAll((permissions) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(permissions);
    })
  );
}

function equivalent(
  current: chrome.scripting.RegisteredContentScript,
  desired: chrome.scripting.RegisteredContentScript
): boolean {
  return (
    current.id === desired.id &&
    sorted(current.matches ?? []).join('|') === sorted(desired.matches ?? []).join('|') &&
    sorted(current.js ?? []).join('|') === sorted(desired.js ?? []).join('|') &&
    current.allFrames === desired.allFrames &&
    current.runAt === desired.runAt &&
    current.persistAcrossSessions === desired.persistAcrossSessions &&
    current.matchOriginAsFallback === desired.matchOriginAsFallback &&
    current.world === desired.world
  );
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'en'));
}

function callbackOrPromise(invoke: (callback: () => void) => Promise<void> | void): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const complete = (error?: Error): void => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };
    try {
      const result = invoke(() => {
        const error = chrome.runtime.lastError;
        complete(error ? new Error(error.message) : undefined);
      });
      if (result && typeof result.then === 'function')
        void result.then(
          () => complete(),
          (error: unknown) => complete(error instanceof Error ? error : new Error(String(error)))
        );
    } catch (error) {
      complete(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
