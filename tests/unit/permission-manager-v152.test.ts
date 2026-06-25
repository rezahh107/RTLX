import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetContentScriptReconciliationForTests,
  synchronizeRegisteredContentScript,
} from '../../src/background/permission-manager';

let origins: string[];
let registered: chrome.scripting.RegisteredContentScript[];
let registerCalls: chrome.scripting.RegisteredContentScript[][];
let updateCalls: chrome.scripting.RegisteredContentScript[][];
let unregisterCalls: number;
let rejectMatchOriginFallback: boolean;

beforeEach(() => {
  origins = ['https://example.test/*'];
  registered = [];
  registerCalls = [];
  updateCalls = [];
  unregisterCalls = 0;
  rejectMatchOriginFallback = false;
  resetContentScriptReconciliationForTests();
  Object.assign(globalThis, {
    chrome: {
      runtime: { lastError: null },
      permissions: {
        getAll: (callback: (value: chrome.permissions.Permissions) => void) =>
          callback({ origins: [...origins] }),
      },
      scripting: {
        getRegisteredContentScripts: (
          _filter: unknown,
          callback: (value: chrome.scripting.RegisteredContentScript[]) => void
        ) => callback(registered.map((value) => ({ ...value }))),
        registerContentScripts: (
          values: chrome.scripting.RegisteredContentScript[],
          callback: () => void
        ) => {
          registerCalls.push(values.map((value) => ({ ...value })));
          if (rejectMatchOriginFallback && values[0]?.matchOriginAsFallback) {
            throw new Error('matchOriginAsFallback unsupported');
          }
          registered = values.map((value) => ({ ...value }));
          callback();
        },
        updateContentScripts: (
          values: chrome.scripting.RegisteredContentScript[],
          callback: () => void
        ) => {
          updateCalls.push(values.map((value) => ({ ...value })));
          registered = values.map((value) => ({ ...value }));
          callback();
        },
        unregisterContentScripts: (_filter: unknown, callback: () => void) => {
          unregisterCalls += 1;
          registered = [];
          callback();
        },
      },
    },
  });
});

describe('RH-002/RH-003 atomic content-script reconciliation', () => {
  it('supersedes stale generations and performs one final registration', async () => {
    const results = await Promise.all([
      synchronizeRegisteredContentScript(),
      synchronizeRegisteredContentScript(),
      synchronizeRegisteredContentScript(),
    ]);
    expect(results.map((result) => result.status)).toEqual([
      'superseded',
      'superseded',
      'registered',
    ]);
    expect(registerCalls).toHaveLength(1);
    expect(registered).toHaveLength(1);
    expect(unregisterCalls).toBe(0);
  });

  it('updates in place without creating an unregister gap', async () => {
    registered = [
      {
        id: 'rtlx-v15-persistent',
        matches: ['https://old.test/*'],
        js: ['content.js'],
        allFrames: true,
        runAt: 'document_idle',
        persistAcrossSessions: true,
        matchOriginAsFallback: true,
        world: 'ISOLATED',
      },
    ];
    await expect(synchronizeRegisteredContentScript()).resolves.toMatchObject({
      status: 'updated',
    });
    expect(updateCalls).toHaveLength(1);
    expect(unregisterCalls).toBe(0);
    expect(registered[0]?.matches).toEqual(['https://example.test/*']);
  });

  it('uses the capability fallback when matchOriginAsFallback is rejected', async () => {
    rejectMatchOriginFallback = true;
    await expect(synchronizeRegisteredContentScript()).resolves.toMatchObject({
      status: 'registered',
      fallback: true,
    });
    expect(registerCalls).toHaveLength(2);
    expect(registered[0]?.matchOriginAsFallback).toBe(false);
  });
});
