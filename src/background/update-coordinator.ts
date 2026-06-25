import { storageGet, storageRemove, storageSet } from '../shared/api-adapter';
import { PRODUCT_VERSION } from '../shared/constants';
import { OPERATIONAL_BUDGETS_REGISTRY } from '../shared/registry-data';

const UPDATE_STATE_KEY = 'rtlx:update-state:v1';
const QUIESCE_TIMEOUT_MS = OPERATIONAL_BUDGETS_REGISTRY.updateQuiescenceTimeoutMs;

type UpdatePhase = 'pending' | 'quiescing' | 'ready';

export interface UpdateState {
  schemaVersion: '1.0.0';
  updateId: string;
  previousVersion: string;
  targetVersion: string;
  phase: UpdatePhase;
  requestedAt: string;
  deadlineAt: string;
  expiresAt: string;
  updatedAt: string;
}

export interface UpdateQuiescenceHooks {
  rollbackActiveDocuments: () => Promise<unknown>;
  recoverTransactions: () => Promise<unknown>;
  reload: () => void;
}

let quiescing = false;
let operation: Promise<UpdateState | null> = Promise.resolve(null);

export function isUpdateQuiescing(): boolean {
  return quiescing;
}

export function readUpdateState(): Promise<UpdateState | null> {
  return operation.then(async () =>
    normalize(await storageGet<unknown>('local', UPDATE_STATE_KEY))
  );
}

export function beginUpdateQuiescence(
  targetVersion: string,
  hooks: UpdateQuiescenceHooks
): Promise<UpdateState> {
  const next = operation.then(
    () => performQuiescence(targetVersion, hooks),
    () => performQuiescence(targetVersion, hooks)
  );
  operation = next;
  return next;
}

export async function recoverPendingUpdate(
  currentVersion = PRODUCT_VERSION
): Promise<{ recovered: boolean; previousVersion: string | null }> {
  const state = normalize(await storageGet<unknown>('local', UPDATE_STATE_KEY));
  if (!state) {
    quiescing = false;
    return Object.freeze({ recovered: false, previousVersion: null });
  }
  const now = Date.now();
  if (
    Date.parse(state.expiresAt) <= now ||
    compareVersions(state.targetVersion, currentVersion) < 0
  ) {
    await storageRemove('local', UPDATE_STATE_KEY);
    quiescing = false;
    return Object.freeze({ recovered: false, previousVersion: state.previousVersion });
  }
  if (state.targetVersion !== currentVersion) {
    quiescing = true;
    return Object.freeze({ recovered: false, previousVersion: state.previousVersion });
  }
  await storageRemove('local', UPDATE_STATE_KEY);
  quiescing = false;
  return Object.freeze({ recovered: true, previousVersion: state.previousVersion });
}

export function resetUpdateCoordinatorForTests(): void {
  quiescing = false;
  operation = Promise.resolve(null);
}

async function performQuiescence(
  targetVersion: string,
  hooks: UpdateQuiescenceHooks
): Promise<UpdateState> {
  const existing = normalize(await storageGet<unknown>('local', UPDATE_STATE_KEY));
  if (existing?.targetVersion === targetVersion && existing.phase === 'ready') {
    quiescing = true;
    hooks.reload();
    return existing;
  }
  quiescing = true;
  const requestedAt = new Date().toISOString();
  let state = await persist({
    schemaVersion: '1.0.0',
    updateId: crypto.randomUUID(),
    previousVersion: PRODUCT_VERSION,
    targetVersion: sanitizeVersion(targetVersion),
    phase: 'pending',
    requestedAt,
    deadlineAt: new Date(Date.now() + QUIESCE_TIMEOUT_MS).toISOString(),
    expiresAt: new Date(Date.now() + OPERATIONAL_BUDGETS_REGISTRY.updatePendingTtlMs).toISOString(),
    updatedAt: requestedAt,
  });
  state = await persist({ ...state, phase: 'quiescing', updatedAt: new Date().toISOString() });
  await withTimeout(
    Promise.all([hooks.rollbackActiveDocuments(), hooks.recoverTransactions()]).then(
      () => undefined
    ),
    QUIESCE_TIMEOUT_MS
  );
  state = await persist({ ...state, phase: 'ready', updatedAt: new Date().toISOString() });
  hooks.reload();
  return state;
}

async function persist(state: Omit<UpdateState, never>): Promise<UpdateState> {
  const frozen = Object.freeze({ ...state });
  await storageSet('local', { [UPDATE_STATE_KEY]: frozen });
  return frozen;
}

function normalize(value: unknown): UpdateState | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    record.schemaVersion !== '1.0.0' ||
    typeof record.updateId !== 'string' ||
    typeof record.previousVersion !== 'string' ||
    typeof record.targetVersion !== 'string' ||
    !['pending', 'quiescing', 'ready'].includes(String(record.phase)) ||
    typeof record.requestedAt !== 'string' ||
    !Number.isFinite(Date.parse(record.requestedAt)) ||
    typeof record.deadlineAt !== 'string' ||
    !Number.isFinite(Date.parse(record.deadlineAt)) ||
    typeof record.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(record.expiresAt)) ||
    typeof record.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(record.updatedAt))
  )
    return null;
  return Object.freeze({
    schemaVersion: '1.0.0',
    updateId: record.updateId,
    previousVersion: record.previousVersion,
    targetVersion: record.targetVersion,
    phase: record.phase as UpdatePhase,
    requestedAt: new Date(record.requestedAt).toISOString(),
    deadlineAt: new Date(record.deadlineAt).toISOString(),
    expiresAt: new Date(record.expiresAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  });
}

function compareVersions(left: string, right: string): number {
  const a = left.split(/[+-]/u, 1)[0]!.split('.').map(Number);
  const b = right.split(/[+-]/u, 1)[0]!.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function sanitizeVersion(value: string): string {
  if (!/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/u.test(value))
    throw new Error('Invalid update version');
  return value;
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Update quiescence timed out')), milliseconds);
    void promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    );
  });
}
