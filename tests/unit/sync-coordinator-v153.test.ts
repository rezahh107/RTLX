import { beforeEach, describe, expect, it, vi } from 'vitest';

const stores = vi.hoisted(
  (): { local: Record<string, unknown>; sync: Record<string, unknown>; applyWrites: boolean } => ({
    local: {},
    sync: {},
    applyWrites: true,
  })
);

import {
  observeSyncStorageChanges,
  persistSyncCoordinated,
  readObservedSyncChanges,
  readSyncConflicts,
  resetSyncCoordinatorForTests,
  SyncConflictError,
} from '../../src/background/sync-coordinator';
import { resetStorageTransactionQueueForTests } from '../../src/background/storage-transaction';

beforeEach(() => {
  resetSyncCoordinatorForTests();
  resetStorageTransactionQueueForTests();
  stores.applyWrites = true;
  for (const store of [stores.local, stores.sync])
    for (const key of Object.keys(store)) delete store[key];
  const session: Record<string, unknown> = {};
  const area = (name: 'local' | 'sync' | 'session', store: Record<string, unknown>) => ({
    get: (key: string | null, callback: (items: Record<string, unknown>) => void) =>
      callback(key === null ? { ...store } : key in store ? { [key]: store[key] } : {}),
    set: (items: Record<string, unknown>, callback: () => void) => {
      if (name !== 'sync' || stores.applyWrites) Object.assign(store, items);
      callback();
    },
    remove: (keys: string | string[], callback: () => void) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete store[key];
      callback();
    },
    getBytesInUse: (_keys: null, callback: (bytes: number) => void) =>
      callback(JSON.stringify(store).length),
  });
  Object.assign(globalThis, {
    chrome: {
      runtime: { lastError: null },
      storage: {
        local: area('local', stores.local),
        sync: area('sync', stores.sync),
        session: area('session', session),
      },
    },
  });
});

describe('OU-004 synchronized setting writes', () => {
  it('serializes and verifies canonical read-back', async () => {
    await persistSyncCoordinated('settings', { 'rtlx:settings': { enabled: true } });
    expect(stores.sync['rtlx:settings']).toEqual({ enabled: true });
    expect(await readSyncConflicts()).toEqual([]);
  });

  it('records sync change evidence as hashes only', async () => {
    observeSyncStorageChanges(
      {
        'rtlx:settings': {
          oldValue: { enabled: false },
          newValue: { enabled: true },
        },
      },
      'sync'
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const observed = await readObservedSyncChanges();
    expect(observed).toHaveLength(1);
    expect(JSON.stringify(observed)).not.toContain('enabled');
    expect(JSON.stringify(observed)).not.toContain('rtlx:settings');
  });

  it('records only hashes when browser-effective data differs', async () => {
    stores.applyWrites = false;
    await expect(
      persistSyncCoordinated('settings', { 'rtlx:settings': { enabled: true } })
    ).rejects.toBeInstanceOf(SyncConflictError);
    const conflicts = await readSyncConflicts();
    expect(conflicts).toHaveLength(1);
    expect(JSON.stringify(conflicts)).not.toContain('enabled');
  });
});
