import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/shared/settings';
import { exportPersonalBackup, importPersonalBackup } from '../../src/background/personal-backup';
import {
  resetPackageIntegrityForTests,
  verifyCriticalPackageFiles,
} from '../../src/background/package-integrity';
import { resetStorageTransactionQueueForTests } from '../../src/background/storage-transaction';

const local: Record<string, unknown> = {};
const sync: Record<string, unknown> = {};
const session: Record<string, unknown> = {};

beforeEach(() => {
  resetPackageIntegrityForTests();
  resetStorageTransactionQueueForTests();
  for (const store of [local, sync, session])
    for (const key of Object.keys(store)) delete store[key];
  sync['rtlx:settings'] = DEFAULT_SETTINGS;
  sync['rtlx:site:example.com'] = { siteMode: 'auto-safe' };
  const area = (store: Record<string, unknown>) => ({
    get: (key: string | string[] | null, callback: (items: Record<string, unknown>) => void) => {
      if (key === null) return callback({ ...store });
      if (Array.isArray(key))
        return callback(
          Object.fromEntries(key.filter((item) => item in store).map((item) => [item, store[item]]))
        );
      callback(key in store ? { [key]: store[key] } : {});
    },
    set: (items: Record<string, unknown>, callback: () => void) => {
      Object.assign(store, items);
      callback();
    },
    remove: (keys: string | string[], callback: () => void) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete store[key];
      callback();
    },
    getBytesInUse: (_keys: null, callback: (bytes: number) => void) =>
      callback(Buffer.byteLength(JSON.stringify(store))),
  });
  Object.assign(globalThis, {
    chrome: {
      runtime: {
        id: 'hilpenggipeilpdadnfdaokfocfpapjd',
        lastError: null,
        getURL: (path: string) => `chrome-extension://id/${path}`,
      },
      permissions: {
        getAll: (callback: (value: chrome.permissions.Permissions) => void) =>
          callback({ permissions: ['storage'], origins: ['https://example.com/*'] }),
      },
      storage: {
        local: area(local),
        sync: area(sync),
        session: area(session),
      },
    },
  });
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('not built in unit test')));
});

describe('PIH-001 stable unpacked identity', () => {
  it('derives the frozen Chromium and Edge extension ID from the public key', async () => {
    const registry = JSON.parse(
      await readFile(join(process.cwd(), 'registries/personal-install.v1.json'), 'utf8')
    ) as { chromiumPublicKey: string; chromiumExtensionId: string; edgeExtensionId: string };
    const digest = createHash('sha256')
      .update(Buffer.from(registry.chromiumPublicKey, 'base64'))
      .digest()
      .subarray(0, 16);
    const id = [...digest]
      .map((byte) => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15)))
      .join('');
    expect(id).toBe('hilpenggipeilpdadnfdaokfocfpapjd');
    expect(registry.chromiumExtensionId).toBe(id);
    expect(registry.edgeExtensionId).toBe(id);
  });
});

describe('PIH-002 complete personal backup', () => {
  it('exports a checksummed backup and restores managed settings after dry-run', async () => {
    const backup = await exportPersonalBackup(false);
    const parsed = JSON.parse(backup) as {
      data: { sync: Record<string, unknown> };
      diagnostics?: unknown;
      integrity: { canonicalHash: string };
    };
    expect(parsed.data.sync['rtlx:settings']).toEqual(DEFAULT_SETTINGS);
    expect(parsed.data.sync['rtlx:site:example.com']).toEqual({ siteMode: 'auto-safe' });
    expect(parsed).not.toHaveProperty('diagnostics');
    expect(parsed.integrity.canonicalHash).toMatch(/^[a-f0-9]{64}$/u);

    sync['rtlx:site:remove.example'] = { siteMode: 'disabled' };
    const preview = await importPersonalBackup(backup, true);
    expect(preview.applied).toBe(false);
    expect(preview.removedSyncItems).toBe(1);
    expect(sync).toHaveProperty('rtlx:site:remove.example');

    const applied = await importPersonalBackup(backup, false);
    expect(applied.applied).toBe(true);
    expect(sync).not.toHaveProperty('rtlx:site:remove.example');
    expect(applied.warnings).toContain('permissions_require_explicit_regrant');
    expect(applied.warnings).toContain('safe_mode_state_not_restored');
  });
});

describe('PIH-005 critical package consistency', () => {
  it('verifies every critical file against the generated package manifest', async () => {
    const content = new TextEncoder().encode('critical-content');
    const hash = createHash('sha256').update(content).digest('hex');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('package-integrity.json'))
          return new Response(
            JSON.stringify({
              schemaVersion: '1.0.0',
              productVersion: '15.9.12',
              target: 'chromium',
              files: { 'background.js': { sha256: hash, bytes: content.byteLength } },
            })
          );
        return new Response(content);
      })
    );
    resetPackageIntegrityForTests();
    expect((await verifyCriticalPackageFiles({ force: true })).status).toBe('verified');
  });
});

describe('PIH-003 atomic local updater', () => {
  it('keeps fixed-directory replacement and integrity verification explicit', async () => {
    const source = await readFile(join(process.cwd(), 'scripts/install-personal.mjs'), 'utf8');
    expect(source).toContain('Package integrity mismatch');
    expect(source).toContain('previousDirectory');
    expect(source).toContain('rename(temporary, installDirectory)');
  });
});
