import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendDiagnostics,
  clearMemoryDiagnostics,
  exportDiagnostics,
} from '../../src/background/diagnostics-store';
import { createDiagnostic } from '../../src/shared/diagnostics';

const local: Record<string, unknown> = {};
const session: Record<string, unknown> = {};

beforeEach(() => {
  clearMemoryDiagnostics();
  for (const store of [local, session]) {
    for (const key of Object.keys(store)) delete store[key];
  }
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
      storage: { local: area(local), session: area(session) },
    },
  });
});

describe('BH-009 diagnostic persistence hardening', () => {
  it('deduplicates stable diagnostics and accumulates occurrences', async () => {
    const clock = { now: () => new Date('2026-06-15T00:00:00.000Z') };
    const diagnostic = createDiagnostic(
      'RTLX-DIR-001',
      'warning',
      'DIRECTION-001',
      'frame',
      { count: 1 },
      clock
    );
    await appendDiagnostics([diagnostic, diagnostic], false, 'untrusted-content');
    const exported = await exportDiagnostics(false);
    expect(exported).toHaveLength(1);
    expect(exported[0]?.details.occurrences).toBe(2);
  });

  it('persists a deduplicated transaction-safe collection', async () => {
    const diagnostic = createDiagnostic(
      'RTLX-PROFILE-001',
      'info',
      'REMOTE-PROFILE-001',
      'extension',
      { count: 1 }
    );
    await appendDiagnostics([diagnostic], true);
    clearMemoryDiagnostics();
    const exported = await exportDiagnostics(true);
    expect(exported).toHaveLength(1);
    expect(Object.keys(session).some((key) => key.startsWith('rtlx:storage-transaction'))).toBe(
      false
    );
  });
});
