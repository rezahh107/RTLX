import { OPERATIONAL_BUDGETS_REGISTRY } from '../shared/registry-data';
export interface ExtensionRuntimeContext {
  contextType: string;
  contextId: string | null;
  documentId: string | null;
  tabId: number | null;
  frameId: number | null;
  incognito: boolean;
}

export interface RuntimeContextCensus {
  status: 'observed' | 'unsupported' | 'failed';
  contexts: readonly ExtensionRuntimeContext[];
  observedAt: string;
}

const MAX_CONTEXTS = OPERATIONAL_BUDGETS_REGISTRY.runtimeContextMax;
let latest: RuntimeContextCensus = Object.freeze({
  status: 'unsupported',
  contexts: Object.freeze([]),
  observedAt: new Date(0).toISOString(),
});

export async function reconcileRuntimeContexts(): Promise<RuntimeContextCensus> {
  const runtime = chrome.runtime as typeof chrome.runtime & {
    getContexts?: (
      filter: Record<string, never>,
      callback?: (contexts: unknown[]) => void
    ) => Promise<unknown[]> | void;
  };
  if (typeof runtime.getContexts !== 'function') return setLatest('unsupported', []);
  try {
    const contexts = await callbackOrPromise(runtime.getContexts.bind(runtime));
    return setLatest(
      'observed',
      contexts
        .map(normalizeContext)
        .filter((value): value is ExtensionRuntimeContext => value !== null)
        .sort(compareContexts)
        .slice(0, MAX_CONTEXTS)
    );
  } catch {
    return setLatest('failed', []);
  }
}

export function runtimeContextCensusSnapshot(): RuntimeContextCensus {
  return latest;
}

export function resetRuntimeContextCensusForTests(): void {
  latest = Object.freeze({
    status: 'unsupported',
    contexts: Object.freeze([]),
    observedAt: new Date(0).toISOString(),
  });
}

function callbackOrPromise(
  invoke: (
    filter: Record<string, never>,
    callback?: (contexts: unknown[]) => void
  ) => Promise<unknown[]> | void
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const complete = (value?: unknown[], error?: Error): void => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve(value ?? []);
    };
    try {
      const result = invoke({}, (contexts) => {
        const error = chrome.runtime.lastError;
        complete(contexts, error ? new Error(error.message) : undefined);
      });
      if (result && typeof result.then === 'function')
        void result.then(
          (contexts) => complete(contexts),
          (error: unknown) =>
            complete(undefined, error instanceof Error ? error : new Error(String(error)))
        );
    } catch (error) {
      complete(undefined, error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function normalizeContext(value: unknown): ExtensionRuntimeContext | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.contextType !== 'string') return null;
  return Object.freeze({
    contextType: record.contextType.slice(0, 64),
    contextId: stringOrNull(record.contextId),
    documentId: stringOrNull(record.documentId),
    tabId: integerOrNull(record.tabId),
    frameId: integerOrNull(record.frameId),
    incognito: record.incognito === true,
  });
}

function setLatest(
  status: RuntimeContextCensus['status'],
  contexts: readonly ExtensionRuntimeContext[]
): RuntimeContextCensus {
  latest = Object.freeze({
    status,
    contexts: Object.freeze(contexts.map((context) => Object.freeze({ ...context }))),
    observedAt: new Date().toISOString(),
  });
  return latest;
}

function compareContexts(a: ExtensionRuntimeContext, b: ExtensionRuntimeContext): number {
  return (
    a.contextType.localeCompare(b.contextType, 'en') ||
    (a.tabId ?? -1) - (b.tabId ?? -1) ||
    (a.frameId ?? -1) - (b.frameId ?? -1) ||
    (a.documentId ?? '').localeCompare(b.documentId ?? '', 'en')
  );
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, 256) : null;
}

function integerOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}
