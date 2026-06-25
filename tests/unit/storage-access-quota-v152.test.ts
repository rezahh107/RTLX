import { beforeEach, describe, expect, it } from 'vitest';
import { restrictStorageToTrustedContexts } from '../../src/background/storage-access';
import {
  enforceStorageBudget,
  StorageQuotaError,
  storageNamespace,
} from '../../src/background/storage-quota-governor';

const local: Record<string, unknown> = {};
const sync: Record<string, unknown> = {};
const session: Record<string, unknown> = {};
const accessCalls: Array<{ area: string; accessLevel: string }> = [];

beforeEach(() => {
  accessCalls.length = 0;
  for (const store of [local, sync, session])
    for (const key of Object.keys(store)) delete store[key];
  const area = (name: string, store: Record<string, unknown>) => ({
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
    setAccessLevel: (options: { accessLevel: string }, callback: () => void) => {
      accessCalls.push({ area: name, accessLevel: options.accessLevel });
      callback();
    },
  });
  Object.assign(globalThis, {
    chrome: {
      runtime: { lastError: null },
      storage: {
        local: area('local', local),
        sync: area('sync', sync),
        session: area('session', session),
      },
    },
  });
});

describe('RH-004/RH-005 storage access and quota hardening', () => {
  it('restricts every available storage area to trusted contexts', async () => {
    const result = await restrictStorageToTrustedContexts();
    expect(result.every((entry) => entry.status === 'applied')).toBe(true);
    expect(accessCalls).toEqual([
      { area: 'local', accessLevel: 'TRUSTED_CONTEXTS' },
      { area: 'sync', accessLevel: 'TRUSTED_CONTEXTS' },
      { area: 'session', accessLevel: 'TRUSTED_CONTEXTS' },
    ]);
  });

  it('deterministically prunes low-priority diagnostics under soft pressure', async () => {
    local['rtlx:diagnostics:v1'] = Array.from({ length: 500 }, (_, index) => ({
      index,
      payload: 'x'.repeat(15_000),
    }));
    const snapshot = await enforceStorageBudget(
      'local',
      { 'rtlx:settings': { enabled: true } },
      []
    );
    expect(snapshot.evictedKeys).toContain('rtlx:diagnostics:v1');
    expect((local['rtlx:diagnostics:v1'] as unknown[]).length).toBe(250);
    expect(storageNamespace('rtlx:profile-history:example.com')).toBe('profileHistory');
  });

  it('rejects a protected write above the hard budget', async () => {
    await expect(
      enforceStorageBudget('local', { 'rtlx:user-profile:example.com': 'x'.repeat(9_000_000) }, [])
    ).rejects.toBeInstanceOf(StorageQuotaError);
  });
});
