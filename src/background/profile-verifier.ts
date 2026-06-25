import { canonicalize, type CanonicalJson } from '../shared/canonical-json';
import { LIMITS } from '../shared/constants';
import { normalizeProfile, validateProfile } from '../shared/profile-schema';
import { isRecord } from '../shared/settings';
import { parseStrictJson } from '../shared/strict-json';
import type { PublicKeyRegistry, SignedProfileEnvelope, SiteProfile } from '../shared/types';

const ENVELOPE_KEYS = Object.freeze([
  'algorithm',
  'canonicalization',
  'expiresAt',
  'issuedAt',
  'keyId',
  'payload',
  'profileId',
  'profileVersion',
  'schemaVersion',
  'signature',
]);

export async function verifyProfileEnvelope(
  raw: string,
  keys: PublicKeyRegistry,
  now: Date,
  lastVersion: number
): Promise<SiteProfile> {
  if (new TextEncoder().encode(raw).byteLength > LIMITS.maxRemoteProfileBytes)
    throw new Error('Envelope exceeds byte-size limit');
  const value = parseStrictJson(raw);
  if (!isEnvelope(value)) throw new Error('Envelope schema invalid');

  const issuedAt = parseUtcTimestamp(value.issuedAt, 'issuedAt');
  const expiresAt = parseUtcTimestamp(value.expiresAt, 'expiresAt');
  if (issuedAt.getTime() > now.getTime() + 5 * 60_000) throw new Error('issuedAt is in the future');
  if (expiresAt.getTime() <= now.getTime()) throw new Error('Envelope expired');
  if (expiresAt.getTime() <= issuedAt.getTime()) throw new Error('Envelope interval invalid');

  const key = keys.keys.find((candidate) => candidate.keyId === value.keyId && !candidate.revoked);
  if (!key) throw new Error('Unknown or revoked key');
  const keyNotBefore = parseUtcTimestamp(key.notBefore, 'key.notBefore');
  const keyNotAfter = parseUtcTimestamp(key.notAfter, 'key.notAfter');
  if (now < keyNotBefore || now > keyNotAfter) throw new Error('Key outside validity window');

  const profile = normalizeProfile(value.payload);
  validateProfile(profile);
  if (value.profileId !== profile.profileId || value.profileVersion !== profile.profileVersion)
    throw new Error('Envelope and payload identity mismatch');
  if (value.profileVersion <= lastVersion) throw new Error('Profile anti-rollback check failed');

  const bytes = new TextEncoder().encode(canonicalize(profile as unknown as CanonicalJson));
  const signature = base64UrlDecode(value.signature);
  if (signature.byteLength !== 64) throw new Error('ECDSA signature length invalid');
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    key.jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
  const verified = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    signature,
    bytes
  );
  if (!verified) throw new Error('Signature invalid');
  return profile;
}

export { validateProfile } from '../shared/profile-schema';

function isEnvelope(value: unknown): value is SignedProfileEnvelope {
  if (!isRecord(value) || !hasExactKeys(value, ENVELOPE_KEYS)) return false;
  return (
    value.schemaVersion === '3.0.0' &&
    typeof value.profileId === 'string' &&
    value.profileId.length > 0 &&
    Number.isInteger(value.profileVersion) &&
    Number(value.profileVersion) >= 1 &&
    typeof value.issuedAt === 'string' &&
    typeof value.expiresAt === 'string' &&
    typeof value.keyId === 'string' &&
    value.keyId.length > 0 &&
    value.algorithm === 'ECDSA-P256-SHA256' &&
    value.canonicalization === 'RFC8785' &&
    isRecord(value.payload) &&
    typeof value.signature === 'string' &&
    /^[A-Za-z0-9_-]+$/u.test(value.signature)
  );
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function parseUtcTimestamp(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value))
    throw new Error(`Invalid ${field} timestamp`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${field} timestamp`);
  return date;
}

function base64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Invalid base64url signature');
  const normalized = value
    .replace(/-/gu, '+')
    .replace(/_/gu, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  try {
    const decoded = atob(normalized);
    return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  } catch {
    throw new Error('Invalid base64url signature');
  }
}
