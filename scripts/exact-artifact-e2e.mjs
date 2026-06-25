import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { redactEvidence, sanitizeProcessOutput } from './evidence-redaction-core.mjs';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const browser = process.argv[2] ?? 'chromium';
if (!['chromium', 'edge', 'firefox'].includes(browser)) {
  throw new Error(`Unsupported exact-artifact E2E target: ${browser}`);
}
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const artifact = join(root, 'dist', 'artifacts', `rtlx-${browser}-${packageJson.version}.zip`);
if (!existsSync(artifact)) {
  const build = spawnSync(process.execPath, ['scripts/package-release.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, TZ: 'UTC', LC_ALL: 'C' },
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
const artifactBytes = await readFile(artifact);
const artifactEvidence = {
  kind: 'release_zip',
  filename: artifact.split(/[\\/]/u).at(-1),
  sha256: createHash('sha256').update(artifactBytes).digest('hex'),
  bytes: artifactBytes.byteLength,
};
const child = spawnSync(process.execPath, ['scripts/browser-manifest-e2e.mjs', browser], {
  cwd: root,
  encoding: 'utf8',
  timeout: 180_000,
  maxBuffer: 4 * 1024 * 1024,
  env: {
    ...process.env,
    TZ: 'UTC',
    LC_ALL: 'C',
    RTLX_EXTENSION_ARTIFACT: artifact,
  },
});
if (child.error && child.error.code !== 'ETIMEDOUT') throw child.error;
const outputDir = join(root, 'dist', 'evidence');
await mkdir(outputDir, { recursive: true });
const parsed = parseReport(child.stdout);
const report = redactEvidence(
  parsed
    ? {
        ...parsed,
        mode: 'manifest-loaded-exact-release-artifact',
        evidence: { artifact: artifactEvidence, ...(parsed.evidence ?? {}) },
      }
    : {
        schemaVersion: '1.0.0',
        browser,
        mode: 'manifest-loaded-exact-release-artifact',
        status: child.status === 2 ? 'insufficient_evidence' : 'failed',
        blockingReasons: [
          child.error?.code === 'ETIMEDOUT'
            ? 'Harness exceeded the 180000ms execution limit'
            : 'Harness did not emit a machine-readable report',
        ],
        evidence: {
          artifact: artifactEvidence,
          stderrTail: sanitizeProcessOutput(child.stderr).tail,
          stderrRedaction: sanitizeProcessOutput(child.stderr),
          stdoutRedaction: sanitizeProcessOutput(child.stdout),
        },
      }
);
await writeFile(
  join(outputDir, `exact-artifact-e2e-${browser}.json`),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));
process.exitCode = child.status ?? 1;

function parseReport(stdout) {
  const text = stdout.trim();
  const start = text.indexOf('{');
  if (start < 0) return null;
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return null;
  }
}
