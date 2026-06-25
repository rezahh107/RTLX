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
  for (const key of Object.keys(local)) delete local[key];
  for (const key of Object.keys(session)) delete session[key];
  for (const key of Object.keys(sync)) delete sync[key];
  const area = (store: Record<string, unknown>) => ({
    get: (key: string | null, callback: (items: Record<string, unknown>) => void) => {
      if (key === null) callback({ ...store });
      else callback(key in store ? { [key]: store[key] } : {});
    },
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

describe('BH-011 service worker termination-safe storage', () => {
  it('recovers an operation terminated after the durable local write', async () => {
    await expect(
      runStorageTransaction(
        { kind: 'forced-termination', setItems: { profile: { version: 1 } } },
        { afterLocalWrite: () => Promise.reject(new Error('terminated')) }
      )
    ).rejects.toThrow('terminated');
    expect(local.profile).toEqual({ version: 1 });
    expect(await pendingStorageTransactionCount()).toBe(1);
    expect(await recoverStorageTransactions()).toEqual({ recovered: 1, discarded: 0 });
    expect(await pendingStorageTransactionCount()).toBe(0);
    expect(local.profile).toEqual({ version: 1 });
  });

  it('replays prepared writes and removals idempotently', async () => {
    local.old = true;
    await expect(
      runStorageTransaction(
        { kind: 'prepared-only', setItems: { next: 2 }, removeKeys: ['old'] },
        { afterPrepared: () => Promise.reject(new Error('terminated')) }
      )
    ).rejects.toThrow();
    expect(local.next).toBeUndefined();
    await recoverStorageTransactions();
    await recoverStorageTransactions();
    expect(local.next).toBe(2);
    expect(
      Object.keys(local).filter((key) => key.startsWith('rtlx:storage-transaction:v'))
    ).toEqual([]);
  });

  it('recovers 30 forced terminations and a sync-area write without duplicate effects', async () => {
    for (let index = 0; index < 30; index += 1) {
      await expect(
        runStorageTransaction(
          {
            kind: 'termination-stress',
            setItems: { [`record-${index}`]: { index } },
          },
          { afterPrepared: () => Promise.reject(new Error('terminated')) }
        )
      ).rejects.toThrow('terminated');
    }
    expect(await pendingStorageTransactionCount()).toBe(30);
    expect(await recoverStorageTransactions()).toEqual({ recovered: 30, discarded: 0 });
    expect(await pendingStorageTransactionCount()).toBe(0);
    expect(Object.keys(local).filter((key) => key.startsWith('record-'))).toHaveLength(30);

    await expect(
      runStorageTransaction(
        { kind: 'sync-write', area: 'sync', setItems: { settings: { version: 1 } } },
        { afterTargetWrite: () => Promise.reject(new Error('terminated')) }
      )
    ).rejects.toThrow('terminated');
    await recoverStorageTransactions();
    expect(sync.settings).toEqual({ version: 1 });
  });
});
