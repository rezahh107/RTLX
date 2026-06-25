import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';

const [profilePath, privateJwkPath, outputPath, keyId, issuedAt, expiresAt] = process.argv.slice(2);
if (!profilePath || !privateJwkPath || !outputPath || !keyId || !issuedAt || !expiresAt) {
  throw new Error(
    'Usage: npm run profile:sign -- <profile.json> <private-jwk.json> <output.json> <key-id> <issued-at-UTC> <expires-at-UTC>'
  );
}
const profile = JSON.parse(await readFile(resolve(profilePath), 'utf8'));
if (
  profile.schemaVersion !== '3.0.0' ||
  typeof profile.profileId !== 'string' ||
  !Number.isInteger(profile.profileVersion)
)
  throw new Error('Only Site Profile v3 may be signed');
for (const [name, value] of [
  ['issuedAt', issuedAt],
  ['expiresAt', expiresAt],
]) {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value) ||
    Number.isNaN(Date.parse(value))
  )
    throw new Error(`${name} must be an explicit UTC timestamp`);
}
if (Date.parse(expiresAt) <= Date.parse(issuedAt))
  throw new Error('expiresAt must follow issuedAt');
const jwk = JSON.parse(await readFile(resolve(privateJwkPath), 'utf8'));
const key = await webcrypto.subtle.importKey(
  'jwk',
  jwk,
  { name: 'ECDSA', namedCurve: 'P-256' },
  false,
  ['sign']
);
const canonicalPayload = canonicalize(profile);
const signature = new Uint8Array(
  await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(canonicalPayload)
  )
);
if (signature.byteLength !== 64) throw new Error('Unexpected ECDSA signature format');
const envelope = {
  schemaVersion: '3.0.0',
  profileId: profile.profileId,
  profileVersion: profile.profileVersion,
  issuedAt,
  expiresAt,
  keyId,
  algorithm: 'ECDSA-P256-SHA256',
  canonicalization: 'RFC8785',
  payload: profile,
  signature: Buffer.from(signature).toString('base64url'),
};
await writeFile(resolve(outputPath), `${canonicalize(envelope)}\n`, { mode: 0o600 });
console.log(`signed profile: ${outputPath}`);

function canonicalize(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite JSON number');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value !== 'object') throw new TypeError('Unsupported JSON value');
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
    .join(',')}}`;
}
