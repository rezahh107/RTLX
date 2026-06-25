import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const registry = JSON.parse(
  await readFile(join(root, 'registries/personal-install.v1.json'), 'utf8')
);
if (registry.schemaVersion !== '1.0.0')
  throw new Error('Personal install registry version mismatch');
const publicKey = Buffer.from(registry.chromiumPublicKey, 'base64');
if (publicKey.byteLength < 128) throw new Error('Chromium public key invalid');
const digest = createHash('sha256').update(publicKey).digest().subarray(0, 16);
const extensionId = [...digest]
  .map((byte) => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15)))
  .join('');
if (extensionId !== registry.chromiumExtensionId || extensionId !== registry.edgeExtensionId)
  throw new Error('Stable extension ID fixture mismatch');
console.log(`personal install identity verified: ${extensionId}`);
