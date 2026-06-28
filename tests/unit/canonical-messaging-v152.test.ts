import { beforeEach, describe, expect, it } from 'vitest';
import { PRODUCT_VERSION } from '../../src/shared/constants';
import { canonicalByteLength, toCanonicalJson } from '../../src/shared/canonical-json';
import {
  configureMessageRuntimeEpoch,
  createContentCommand,
  isCommandForCurrentDocument,
  isRuntimeEpochRebindForCurrentDocument,
  isRequestMessage,
  message,
  resetMessageContextForTests,
} from '../../src/shared/messages';

beforeEach(() => resetMessageContextForTests());

describe('RH-008/RH-010 canonical message DTOs', () => {
  it('rejects values with undefined, non-finite numbers, and non-plain objects', () => {
    expect(() => toCanonicalJson({ value: undefined })).toThrow('undefined');
    expect(() => toCanonicalJson({ value: Number.NaN })).toThrow('non-finite');
    expect(() => toCanonicalJson(new Map())).toThrow('plain object');
  });

  it('adds a versioned metadata envelope and stays within deterministic JSON', () => {
    const value = message('REQUEST_CONTEXT', { hostname: 'example.com', pathname: '/' });
    expect(isRequestMessage(value)).toBe(true);
    expect(value.meta).toMatchObject({
      protocolVersion: '1.0.0',
      extensionVersion: PRODUCT_VERSION,
      runtimeEpoch: null,
    });
    expect(canonicalByteLength(value)).toBeGreaterThan(0);
  });

  it('keeps optional site data canonical across Firefox and Chromium transports', () => {
    const optionalSite = (site: unknown): Record<string, unknown> =>
      site === undefined ? {} : { site };
    const withoutSite = {
      requestId: crypto.randomUUID(),
      success: true as const,
      data: {
        global: { enabled: true },
        ...optionalSite(undefined),
      },
    };
    const withSite = {
      requestId: crypto.randomUUID(),
      success: true as const,
      data: {
        global: { enabled: true },
        site: { siteMode: 'auto-safe' },
      },
    };

    const firefoxWithoutSite = structuredClone(withoutSite);
    const chromiumWithoutSite = JSON.parse(JSON.stringify(withoutSite)) as unknown;
    expect(Object.hasOwn(firefoxWithoutSite.data, 'site')).toBe(false);
    expect(() => toCanonicalJson(firefoxWithoutSite)).not.toThrow();
    expect(() => toCanonicalJson(chromiumWithoutSite)).not.toThrow();

    const firefoxWithSite = structuredClone(withSite);
    const chromiumWithSite = JSON.parse(JSON.stringify(withSite)) as typeof withSite;
    expect(firefoxWithSite.data.site).toEqual(withSite.data.site);
    expect(chromiumWithSite.data.site).toEqual(withSite.data.site);
    expect(() => toCanonicalJson(firefoxWithSite)).not.toThrow();
    expect(() => toCanonicalJson(chromiumWithSite)).not.toThrow();
  });

  it('rejects stale or wrongly targeted commands', () => {
    const epoch = crypto.randomUUID();
    configureMessageRuntimeEpoch(epoch);
    const accepted = createContentCommand({ type: 'RTLX_PING' }, epoch, null);
    expect(isCommandForCurrentDocument(accepted)).toBe(true);
    const stale = createContentCommand({ type: 'RTLX_PING' }, crypto.randomUUID(), null);
    expect(isCommandForCurrentDocument(stale)).toBe(false);
    const wrongTarget = createContentCommand(
      { type: 'RTLX_PING' },
      epoch,
      '123e4567-e89b-42d3-a456-426614174099'
    );
    expect(isCommandForCurrentDocument(wrongTarget)).toBe(false);
    const rebound = createContentCommand(
      { type: 'RTLX_REBIND_RUNTIME_EPOCH' },
      crypto.randomUUID(),
      null
    );
    expect(isCommandForCurrentDocument(rebound)).toBe(false);
    expect(isRuntimeEpochRebindForCurrentDocument(rebound)).toBe(true);
  });
});
