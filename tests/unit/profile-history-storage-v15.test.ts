import { beforeEach, describe, expect, it } from 'vitest';
import {
  historyProfileByHash,
  listProfileHistory,
  snapshotProfile,
} from '../../src/background/profile-history-repository';
import { createEmptyUserProfile } from '../../src/shared/profile-builder';
import type { SiteProfile } from '../../src/shared/types';

const storage: Record<string, unknown> = {};

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key];
  Object.assign(globalThis, {
    chrome: {
      runtime: { lastError: null },
      storage: {
        local: {
          get: (key: string | null, callback: (items: Record<string, unknown>) => void) =>
            callback(key === null ? { ...storage } : key in storage ? { [key]: storage[key] } : {}),
          set: (items: Record<string, unknown>, callback: () => void) => {
            Object.assign(storage, items);
            callback();
          },
          remove: (keys: string | string[], callback: () => void) => {
            for (const key of Array.isArray(keys) ? keys : [keys]) delete storage[key];
            callback();
          },
        },
      },
    },
  });
});

describe('profile history storage v15', () => {
  it('keeps ten unique newest snapshots and retrieves by hash', async () => {
    const base = createEmptyUserProfile('example.com');
    for (let version = 1; version <= 12; version += 1) {
      const profile = Object.freeze({ ...base, profileVersion: version }) as SiteProfile;
      await snapshotProfile('example.com', profile, () => new Date(version * 1000));
    }
    const entries = await listProfileHistory('example.com');
    expect(entries).toHaveLength(10);
    expect(entries[0]?.profileVersion).toBe(12);
    expect(entries.at(-1)?.profileVersion).toBe(3);
    expect(await historyProfileByHash('example.com', entries[0]!.hash)).toEqual(
      entries[0]!.profile
    );
    await expect(historyProfileByHash('example.com', 'bad')).rejects.toThrow(
      'Invalid history hash'
    );
  });

  it('deduplicates identical canonical profile snapshots', async () => {
    const profile = createEmptyUserProfile('example.com');
    await snapshotProfile('example.com', profile, () => new Date(1000));
    await snapshotProfile('example.com', profile, () => new Date(2000));
    expect(await listProfileHistory('example.com')).toHaveLength(1);
  });
});
