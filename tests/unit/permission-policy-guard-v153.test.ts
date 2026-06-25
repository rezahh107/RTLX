import { beforeEach, describe, expect, it } from 'vitest';
import {
  canRequestPermission,
  readPermissionDenials,
  recordPermissionDecision,
  resetPermissionPolicyGuardForTests,
} from '../../src/background/permission-policy-guard';

const local: Record<string, unknown> = {};

beforeEach(() => {
  resetPermissionPolicyGuardForTests();
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

describe('OU-009 enterprise permission denial guard', () => {
  it('prevents prompt loops during the versioned cooldown', async () => {
    const now = Date.now();
    await recordPermissionDecision('contextMenus', false);
    expect(await canRequestPermission('contextMenus', now + 1_000)).toBe(false);
    expect(await readPermissionDenials()).toHaveLength(1);
  });

  it('clears a prior denial after an explicit granted decision', async () => {
    await recordPermissionDecision('contextMenus', false);
    await recordPermissionDecision('contextMenus', true);
    expect(await canRequestPermission('contextMenus')).toBe(true);
    expect(await readPermissionDenials()).toEqual([]);
  });
});
