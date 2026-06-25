import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalize } from '../../src/shared/canonical-json';
import { createEmptyUserProfile } from '../../src/shared/profile-builder';

const created: string[] = [];
afterEach(async () =>
  Promise.all(created.splice(0).map((path) => rm(path, { recursive: true, force: true })))
);

describe('profile signing CLI', () => {
  it('creates a deterministic-shape P-256 envelope that verifies', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rtlx-sign-'));
    created.push(directory);
    const profilePath = join(directory, 'profile.json');
    const keyPath = join(directory, 'private.jwk.json');
    const outputPath = join(directory, 'signed.json');
    const profile = createEmptyUserProfile('example.com');
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ]);
    const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    await writeFile(profilePath, `${JSON.stringify(profile)}\n`);
    await writeFile(keyPath, `${JSON.stringify(privateJwk)}\n`);
    const result = spawnSync(
      process.execPath,
      [
        resolve('scripts/sign-profile.mjs'),
        profilePath,
        keyPath,
        outputPath,
        'test-key',
        '2026-06-14T00:00:00Z',
        '2026-07-14T00:00:00Z',
      ],
      { encoding: 'utf8' }
    );
    expect(result.status, result.stderr).toBe(0);
    const envelope = JSON.parse(await readFile(outputPath, 'utf8')) as {
      payload: typeof profile;
      signature: string;
      schemaVersion: string;
    };
    expect(envelope.schemaVersion).toBe('3.0.0');
    const signature = Uint8Array.from(Buffer.from(envelope.signature, 'base64url'));
    await expect(
      crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        pair.publicKey,
        signature,
        new TextEncoder().encode(canonicalize(envelope.payload as never))
      )
    ).resolves.toBe(true);
  });
});
