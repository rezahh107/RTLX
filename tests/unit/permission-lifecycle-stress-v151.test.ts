import { beforeEach, describe, expect, it } from 'vitest';
import { synchronizeRegisteredContentScript } from '../../src/background/permission-manager';

let origins: string[] = [];
let registered: Array<{ id: string; matches: string[] }> = [];

beforeEach(() => {
  origins = [];
  registered = [];
  Object.assign(globalThis, {
    chrome: {
      runtime: {
        lastError: null,
        getManifest: () => ({ manifest_version: 3 }),
      },
      permissions: {
        getAll: (callback: (value: { origins: string[] }) => void) => callback({ origins }),
      },
      scripting: {
        getRegisteredContentScripts: (
          _filter: unknown,
          callback: (value: typeof registered) => void
        ) => callback([...registered]),
        unregisterContentScripts: (_filter: unknown, callback: () => void) => {
          registered = [];
          callback();
        },
        registerContentScripts: (
          values: Array<{ id: string; matches: string[] }>,
          callback: () => void
        ) => {
          registered = values.map((value) => ({ id: value.id, matches: [...value.matches] }));
          callback();
        },
      },
    },
  });
});

describe('BH-012 permission revoke/restore stress', () => {
  it('completes 20 revoke/restore cycles with at most one registered script', async () => {
    for (let index = 0; index < 20; index += 1) {
      origins = [];
      await synchronizeRegisteredContentScript();
      expect(registered).toHaveLength(0);
      origins = ['https://example.test/*'];
      await synchronizeRegisteredContentScript();
      expect(registered).toHaveLength(1);
      expect(registered[0]?.matches).toEqual(origins);
    }
  });
});
