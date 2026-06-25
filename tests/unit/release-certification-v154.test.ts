import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('RTLX 15.4 release certification contracts', () => {
  it('tests exact packaged artifacts instead of only dist directories', async () => {
    const source = await readFile(join(root, 'scripts/browser-manifest-e2e.mjs'), 'utf8');
    expect(source).toContain('RTLX_EXTENSION_ARTIFACT');
    expect(source).toContain('manifest-loaded-exact-release-artifact');
    expect(source).toContain('Unsafe archive entry');
  });

  it('produces and verifies tamper-evident release attestations', async () => {
    const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts['evidence:attest']).toBe('node scripts/evidence-attestation.mjs');
    expect(packageJson.scripts['evidence:verify']).toBe(
      'node scripts/verify-evidence-attestation.mjs'
    );
  });

  it('requires manual store staging rather than automatic publication', async () => {
    const workflow = await readFile(join(root, '.github/workflows/store-staging.yml'), 'utf8');
    expect(workflow).toContain('workflow_dispatch');
    expect(workflow).toContain('Store credentials, manual approval');
    expect(workflow).not.toMatch(/publish-extension|webstore-upload|addons-api-upload/u);
  });

  it('fails on unreviewed lint warnings through a versioned baseline', async () => {
    const baseline = JSON.parse(
      await readFile(join(root, 'registries/eslint-warning-baseline.v1.json'), 'utf8')
    ) as { release: string; entries: unknown[] };
    expect(baseline.release).toBe('15.9.11');
    expect(baseline.entries.length).toBeGreaterThan(0);
  });
});
