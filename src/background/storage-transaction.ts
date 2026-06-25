import { canonicalize, sha256Hex, toCanonicalJson } from '../shared/canonical-json';
import { STORAGE_BUDGETS_REGISTRY } from '../shared/registry-data';
import {
  hasStorageArea,
  storageGet,
  storageGetAll,
  storageRemove,
  storageSet,
} from '../shared/api-adapter';
import { enforceStorageBudget } from './storage-quota-governor';

const V1_PREFIX = 'rtlx:storage-transaction:v1:';
const V2_PREFIX = 'rtlx:storage-transaction:v2:';
const SEQUENCE_KEY = 'rtlx:storage-transaction-sequence:v2';
type DurableStorageArea = 'local' | 'sync';
type TransactionState = 'prepared' | 'target_applied' | 'committed';

export interface StorageTransactionSpec {
  kind: string;
  area?: DurableStorageArea;
  setItems?: Readonly<Record<string, unknown>>;
  removeKeys?: readonly string[];
}

export interface StorageTransactionHooks {
  afterPrepared?(): void | Promise<void>;
  afterTargetWrite?(): void | Promise<void>;
  /** @deprecated Use afterTargetWrite. Retained for v15.0 test and caller compatibility. */
  afterLocalWrite?(): void | Promise<void>;
  afterAppliedMarker?(): void | Promise<void>;
  afterCommittedMarker?(): void | Promise<void>;
}

interface StorageTransactionRecordV2 {
  schemaVersion: '2.0.0';
  transactionId: string;
  sequence: number;
  kind: string;
  targetArea: DurableStorageArea;
  state: TransactionState;
  createdAt: string;
  expiresAt: string;
  setItems: Readonly<Record<string, unknown>>;
  removeKeys: readonly string[];
  checksum: string;
}

interface LegacyStorageTransactionRecord {
  schemaVersion: '1.1.0';
  transactionId: string;
  sequence: number;
  kind: string;
  targetArea: DurableStorageArea;
  state: 'prepared' | 'target_applied';
  createdAt: string;
  expiresAt: string;
  setItems: Readonly<Record<string, unknown>>;
  removeKeys: readonly string[];
}

type NormalizedRecord = StorageTransactionRecordV2 | LegacyStorageTransactionRecord;
let operation: Promise<void> = Promise.resolve();

export function runStorageTransaction(
  spec: StorageTransactionSpec,
  hooks: StorageTransactionHooks = {}
): Promise<void> {
  return serialized(async () => {
    validateSpec(spec);
    await pruneInvalidAndExpiredMarkers();
    const pending = await readMarkers();
    if (pending.length >= STORAGE_BUDGETS_REGISTRY.transactionMarkerMax)
      throw new Error('Storage transaction marker budget exhausted');
    const sequence = await nextSequence();
    const createdAt = new Date().toISOString();
    const record = await createRecord({
      transactionId: createTransactionId(spec.kind, sequence),
      sequence,
      kind: spec.kind,
      targetArea: spec.area ?? 'local',
      state: 'prepared',
      createdAt,
      expiresAt: new Date(
        Date.parse(createdAt) + STORAGE_BUDGETS_REGISTRY.transactionMarkerTtlMs
      ).toISOString(),
      setItems: Object.freeze({ ...(spec.setItems ?? {}) }),
      removeKeys: Object.freeze(
        [...(spec.removeKeys ?? [])].sort((a, b) => a.localeCompare(b, 'en'))
      ),
    });
    await enforceStorageBudget(record.targetArea, record.setItems, record.removeKeys);
    await writeMarker(record);
    await hooks.afterPrepared?.();
    await applyRecord(record);
    await hooks.afterTargetWrite?.();
    await hooks.afterLocalWrite?.();
    const applied = await transition(record, 'target_applied');
    await writeMarker(applied);
    await hooks.afterAppliedMarker?.();
    const committed = await transition(applied, 'committed');
    await writeMarker(committed);
    await hooks.afterCommittedMarker?.();
    await removeMarker(committed.transactionId);
  });
}

export function recoverStorageTransactions(): Promise<
  Readonly<{ recovered: number; discarded: number }>
> {
  return serialized(async () => recoverStorageTransactionsInternal());
}

export async function pendingStorageTransactionCount(): Promise<number> {
  return (await readMarkers()).length;
}

export function resetStorageTransactionQueueForTests(): void {
  operation = Promise.resolve();
}

async function recoverStorageTransactionsInternal(): Promise<
  Readonly<{ recovered: number; discarded: number }>
