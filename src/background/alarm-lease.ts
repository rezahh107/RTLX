import { storageGet } from '../shared/api-adapter';
import { runStorageTransaction } from './storage-transaction';

const PREFIX = 'rtlx:alarm-lease:v1:';
const LEASE_MS = 2 * 60_000;
const TASK_TIMEOUT_MS = 30_000;

export interface AlarmLeaseState {
  schemaVersion: '1.0.0';
  alarmName: string;
  runId: string;
  leaseUntil: string | null;
  lastAttemptAt: string;
  lastSuccessAt: string | null;
  failureCount: number;
  lastError: string | null;
}

export type AlarmLeaseResult<T> =
  | Readonly<{ status: 'executed'; value: T; state: AlarmLeaseState }>
  | Readonly<{ status: 'lease_active'; state: AlarmLeaseState }>;

let operation: Promise<void> = Promise.resolve();
const inFlight = new Map<string, Promise<AlarmLeaseResult<unknown>>>();

export function runWithAlarmLease<T>(
  alarmName: string,
  task: () => Promise<T>
): Promise<AlarmLeaseResult<T>> {
  const existing = inFlight.get(alarmName);
  if (existing) return existing as Promise<AlarmLeaseResult<T>>;
  const result = serialized(async () => {
    const current = await readAlarmLease(alarmName);
    if (current?.leaseUntil && Date.parse(current.leaseUntil) > Date.now())
      return Object.freeze({ status: 'lease_active' as const, state: current });
    const now = new Date();
    const prepared: AlarmLeaseState = Object.freeze({
      schemaVersion: '1.0.0',
      alarmName,
      runId: crypto.randomUUID(),
      leaseUntil: new Date(now.getTime() + LEASE_MS).toISOString(),
      lastAttemptAt: now.toISOString(),
      lastSuccessAt: current?.lastSuccessAt ?? null,
      failureCount: current?.failureCount ?? 0,
      lastError: null,
    });
    await writeAlarmLease(prepared);
    try {
      const value = await withTimeout(task(), TASK_TIMEOUT_MS);
      const completed: AlarmLeaseState = Object.freeze({
        ...prepared,
        leaseUntil: null,
        lastSuccessAt: new Date().toISOString(),
        failureCount: 0,
        lastError: null,
      });
      await writeAlarmLease(completed);
      return Object.freeze({ status: 'executed' as const, value, state: completed });
    } catch (error) {
      const failed: AlarmLeaseState = Object.freeze({
        ...prepared,
        leaseUntil: null,
        failureCount: prepared.failureCount + 1,
        lastError: safeError(error),
      });
      await writeAlarmLease(failed);
      throw error;
    }
  });
  inFlight.set(alarmName, result);
  void result.then(
    () => {
      if (inFlight.get(alarmName) === result) inFlight.delete(alarmName);
    },
    () => {
      if (inFlight.get(alarmName) === result) inFlight.delete(alarmName);
    }
  );
  return result;
}

export function resetAlarmLeaseForTests(): void {
  operation = Promise.resolve();
  inFlight.clear();
}

export async function readAlarmLease(alarmName: string): Promise<AlarmLeaseState | null> {
  const stored = await storageGet<unknown>('local', key(alarmName));
  return normalize(stored, alarmName);
}

export function alarmMissed(
  state: AlarmLeaseState | null,
  periodMs: number,
  now = Date.now()
): boolean {
  if (!state?.lastSuccessAt) return true;
  return now - Date.parse(state.lastSuccessAt) > periodMs * 1.5;
}

function writeAlarmLease(state: AlarmLeaseState): Promise<void> {
  return runStorageTransaction({
    kind: 'alarm-lease',
    setItems: { [key(state.alarmName)]: state },
  });
}

function normalize(value: unknown, alarmName: string): AlarmLeaseState | null {
  if (value === undefined) return null;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    record.schemaVersion !== '1.0.0' ||
    record.alarmName !== alarmName ||
    typeof record.runId !== 'string' ||
    typeof record.lastAttemptAt !== 'string' ||
    !Number.isFinite(Date.parse(record.lastAttemptAt)) ||
    (record.leaseUntil !== null &&
      (typeof record.leaseUntil !== 'string' || !Number.isFinite(Date.parse(record.leaseUntil)))) ||
    (record.lastSuccessAt !== null &&
      (typeof record.lastSuccessAt !== 'string' ||
        !Number.isFinite(Date.parse(record.lastSuccessAt)))) ||
    !Number.isInteger(record.failureCount) ||
    Number(record.failureCount) < 0 ||
    (record.lastError !== null && typeof record.lastError !== 'string')
  )
    return null;
  return Object.freeze({
    schemaVersion: '1.0.0',
    alarmName,
    runId: record.runId,
    leaseUntil: record.leaseUntil,
    lastAttemptAt: new Date(record.lastAttemptAt).toISOString(),
    lastSuccessAt:
      record.lastSuccessAt === null ? null : new Date(record.lastSuccessAt).toISOString(),
    failureCount: Number(record.failureCount),
    lastError: record.lastError,
  });
}

function key(alarmName: string): string {
  if (!/^[a-z0-9-]{1,64}$/u.test(alarmName)) throw new Error('Invalid alarm name');
  return `${PREFIX}${alarmName}`;
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Alarm task timed out')), milliseconds);
    void promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    );
  });
}

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error ?? 'Unknown error')).slice(0, 512);
}

function serialized<T>(work: () => Promise<T>): Promise<T> {
  const result = operation.then(work, work);
  operation = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}
