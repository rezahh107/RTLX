import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginUpdateQuiescence,
  isUpdateQuiescing,
  readUpdateState,
  recoverPendingUpdate,
  resetUpdateCoordinatorForTests,
} from '../../src/background/update-coordinator';
import { PRODUCT_VERSION } from '../../src/shared/constants';

const local: Record<string, unknown> = {};

beforeEach(() => {
  resetUpdateCoordinatorForTests();
  for (const key of Object.keys(local)) delete local[key];
  Object.assign(globalThis, {
    chrome: {
      runtime: { lastError: null },
      storage: {
        local: {
          get: (key: string, callback: (items: Record<string, unknown>) => void) =>
            callback(key in local ? { [key]: local[key] } : {}),
          set: (items: Record<string, unknown>, callback: () => void) => {
            Object.assign(local, items);
            callback();
          },
          remove: (key: string, callback: () => void) => {
            delete local[key];
            callback();
          },
        },
      },
    },
  });
});

describe('OU-001 update-safe quiescence', () => {
  it('persists ready state before requesting runtime reload', async () => {
    const rollback = vi.fn(async () => undefined);
    const recover = vi.fn(async () => undefined);
    const reload = vi.fn();
    const state = await beginUpdateQuiescence('15.3.1', {
      rollbackActiveDocuments: rollback,
      recoverTransactions: recover,
      reload,
    });
    expect(state.phase).toBe('ready');
    expect(isUpdateQuiescing()).toBe(true);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(recover).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    expect((await readUpdateState())?.targetVersion).toBe('15.3.1');
  });

  it('clears a marker only after the target version starts', async () => {
    await beginUpdateQuiescence(PRODUCT_VERSION, {
      rollbackActiveDocuments: async () => undefined,
      recoverTransactions: async () => undefined,
      reload: () => undefined,
    });
    const result = await recoverPendingUpdate(PRODUCT_VERSION);
    expect(result.recovered).toBe(true);
    expect(await readUpdateState()).toBeNull();
    expect(isUpdateQuiescing()).toBe(false);
  });
});
