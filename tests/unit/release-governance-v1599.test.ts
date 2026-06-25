import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateReleaseEvidence } from '../../scripts/release-evidence-core.mjs';
const root = process.cwd();
describe('RTLX 15.9.11 release governance', () => {
  it('uses one release version and contains no stale active workflow version', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    const manifest = JSON.parse(await readFile(join(root, 'manifest.base.json'), 'utf8'));
    expect(pkg.version).toBe('15.9.11');
    expect(manifest.version).toBe(pkg.version);
    for (const file of ['browser-evidence.yml', 'ci.yml', 'release.yml', 'store-staging.yml'])
      expect(await readFile(join(root, '.github/workflows', file), 'utf8')).not.toMatch(
        /15\.\d+\.\d+/u
      );
  });
  it('does not certify blocked evidence', () => {
    expect(evaluateReleaseEvidence([{ status: 'passed' }, { status: 'blocked' }])).toEqual({
      status: 'blocked',
      productionReady: false,
      exitCode: 2,
    });
  });
  it('pins every external workflow action to a full SHA', async () => {
    for (const file of ['browser-evidence.yml', 'ci.yml', 'release.yml', 'store-staging.yml']) {
      const text = await readFile(join(root, '.github/workflows', file), 'utf8');
      for (const match of text.matchAll(/uses:\s*([^\s#]+)/gu)) {
        const ref = match[1];
        expect(ref).toBeDefined();
        if (!ref || ref.startsWith('./')) continue;
        expect(ref.split('@').at(-1)).toMatch(/^[a-f0-9]{40}$/u);
      }
    }
  });
});
