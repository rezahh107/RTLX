import { beforeEach, describe, expect, it } from 'vitest';
import {
  alarmMissed,
  readAlarmLease,
  resetAlarmLeaseForTests,
  runWithAlarmLease,
} from '../../src/background/alarm-lease';

const local: Record<string, unknown> = {};
const session: Record<string, unknown> = {};
const sync: Record<string, unknown> = {};

beforeEach(() => {
  resetAlarmLeaseForTests();
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

describe('RH-012 alarm lease and missed-run recovery', () => {
  it('deduplicates concurrent alarm delivery and persists success state', async () => {
    let executions = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = runWithAlarmLease('profile-update', async () => {
      executions += 1;
      await gate;
      return 'done';
    });
    const second = runWithAlarmLease('profile-update', async () => {
      executions += 1;
      return 'duplicate';
    });
    release();
    const [left, right] = await Promise.all([first, second]);
    expect(executions).toBe(1);
    expect(left).toEqual(right);
    expect((await readAlarmLease('profile-update'))?.lastSuccessAt).not.toBeNull();
  });

  it('detects a missing or stale successful run deterministically', () => {
    expect(alarmMissed(null, 1_000, 10_000)).toBe(true);
    expect(
      alarmMissed(
        {
          schemaVersion: '1.0.0',
          alarmName: 'profile-update',
          runId: 'run',
          leaseUntil: null,
          lastAttemptAt: new Date(8_000).toISOString(),
          lastSuccessAt: new Date(8_000).toISOString(),
          failureCount: 0,
          lastError: null,
        },
        1_000,
        10_000
      )
    ).toBe(true);
  });
});
