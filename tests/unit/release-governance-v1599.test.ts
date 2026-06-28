import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateReleaseEvidence } from '../../scripts/release-evidence-core.mjs';
const root = process.cwd();
describe('RTLX release governance', () => {
  it('uses one release version and contains no stale active workflow version', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    const manifest = JSON.parse(await readFile(join(root, 'manifest.base.json'), 'utf8'));
    const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
    const constants = await readFile(join(root, 'src/shared/constants.ts'), 'utf8');
    expect(manifest.version).toBe(pkg.version);
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[''].version).toBe(pkg.version);
    expect(constants).toContain(`PRODUCT_VERSION = '${pkg.version}'`);
    expect(constants).toContain(`PROCESSOR_VERSION = '${pkg.version}'`);
    for (const file of ['browser-evidence.yml', 'ci.yml', 'release.yml', 'store-staging.yml'])
      expect(await readFile(join(root, '.github/workflows', file), 'utf8')).not.toMatch(
        /15\.\d+\.\d+/u
      );
  });

  it('keeps active checked-in reports aligned with package.json unless explicitly archived', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    for (const file of [
      'reports/validation-summary.json',
      'reports/implementation-report.json',
      'implementation-report.json',
    ]) {
      const report = JSON.parse(await readFile(join(root, file), 'utf8'));
      if (report.reportKind === 'historical_archive') continue;
      expect(report.productVersion).toBe(pkg.version);
      if (report.validation?.productVersion)
        expect(report.validation.productVersion).toBe(pkg.version);
      const artifactRelease =
        report.artifactManifest?.release ?? report.validation?.artifactManifest?.release;
      if (artifactRelease) expect(artifactRelease).toBe(pkg.version);
    }
  });
  it('keeps versioned registry filenames aligned with internal registryVersion', async () => {
    for (const file of (await readdir(join(root, 'registries'))).filter((name) =>
      /\.v\d+\.json$/u.test(name)
    )) {
      const registry = JSON.parse(await readFile(join(root, 'registries', file), 'utf8'));
      if (typeof registry.registryVersion !== 'number') continue;
      expect(file).toContain(`.v${registry.registryVersion}.json`);
    }
  });
  it('release-version validator guards package-lock and active report metadata', async () => {
    const script = await readFile(
      join(root, 'scripts/validate-release-version-consistency.mjs'),
      'utf8'
    );
    expect(script).toContain('package-lock.json');
    expect(script).toContain('packages[""].version');
    expect(script).toContain('reports/validation-summary.json');
    expect(script).toContain('stale_hard_coded_version');
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
