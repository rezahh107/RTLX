import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { hashTree, walkFiles } from '../../scripts/evidence-attestation-core.mjs';
const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});
describe('RTLX 15.9.11 attestation traversal', () => {
  it('hashes only sorted regular files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rtlx-attest-'));
    cleanup.push(root);
    await mkdir(join(root, 'b'));
    await writeFile(join(root, 'b', 'z.txt'), 'z');
    await writeFile(join(root, 'a.txt'), 'a');
    expect((await walkFiles(root)).map((file: string) => file.slice(root.length + 1))).toEqual([
      'a.txt',
      'b/z.txt',
    ]);
    expect((await hashTree(root, new Set())).files).toBe(2);
  });
  it('rejects symbolic links deterministically', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rtlx-attest-'));
    cleanup.push(root);
    await writeFile(join(root, 'a'), 'a');
    await symlink(join(root, 'a'), join(root, 'link'));
    await expect(walkFiles(root)).rejects.toThrow('RTLX-ATTEST-001');
  });
});
