import { canonicalize, sha256Hex, toCanonicalJson } from '../shared/canonical-json';
import { storageGet, storageSet } from '../shared/api-adapter';
import { OPERATIONAL_BUDGETS_REGISTRY } from '../shared/registry-data';
import { runStorageTransaction } from './storage-transaction';

const RATE_KEY = 'rtlx:sync-rate:v1';
const CONFLICT_KEY = 'rtlx:sync-conflicts:v1';
const OBSERVED_KEY = 'rtlx:sync-observed:v1';
const MINUTE_LIMIT = OPERATIONAL_BUDGETS_REGISTRY.syncMinuteWriteLimit;
const HOUR_LIMIT = OPERATIONAL_BUDGETS_REGISTRY.syncHourWriteLimit;
const MAX_CONFLICTS = OPERATIONAL_BUDGETS_REGISTRY.syncConflictRecordsMax;

interface SyncRateState {
  schemaVersion: '1.0.0';
  minuteWindowStart: number;
  minuteWrites: number;
  hourWindowStart: number;
  hourWrites: number;
}

export interface SyncObservedChange {
  keyHash: string;
  changeHash: string;
  observedAt: string;
}

export interface SyncConflictRecord {
  keyHash: string;
  expectedHash: string;
  observedHash: string;
  kind: string;
  observedAt: string;
}

let queue: Promise<void> = Promise.resolve();

export class SyncRateLimitError extends Error {
  public constructor() {
    super('Sync write budget exceeded');
    this.name = 'SyncRateLimitError';
  }
}

export class SyncConflictError extends Error {
  public constructor() {
    super('Sync read-back mismatch');
    this.name = 'SyncConflictError';
  }
}

export function persistSyncCoordinated(
  kind: string,
  setItems: Readonly<Record<string, unknown>>
): Promise<void> {
  const task = queue.then(
    () => persist(kind, setItems),
    () => persist(kind, setItems)
  );
  queue = task;
  return task;
}

export async function readSyncConflicts(): Promise<readonly SyncConflictRecord[]> {
  const stored = await storageGet<unknown>('local', CONFLICT_KEY);
  if (!Array.isArray(stored)) return Object.freeze([]);
  return Object.freeze(stored.filter(isConflict).map((record) => Object.freeze(record)));
}

export async function readObservedSyncChanges(): Promise<readonly SyncObservedChange[]> {
  await queue.catch(() => undefined);
  return readObservedSyncChangesRaw();
}

async function readObservedSyncChangesRaw(): Promise<readonly SyncObservedChange[]> {
  const stored = await storageGet<unknown>('local', OBSERVED_KEY);
  if (!Array.isArray(stored)) return Object.freeze([]);
  return Object.freeze(stored.filter(isObservedChange).map((record) => Object.freeze(record)));
}

export function observeSyncStorageChanges(
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
): void {
  if (areaName !== 'sync') return;
  const entries = Object.entries(changes).sort(([a], [b]) => a.localeCompare(b, 'en'));
  if (entries.length === 0) return;
  const task = queue.then(
    () => appendObservedChanges(entries),
    () => appendObservedChanges(entries)
  );
  queue = task;
}

export function resetSyncCoordinatorForTests(): void {
  queue = Promise.resolve();
}

async function persist(kind: string, setItems: Readonly<Record<string, unknown>>): Promise<void> {
  const entries = Object.entries(setItems).sort(([a], [b]) => a.localeCompare(b, 'en'));
  if (entries.length === 0) return;
  for (const [, value] of entries) toCanonicalJson(value);
  await consumeBudget();
  await runStorageTransaction({ kind, area: 'sync', setItems });
  const conflicts: SyncConflictRecord[] = [];
  for (const [key, expected] of entries) {
    const observed = await storageGet<unknown>('sync', key);
    const expectedHash = await hashSyncValue(expected);
    const observedHash = await hashSyncValue(observed);
    if (expectedHash !== observedHash)
      conflicts.push(
        Object.freeze({
          keyHash: await sha256Hex(key),
          expectedHash,
          observedHash,
          kind: sanitize(kind),
          observedAt: new Date().toISOString(),
        })
      );
  }
  if (conflicts.length > 0) {
    await appendConflicts(conflicts);
    throw new SyncConflictError();
  }
}

