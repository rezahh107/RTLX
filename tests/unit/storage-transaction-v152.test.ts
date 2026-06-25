import { beforeEach, describe, expect, it } from 'vitest';
import {
  pendingStorageTransactionCount,
  recoverStorageTransactions,
  runStorageTransaction,
} from '../../src/background/storage-transaction';

const local: Record<string, unknown> = {};
const session: Record<string, unknown> = {};
const sync: Record<string, unknown> = {};

beforeEach(() => {
  for (const store of [local, session, sync])
    for (const key of Object.keys(store)) delete store[key];
  const area = (store: Record<string, unknown>) => ({
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
  });
  Object.assign(globalThis, {
    chrome: {
      runtime: { lastError: null },
      storage: { local: area(local), session: area(session), sync: area(sync) },
    },
  });
});

describe('RH-001 durable transaction journal', () => {
  it('keeps the recovery marker in durable local storage even when session exists', async () => {
    await expect(
      runStorageTransaction(
        { kind: 'restart-durable', setItems: { durable: true } },
        { afterPrepared: () => Promise.reject(new Error('browser-closed')) }
      )
    ).rejects.toThrow('browser-closed');

    expect(Object.keys(session)).toEqual([]);
    expect(Object.keys(local).some((key) => key.startsWith('rtlx:storage-transaction:v2:'))).toBe(
      true
    );
    expect(await recoverStorageTransactions()).toEqual({ recovered: 1, discarded: 0 });
    expect(local.durable).toBe(true);
    expect(await pendingStorageTransactionCount()).toBe(0);
  });

  it('rejects a corrupted marker without applying its payload', async () => {
    await expect(
      runStorageTransaction(
        { kind: 'checksum-guard', setItems: { mustNotApply: true } },
        { afterPrepared: () => Promise.reject(new Error('terminated')) }
      )
    ).rejects.toThrow('terminated');
    const markerKey = Object.keys(local).find((key) =>
      key.startsWith('rtlx:storage-transaction:v2:')
    );
    expect(markerKey).toBeDefined();
    const marker = local[markerKey!] as Record<string, unknown>;
    local[markerKey!] = { ...marker, checksum: '0'.repeat(64) };

    expect(await recoverStorageTransactions()).toEqual({ recovered: 0, discarded: 1 });
    expect(local.mustNotApply).toBeUndefined();
  });

  it('discards an expired prepared marker instead of replaying stale work', async () => {
    await expect(
      runStorageTransaction(
        { kind: 'expired-recovery', setItems: { stale: true } },
        { afterPrepared: () => Promise.reject(new Error('terminated')) }
      )
    ).rejects.toThrow('terminated');
    const markerKey = Object.keys(local).find((key) =>
      key.startsWith('rtlx:storage-transaction:v2:')
    );
    expect(markerKey).toBeDefined();
    const marker = local[markerKey!] as Record<string, unknown>;
    local[markerKey!] = { ...marker, expiresAt: new Date(0).toISOString() };
    // Expiry is checksum-protected, so this marker is deterministically discarded as invalid/stale.
    expect(await recoverStorageTransactions()).toEqual({ recovered: 0, discarded: 1 });
    expect(local.stale).toBeUndefined();
  });

  it('removes a committed marker after restart without re-running invalid work', async () => {
    await expect(
      runStorageTransaction(
        { kind: 'committed-recovery', setItems: { committed: 1 } },
        { afterCommittedMarker: () => Promise.reject(new Error('closed-after-commit')) }
      )
    ).rejects.toThrow('closed-after-commit');
    expect(local.committed).toBe(1);
    expect(await pendingStorageTransactionCount()).toBe(1);
    expect(await recoverStorageTransactions()).toEqual({ recovered: 1, discarded: 0 });
    expect(local.committed).toBe(1);
    expect(await pendingStorageTransactionCount()).toBe(0);
  });
});
