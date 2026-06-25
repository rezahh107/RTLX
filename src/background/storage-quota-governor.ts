import { canonicalByteLength } from '../shared/canonical-json';
import { STORAGE_BUDGETS_REGISTRY } from '../shared/registry-data';
import {
  storageGetAll,
  storageGetBytesInUse,
  storageRemove,
  storageSet,
} from '../shared/api-adapter';

const SYNC_HARD_LIMIT_BYTES = 90 * 1024;
const SYNC_ITEM_LIMIT_BYTES = 8 * 1024;

export interface StorageQuotaSnapshot {
  area: 'local' | 'sync';
  currentBytes: number;
  projectedBytes: number;
  softLimitBytes: number;
  hardLimitBytes: number;
  pressure: boolean;
  evictedKeys: readonly string[];
}

export class StorageQuotaError extends Error {
  public constructor(public readonly snapshot: StorageQuotaSnapshot) {
    super(`Storage quota budget exceeded for ${snapshot.area}`);
    this.name = 'StorageQuotaError';
  }
}

export async function enforceStorageBudget(
  area: 'local' | 'sync',
  setItems: Readonly<Record<string, unknown>>,
  removeKeys: readonly string[]
): Promise<StorageQuotaSnapshot> {
  if (area === 'sync') validateSyncItems(setItems);
  let current = await storageGetAll(area);
  const measured = await storageGetBytesInUse(area);
  let currentBytes = measured ?? canonicalByteLength(current);
  let projected = project(current, setItems, removeKeys);
  let projectedBytes = canonicalByteLength(projected);
  const limits = limitsFor(area);
  const evictedKeys: string[] = [];

  if (projectedBytes > limits.softLimitBytes && area === 'local') {
    const pruned = prunePressureData(projected, setItems);
    if (pruned.changed) {
      for (const [key, value] of Object.entries(pruned.changed)) {
        if (value === undefined) {
          await storageRemove('local', key);
        } else {
          await storageSet('local', { [key]: value });
        }
        evictedKeys.push(key);
      }
      current = await storageGetAll('local');
      currentBytes = (await storageGetBytesInUse('local')) ?? canonicalByteLength(current);
      projected = project(current, setItems, removeKeys);
      projectedBytes = canonicalByteLength(projected);
    }
  }

  const snapshot = Object.freeze({
    area,
    currentBytes,
    projectedBytes,
    softLimitBytes: limits.softLimitBytes,
    hardLimitBytes: limits.hardLimitBytes,
    pressure: projectedBytes > limits.softLimitBytes,
    evictedKeys: Object.freeze([...evictedKeys].sort((a, b) => a.localeCompare(b, 'en'))),
  });
  if (projectedBytes > limits.hardLimitBytes) throw new StorageQuotaError(snapshot);
  return snapshot;
}

export function storageNamespace(
  key: string
): keyof typeof STORAGE_BUDGETS_REGISTRY.namespaceBudgets {
  if (key.startsWith('rtlx:diagnostics:')) return 'diagnostics';
  if (key.startsWith('rtlx:profile-history:')) return 'profileHistory';
  if (key.startsWith('rtlx:user-profile:') || key.startsWith('rtlx:community-profile:'))
    return 'profiles';
  if (key.startsWith('rtlx:settings') || key.startsWith('rtlx:site-settings:')) return 'settings';
  if (key.startsWith('rtlx:storage-transaction:')) return 'transactions';
  return 'other';
}

function project(
  current: Readonly<Record<string, unknown>>,
  setItems: Readonly<Record<string, unknown>>,
  removeKeys: readonly string[]
): Record<string, unknown> {
  const next = { ...current, ...setItems };
  for (const key of removeKeys) delete next[key];
  return next;
}

function prunePressureData(
  projected: Readonly<Record<string, unknown>>,
  protectedItems: Readonly<Record<string, unknown>>
): { changed: Record<string, unknown> } {
  const changed: Record<string, unknown> = {};
  for (const key of Object.keys(projected).sort((a, b) => a.localeCompare(b, 'en'))) {
    if (key in protectedItems) continue;
    const value = projected[key];
    if (storageNamespace(key) === 'diagnostics' && Array.isArray(value) && value.length > 250) {
      changed[key] = value.slice(-250);
      continue;
    }
    if (storageNamespace(key) === 'profileHistory' && Array.isArray(value) && value.length > 5) {
      changed[key] = value.slice(0, 5);
    }
  }
  return { changed };
}

function validateSyncItems(setItems: Readonly<Record<string, unknown>>): void {
  for (const [key, value] of Object.entries(setItems)) {
    if (canonicalByteLength({ [key]: value }) > SYNC_ITEM_LIMIT_BYTES)
      throw new Error(`Sync storage item exceeds deterministic item budget: ${key}`);
  }
}

function limitsFor(area: 'local' | 'sync'): { softLimitBytes: number; hardLimitBytes: number } {
  if (area === 'sync')
    return {
      softLimitBytes: Math.floor(SYNC_HARD_LIMIT_BYTES * 0.8),
      hardLimitBytes: SYNC_HARD_LIMIT_BYTES,
    };
  return {
    softLimitBytes: STORAGE_BUDGETS_REGISTRY.softLimitBytes,
    hardLimitBytes: STORAGE_BUDGETS_REGISTRY.hardLimitBytes,
  };
}