async function consumeBudget(now = Date.now()): Promise<void> {
  const stored = normalizeRate(await storageGet<unknown>('local', RATE_KEY), now);
  const minuteReset = now - stored.minuteWindowStart >= 60_000;
  const hourReset = now - stored.hourWindowStart >= 3_600_000;
  const next: SyncRateState = Object.freeze({
    schemaVersion: '1.0.0',
    minuteWindowStart: minuteReset ? now : stored.minuteWindowStart,
    minuteWrites: (minuteReset ? 0 : stored.minuteWrites) + 1,
    hourWindowStart: hourReset ? now : stored.hourWindowStart,
    hourWrites: (hourReset ? 0 : stored.hourWrites) + 1,
  });
  if (next.minuteWrites > MINUTE_LIMIT || next.hourWrites > HOUR_LIMIT)
    throw new SyncRateLimitError();
  await storageSet('local', { [RATE_KEY]: next });
}

async function appendObservedChanges(
  entries: readonly [string, chrome.storage.StorageChange][]
): Promise<void> {
  const now = new Date().toISOString();
  const records = await Promise.all(
    entries.map(async ([key, change]) =>
      Object.freeze({
        keyHash: await sha256Hex(key),
        changeHash: await hashSyncValue(change.newValue),
        observedAt: now,
      })
    )
  );
  const current = await readObservedSyncChangesRaw();
  const merged = [...current, ...records]
    .sort(
      (a, b) =>
        a.observedAt.localeCompare(b.observedAt, 'en') || a.keyHash.localeCompare(b.keyHash, 'en')
    )
    .slice(-OPERATIONAL_BUDGETS_REGISTRY.syncObservedChangesMax);
  await storageSet('local', { [OBSERVED_KEY]: merged });
}

async function appendConflicts(records: readonly SyncConflictRecord[]): Promise<void> {
  const current = await readSyncConflicts();
  const merged = [...current, ...records]
    .sort(
      (a, b) =>
        a.observedAt.localeCompare(b.observedAt, 'en') || a.keyHash.localeCompare(b.keyHash, 'en')
    )
    .slice(-MAX_CONFLICTS);
  await storageSet('local', { [CONFLICT_KEY]: merged });
}

function normalizeRate(value: unknown, now: number): SyncRateState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fresh(now);
  const record = value as Record<string, unknown>;
  if (
    record.schemaVersion !== '1.0.0' ||
    !Number.isFinite(record.minuteWindowStart) ||
    !Number.isInteger(record.minuteWrites) ||
    !Number.isFinite(record.hourWindowStart) ||
    !Number.isInteger(record.hourWrites)
  )
    return fresh(now);
  return Object.freeze({
    schemaVersion: '1.0.0',
    minuteWindowStart: Number(record.minuteWindowStart),
    minuteWrites: Math.max(0, Number(record.minuteWrites)),
    hourWindowStart: Number(record.hourWindowStart),
    hourWrites: Math.max(0, Number(record.hourWrites)),
  });
}

function fresh(now: number): SyncRateState {
  return Object.freeze({
    schemaVersion: '1.0.0',
    minuteWindowStart: now,
    minuteWrites: 0,
    hourWindowStart: now,
    hourWrites: 0,
  });
}

function isObservedChange(value: unknown): value is SyncObservedChange {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.keyHash === 'string' &&
    /^[a-f0-9]{64}$/u.test(record.keyHash) &&
    typeof record.changeHash === 'string' &&
    /^[a-f0-9]{64}$/u.test(record.changeHash) &&
    typeof record.observedAt === 'string' &&
    Number.isFinite(Date.parse(record.observedAt))
  );
}

function isConflict(value: unknown): value is SyncConflictRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.keyHash === 'string' &&
    /^[a-f0-9]{64}$/u.test(record.keyHash) &&
    typeof record.expectedHash === 'string' &&
    /^[a-f0-9]{64}$/u.test(record.expectedHash) &&
    typeof record.observedHash === 'string' &&
    /^[a-f0-9]{64}$/u.test(record.observedHash) &&
    typeof record.kind === 'string' &&
    typeof record.observedAt === 'string' &&
    Number.isFinite(Date.parse(record.observedAt))
  );
}

async function hashSyncValue(value: unknown): Promise<string> {
  return sha256Hex(
    value === undefined ? 'rtlx:missing-sync-value' : canonicalize(toCanonicalJson(value))
  );
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9:_-]/gu, '_').slice(0, 64);
}