> {
  const markers = await readMarkers();
  let recovered = 0;
  let discarded = 0;
  for (const marker of markers) {
    try {
      const record = await normalizeRecord(marker.value);
      if (Date.parse(record.expiresAt) <= Date.now()) {
        await storageRemove(marker.area, marker.key);
        discarded += 1;
        continue;
      }
      if (record.state === 'prepared') {
        await enforceStorageBudget(record.targetArea, record.setItems, record.removeKeys);
        await applyRecord(record);
        if (record.schemaVersion === '2.0.0')
          await writeMarker(await transition(record, 'target_applied'));
      }
      if (record.schemaVersion === '2.0.0' && record.state !== 'committed')
        await writeMarker(await transition(record, 'committed'));
      await removeMarker(record.transactionId);
      if (marker.area === 'session') await storageRemove('session', marker.key);
      recovered += 1;
    } catch {
      await storageRemove(marker.area, marker.key);
      discarded += 1;
    }
  }
  return Object.freeze({ recovered, discarded });
}

async function applyRecord(record: NormalizedRecord): Promise<void> {
  if (Object.keys(record.setItems).length > 0)
    await storageSet(record.targetArea, { ...record.setItems });
  if (record.removeKeys.length > 0) await storageRemove(record.targetArea, [...record.removeKeys]);
}

async function createRecord(
  input: Omit<StorageTransactionRecordV2, 'schemaVersion' | 'checksum'>
): Promise<StorageTransactionRecordV2> {
  const base = Object.freeze({ schemaVersion: '2.0.0' as const, ...input });
  const checksum = await checksumFor(base);
  return freezeRecord({ ...base, checksum });
}

async function transition(
  record: StorageTransactionRecordV2,
  state: TransactionState
): Promise<StorageTransactionRecordV2> {
  return createRecord({
    transactionId: record.transactionId,
    sequence: record.sequence,
    kind: record.kind,
    targetArea: record.targetArea,
    state,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    setItems: record.setItems,
    removeKeys: record.removeKeys,
  });
}

async function writeMarker(record: StorageTransactionRecordV2): Promise<void> {
  await storageSet('local', { [`${V2_PREFIX}${record.transactionId}`]: record });
}

async function removeMarker(transactionId: string): Promise<void> {
  await storageRemove('local', [`${V2_PREFIX}${transactionId}`, `${V1_PREFIX}${transactionId}`]);
  if (hasStorageArea('session'))
    await storageRemove('session', [
      `${V2_PREFIX}${transactionId}`,
      `${V1_PREFIX}${transactionId}`,
    ]);
}

interface MarkerValue {
  area: 'local' | 'session';
  key: string;
  value: unknown;
}

async function readMarkers(): Promise<readonly MarkerValue[]> {
  const values: MarkerValue[] = [];
  const areas: readonly ('local' | 'session')[] = hasStorageArea('session')
    ? ['local', 'session']
    : ['local'];
  for (const area of areas) {
    const stored = await storageGetAll(area);
    for (const [key, value] of Object.entries(stored))
      if (key.startsWith(V1_PREFIX) || key.startsWith(V2_PREFIX)) values.push({ area, key, value });
  }
  const deduped = new Map<string, MarkerValue>();
  for (const marker of values.sort(compareMarkers)) {
    const transactionId = marker.key.slice(marker.key.lastIndexOf(':') + 1);
    if (!deduped.has(transactionId) || marker.area === 'local') deduped.set(transactionId, marker);
  }
  return Object.freeze([...deduped.values()].sort(compareMarkers));
}

async function normalizeRecord(value: unknown): Promise<NormalizedRecord> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Storage transaction marker invalid');
  const record = value as Record<string, unknown>;
  if (record.schemaVersion === '2.0.0') return normalizeV2(record);
  return normalizeLegacy(record);
}

async function normalizeV2(record: Record<string, unknown>): Promise<StorageTransactionRecordV2> {
  if (
    typeof record.transactionId !== 'string' ||
    !/^[a-z0-9-]{1,128}$/u.test(record.transactionId) ||
    !Number.isInteger(record.sequence) ||
    Number(record.sequence) < 1 ||
    typeof record.kind !== 'string' ||
    !/^[a-z0-9-]{1,64}$/u.test(record.kind) ||
    (record.targetArea !== 'local' && record.targetArea !== 'sync') ||
    !['prepared', 'target_applied', 'committed'].includes(String(record.state)) ||
    typeof record.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(record.createdAt)) ||
    typeof record.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(record.expiresAt)) ||
    typeof record.setItems !== 'object' ||
    record.setItems === null ||
    Array.isArray(record.setItems) ||
    !Array.isArray(record.removeKeys) ||
    !record.removeKeys.every((key) => typeof key === 'string') ||
    typeof record.checksum !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(record.checksum)
  )
    throw new Error('Storage transaction marker invalid');
  const normalized = freezeRecord({
    schemaVersion: '2.0.0',
    transactionId: record.transactionId,
    sequence: Number(record.sequence),
    kind: record.kind,
    targetArea: record.targetArea,
    state: record.state as TransactionState,
    createdAt: new Date(record.createdAt).toISOString(),
    expiresAt: new Date(record.expiresAt).toISOString(),
    setItems: Object.freeze({ ...(record.setItems as Record<string, unknown>) }),
    removeKeys: Object.freeze([...record.removeKeys].sort((a, b) => a.localeCompare(b, 'en'))),
    checksum: record.checksum,
  });
  if ((await checksumFor(withoutChecksum(normalized))) !== normalized.checksum)
    throw new Error('Storage transaction checksum mismatch');
  return normalized;
}

