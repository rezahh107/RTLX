import { describe, expect, it } from 'vitest';
import { canonicalize } from '../../src/shared/canonical-json';
import { validateProfile, verifyProfileEnvelope } from '../../src/background/profile-verifier';
import type { PublicKeyRegistry, SiteProfile } from '../../src/shared/types';
const profile: SiteProfile = {
  schemaVersion: '3.0.0',
  profileId: 'host:example.com',
  profileVersion: 2,
  profileKind: 'bundled',
  displayName: 'Example',
  match: { hosts: ['example.com'], pathPrefixes: ['/'] },
  selectors: {
    content: ['main'],
    exclude: [],
    code: [],
    math: [],
    editor: [],
    terminal: [],
    mutationSensitive: [],
  },
  rules: [
    {
      ruleId: 'rule-7eb3f78f',
      selector: 'main',
      category: 'content',
      enabled: true,
      directionMode: 'auto-safe',
      alignmentMode: 'start',
      typographyMode: 'persian-only',
      initialDelayMs: 0,
    },
  ],
  scopePolicy: { mode: 'site', pathDepth: 2 },
  features: { direction: true, bidi: true, typography: true, shadowOpen: true },
  thresholds: {},
  metadata: { source: 'official', verification: 'synthetic-fixture', product: 'Example' },
};
async function fixture() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.privateKey,
      new TextEncoder().encode(canonicalize(profile as never))
    )
  );
  const encoded = Buffer.from(signature).toString('base64url');
  const registry: PublicKeyRegistry = {
    schemaVersion: '1.0.0',
    registryVersion: 1,
    verificationState: 'verified',
    keys: [
      {
        keyId: 'test',
        notBefore: '2026-01-01T00:00:00Z',
        notAfter: '2027-01-01T00:00:00Z',
        revoked: false,
        jwk,
      },
    ],
  };
  const envelope = {
    schemaVersion: '3.0.0',
    profileId: profile.profileId,
    profileVersion: 2,
    issuedAt: '2026-06-01T00:00:00Z',
    expiresAt: '2026-07-01T00:00:00Z',
    keyId: 'test',
    algorithm: 'ECDSA-P256-SHA256',
    canonicalization: 'RFC8785',
    payload: profile,
    signature: encoded,
  };
  return { raw: JSON.stringify(envelope), registry };
}
describe('signed profiles', () => {
  it('verifies a valid P-256 JCS envelope', async () => {
    const f = await fixture();
    await expect(
      verifyProfileEnvelope(f.raw, f.registry, new Date('2026-06-14T00:00:00Z'), 1)
    ).resolves.toEqual(profile);
  });
  it('rejects modified payload', async () => {
    const f = await fixture();
    const value = JSON.parse(f.raw);
    value.payload.features.bidi = false;
    await expect(
      verifyProfileEnvelope(JSON.stringify(value), f.registry, new Date('2026-06-14T00:00:00Z'), 1)
    ).rejects.toThrow('Signature invalid');
  });
  it('rejects duplicate JSON keys before verification', async () => {
    const f = await fixture();
    await expect(
      verifyProfileEnvelope(
        '{"schemaVersion":"2.0.0","schemaVersion":"2.0.0"}',
        f.registry,
        new Date(),
        0
      )
    ).rejects.toThrow('Duplicate key');
  });
  it('rejects invalid UTC timestamps before cryptographic verification', async () => {
    const f = await fixture();
    const value = JSON.parse(f.raw);
    value.issuedAt = 'not-a-date';
    await expect(
      verifyProfileEnvelope(JSON.stringify(value), f.registry, new Date('2026-06-14T00:00:00Z'), 1)
    ).rejects.toThrow('Invalid issuedAt timestamp');
  });
  it('rejects unknown envelope fields', async () => {
    const f = await fixture();
    const value = JSON.parse(f.raw);
    value.unexpected = true;
    await expect(
      verifyProfileEnvelope(JSON.stringify(value), f.registry, new Date('2026-06-14T00:00:00Z'), 1)
    ).rejects.toThrow('Envelope schema invalid');
  });
  it('enforces the selector limit across the entire profile', () => {
    const selectors = Array.from({ length: 33 }, (_, index) => `.item-${index}`);
    const invalid: SiteProfile = {
      ...profile,
      selectors: {
        content: selectors,
        exclude: selectors,
        code: selectors,
        math: [],
        editor: [],
        terminal: [],
        mutationSensitive: selectors,
      },
    };
    expect(() => validateProfile(invalid)).toThrow('Too many selectors in profile');
  });
});
