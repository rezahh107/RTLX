import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createReleaseManifest,
  verifyReleaseManifest,
} from '../../scripts/release-integrity-core.mjs';

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'rtlx-integrity-'));
  cleanup.push(root);
  await writeFile(join(root, 'a.zip'), Buffer.from('alpha'));
  await writeFile(join(root, 'b.json'), Buffer.from('{"ok":true}\n'));
  return root;
}

describe('v15.9.11 release integrity contract', () => {
  it('creates and verifies a deterministic sorted SHA-256 manifest', async () => {
    const root = await fixture();
    const manifest = await createReleaseManifest(root, ['b.json', 'a.zip'], { release: '15.9.11' });
    expect(manifest.files.map((record) => record.path)).toEqual(['a.zip', 'b.json']);
    await expect(verifyReleaseManifest({ manifest, root })).resolves.toEqual({
      status: 'passed',
      verifiedFiles: 2,
    });
  });

  it('rejects a one-byte mutation', async () => {
    const root = await fixture();
    const manifest = await createReleaseManifest(root, ['a.zip', 'b.json']);
    const original = await readFile(join(root, 'a.zip'));
    const mutated = Buffer.from(original);
    mutated[0] = (mutated[0] ?? 0) ^ 1;
    await writeFile(join(root, 'a.zip'), mutated);
    await expect(verifyReleaseManifest({ manifest, root })).rejects.toThrow('SHA-256 mismatch');
  });

  it('rejects missing, duplicate, and unmanifested files', async () => {
    const root = await fixture();
    const manifest = await createReleaseManifest(root, ['a.zip']);
    await expect(verifyReleaseManifest({ manifest, root })).rejects.toThrow('Unmanifested files');
    const duplicate = { ...manifest, files: [...manifest.files, ...manifest.files] };
    await expect(
      verifyReleaseManifest({ manifest: duplicate, root, ignoreFiles: ['b.json'] })
    ).rejects.toThrow('Duplicate manifest path');
    await rm(join(root, 'a.zip'));
    await expect(
      verifyReleaseManifest({ manifest, root, ignoreFiles: ['b.json'] })
    ).rejects.toThrow('Missing manifest file');
  });
});