function normalizeLegacy(record: Record<string, unknown>): LegacyStorageTransactionRecord {
  const schemaVersion = record.schemaVersion;
  const targetArea = schemaVersion === '1.0.0' ? 'local' : record.targetArea;
  if (
    (schemaVersion !== '1.0.0' && schemaVersion !== '1.1.0') ||
    typeof record.transactionId !== 'string' ||
    !/^[a-z0-9-]{1,128}$/u.test(record.transactionId) ||
    typeof record.kind !== 'string' ||
    !/^[a-z0-9-]{1,64}$/u.test(record.kind) ||
    (targetArea !== 'local' && targetArea !== 'sync') ||
    !['prepared', 'applied'].includes(String(record.state)) ||
    typeof record.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(record.createdAt)) ||
    typeof record.setItems !== 'object' ||
    record.setItems === null ||
    Array.isArray(record.setItems) ||
    !Array.isArray(record.removeKeys) ||
    !record.removeKeys.every((key) => typeof key === 'string')
  )
    throw new Error('Storage transaction marker invalid');
  const createdAt = new Date(record.createdAt).toISOString();
  return Object.freeze({
    schemaVersion: '1.1.0',
    transactionId: record.transactionId,
    sequence: 0,
    kind: record.kind,
    targetArea,
    state: record.state === 'applied' ? 'target_applied' : 'prepared',
    createdAt,
    expiresAt: new Date(
      Date.parse(createdAt) + STORAGE_BUDGETS_REGISTRY.transactionMarkerTtlMs
    ).toISOString(),
    setItems: Object.freeze({ ...(record.setItems as Record<string, unknown>) }),
    removeKeys: Object.freeze([...record.removeKeys].sort((a, b) => a.localeCompare(b, 'en'))),
  });
}

function validateSpec(spec: StorageTransactionSpec): void {
  if (!/^[a-z0-9-]{1,64}$/u.test(spec.kind)) throw new Error('Invalid transaction kind');
  if (spec.area !== undefined && spec.area !== 'local' && spec.area !== 'sync')
    throw new Error('Invalid transaction target area');
  const setItems = spec.setItems ?? {};
  toCanonicalJson(setItems);
  const setKeys = Object.keys(setItems);
  if (
    setKeys.some(
      (key) => key.length === 0 || key.startsWith(V1_PREFIX) || key.startsWith(V2_PREFIX)
    )
  )
    throw new Error('Invalid transaction set key');
  const removeKeys = spec.removeKeys ?? [];
  if (
    removeKeys.some(
      (key) =>
        typeof key !== 'string' ||
        key.length === 0 ||
        key.startsWith(V1_PREFIX) ||
        key.startsWith(V2_PREFIX)
    )
  )
    throw new Error('Invalid transaction remove key');
  const overlap = new Set(setKeys);
  if (removeKeys.some((key) => overlap.has(key)))
    throw new Error('Transaction cannot set and remove the same key');
}

async function nextSequence(): Promise<number> {
  const current = await storageGet<unknown>('local', SEQUENCE_KEY);
  const sequence = Number.isSafeInteger(current) && Number(current) >= 0 ? Number(current) + 1 : 1;
  await storageSet('local', { [SEQUENCE_KEY]: sequence });
  return sequence;
}

async function checksumFor(record: Omit<StorageTransactionRecordV2, 'checksum'>): Promise<string> {
  return sha256Hex(canonicalize(toCanonicalJson(record)));
}

function withoutChecksum(
  record: StorageTransactionRecordV2
): Omit<StorageTransactionRecordV2, 'checksum'> {
  const { checksum, ...rest } = record;
  void checksum;
  return rest;
}

async function pruneInvalidAndExpiredMarkers(): Promise<void> {
  const now = Date.now();
  for (const marker of await readMarkers()) {
    try {
      const record = await normalizeRecord(marker.value);
      if (Date.parse(record.expiresAt) <= now) await storageRemove(marker.area, marker.key);
    } catch {
      await storageRemove(marker.area, marker.key);
    }
  }
}

function createTransactionId(kind: string, sequence: number): string {
  const random = crypto.randomUUID().toLowerCase();
  return `${kind}-${sequence.toString(36)}-${random}`.slice(0, 128);
}

function freezeRecord(record: StorageTransactionRecordV2): StorageTransactionRecordV2 {
  return Object.freeze(record);
}

function compareMarkers(a: MarkerValue, b: MarkerValue): number {
  const keyOrder = a.key.localeCompare(b.key, 'en');
  return keyOrder === 0 ? a.area.localeCompare(b.area, 'en') : keyOrder;
}

function serialized<T>(operationToRun: () => Promise<T>): Promise<T> {
  const result = operation.then(operationToRun, operationToRun);
  operation = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}
