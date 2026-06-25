import { beforeEach, describe, expect, it } from 'vitest';
import {
  backgroundRuntimeSnapshot,
  resetBackgroundRuntimeStatusForTests,
  runBackgroundTask,
} from '../../src/background/runtime-status';

beforeEach(() => resetBackgroundRuntimeStatusForTests());

describe('RH-013 structured background failure handling', () => {
  it('retries bounded transient failures and records recovery', async () => {
    let attempts = 0;
    await expect(
      runBackgroundTask(
        'transient',
        async () => {
          attempts += 1;
          if (attempts === 1) throw new Error('Receiving end does not exist');
          return 'ok';
        },
        { attempts: 2, retryDelayMs: 0 }
      )
    ).resolves.toBe('ok');
    expect(attempts).toBe(2);
    expect(backgroundRuntimeSnapshot()[0]).toMatchObject({ state: 'healthy', failures: 0 });
  });

  it('opens a bounded circuit after repeated internal failures', async () => {
    for (let index = 0; index < 5; index += 1)
      await expect(
        runBackgroundTask('internal', async () => Promise.reject(new Error('unexpected failure')))
      ).rejects.toThrow('unexpected failure');
    expect(backgroundRuntimeSnapshot()[0]?.state).toBe('circuit_open');
    await expect(runBackgroundTask('internal', async () => 'never')).rejects.toThrow(
      'Background circuit open'
    );
  });
});
