import { beforeEach, describe, expect, it } from 'vitest';
import {
  readSafeModeState,
  recordCriticalFailure,
  recordHealthyInitialization,
  resetSafeModeForTests,
} from '../../src/background/safe-mode';

const local: Record<string, unknown> = {};

beforeEach(() => {
  resetSafeModeForTests();
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
        },
      },
    },
  });
});

describe('OU-007 persistent safe mode', () => {
  it('activates only after the versioned failure threshold', async () => {
    await recordCriticalFailure('initialization', 'Error');
    await recordCriticalFailure('initialization', 'Error');
    expect((await readSafeModeState()).active).toBe(false);
    expect((await recordCriticalFailure('initialization', 'Error')).active).toBe(true);
  });

  it('requires three verified healthy initializations before automatic recovery', async () => {
    for (let index = 0; index < 3; index += 1)
      await recordCriticalFailure('initialization', 'Error');
    expect((await recordHealthyInitialization()).active).toBe(true);
    expect((await recordHealthyInitialization()).active).toBe(true);
    expect((await recordHealthyInitialization()).active).toBe(false);
  });
});
