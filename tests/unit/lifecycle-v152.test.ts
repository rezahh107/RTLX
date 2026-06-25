import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  restrictStorageToTrustedContexts: vi.fn(async () => []),
  recoverStorageTransactions: vi.fn(async () => ({ recovered: 0, discarded: 0 })),
  getSettings: vi.fn(async () => ({ remoteProfiles: false })),
  ensureProfileAlarm: vi.fn(async () => undefined),
  synchronizeRegisteredContentScript: vi.fn(async () => ({
    status: 'unchanged' as const,
    generation: 1,
    origins: Object.freeze([] as string[]),
    fallback: false,
  })),
  reconcileRuntimeContexts: vi.fn(async () => ({
    status: 'unsupported' as const,
    contexts: Object.freeze([]),
    observedAt: new Date(0).toISOString(),
  })),
  readSafeModeState: vi.fn(async () => ({
    schemaVersion: '1.0.0' as const,
    active: false,
    consecutiveFailures: 0,
    healthyInitializations: 0,
    lastFailureCode: null,
    lastFailureSource: null,
    activatedAt: null,
    updatedAt: new Date(0).toISOString(),
  })),
  recordHealthyInitialization: vi.fn(async () => ({
    schemaVersion: '1.0.0' as const,
    active: false,
    consecutiveFailures: 0,
    healthyInitializations: 0,
    lastFailureCode: null,
    lastFailureSource: null,
    activatedAt: null,
    updatedAt: new Date(0).toISOString(),
  })),
  recordCriticalFailure: vi.fn(async () => undefined),
  recoverPendingUpdate: vi.fn(async () => ({ recovered: false, previousVersion: null })),
  verifyCriticalPackageFiles: vi.fn(async () => ({
    status: 'verified' as const,
    productVersion: '15.9.11',
    target: 'test',
    checkedAt: new Date(0).toISOString(),
    files: Object.freeze([]),
  })),
}));

vi.mock('../../src/background/storage-access', () => ({
  restrictStorageToTrustedContexts: mocks.restrictStorageToTrustedContexts,
}));
vi.mock('../../src/background/storage-transaction', () => ({
  recoverStorageTransactions: mocks.recoverStorageTransactions,
}));
vi.mock('../../src/background/settings-repository', () => ({ getSettings: mocks.getSettings }));
vi.mock('../../src/background/alarm-manager', () => ({
  ensureProfileAlarm: mocks.ensureProfileAlarm,
}));
vi.mock('../../src/background/permission-manager', () => ({
  synchronizeRegisteredContentScript: mocks.synchronizeRegisteredContentScript,
}));
vi.mock('../../src/background/runtime-context-reconciler', () => ({
  reconcileRuntimeContexts: mocks.reconcileRuntimeContexts,
}));
vi.mock('../../src/background/safe-mode', () => ({
  readSafeModeState: mocks.readSafeModeState,
  recordHealthyInitialization: mocks.recordHealthyInitialization,
  recordCriticalFailure: mocks.recordCriticalFailure,
}));
vi.mock('../../src/background/update-coordinator', () => ({
  recoverPendingUpdate: mocks.recoverPendingUpdate,
}));
vi.mock('../../src/background/package-integrity', () => ({
  verifyCriticalPackageFiles: mocks.verifyCriticalPackageFiles,
}));

import {
  ensureBackgroundContextInitialized,
  ensureBackgroundInitialized,
  reinitializeBackground,
  resetBackgroundInitializationForTests,
} from '../../src/background/lifecycle';

beforeEach(() => {
  vi.clearAllMocks();
  resetBackgroundInitializationForTests();
});

describe('RH-002 single-flight background initialization', () => {
  it('shares one initialization across concurrent event entry points', async () => {
    const first = ensureBackgroundInitialized('event-a');
    const second = ensureBackgroundInitialized('event-b');
    expect(first).toBe(second);
    const [left, right] = await Promise.all([first, second]);
    expect(left).toBe(right);
    expect(mocks.recoverStorageTransactions).toHaveBeenCalledTimes(1);
    expect(mocks.synchronizeRegisteredContentScript).toHaveBeenCalledTimes(1);
  });

  it('serializes an explicit reinitialization behind an in-flight initialization', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mocks.recoverStorageTransactions.mockImplementationOnce(async () => {
      await gate;
      return { recovered: 0, discarded: 0 };
    });
    const first = ensureBackgroundInitialized('module-load');
    const second = reinitializeBackground('onInstalled:update');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.recoverStorageTransactions).toHaveBeenCalledTimes(1);
    release();
    const [left, right] = await Promise.all([first, second]);
    expect(left.generation).toBe(1);
    expect(right.generation).toBe(2);
    expect(mocks.recoverStorageTransactions).toHaveBeenCalledTimes(2);
  });

  it('runs a new generation only when reinitialization is explicit', async () => {
    const first = await ensureBackgroundInitialized('initial');
    const second = await reinitializeBackground('startup');
    expect(first.generation).toBe(1);
    expect(second.generation).toBe(2);
    expect(mocks.recoverStorageTransactions).toHaveBeenCalledTimes(2);
  });

  it('serves context after critical initialization when maintenance fails', async () => {
    mocks.synchronizeRegisteredContentScript.mockRejectedValueOnce(
      new Error('registerContentScripts unavailable')
    );
    const full = ensureBackgroundInitialized('module-load');
    await expect(ensureBackgroundContextInitialized('runtime:request-context')).resolves.toBe(
      undefined
    );
    const result = await full;
    expect(result.maintenanceFailures).toEqual([
      {
        stage: 'content-script-reconciliation',
        error: 'registerContentScripts unavailable',
      },
    ]);
    expect(mocks.recordCriticalFailure).not.toHaveBeenCalled();
  });

  it('times out a stalled maintenance stage without blocking context', async () => {
    vi.useFakeTimers();
    try {
      mocks.synchronizeRegisteredContentScript.mockImplementationOnce(
        () => new Promise(() => undefined)
      );
      const full = ensureBackgroundInitialized('module-load');
      await expect(ensureBackgroundContextInitialized('runtime:request-context')).resolves.toBe(
        undefined
      );
      await vi.advanceTimersByTimeAsync(3_000);
      const result = await full;
      expect(result.maintenanceFailures).toContainEqual({
        stage: 'content-script-reconciliation',
        error: 'Background maintenance stage timed out: content-script-reconciliation',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps critical settings failures fatal', async () => {
    mocks.getSettings.mockRejectedValueOnce(new Error('settings unavailable'));
    await expect(ensureBackgroundContextInitialized('runtime:request-context')).rejects.toThrow(
      'settings unavailable'
    );
    expect(mocks.recordCriticalFailure).toHaveBeenCalledWith(
      'background-context-initialization',
      'Error'
    );
  });
});
