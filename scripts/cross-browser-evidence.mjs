import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outputDir = join(root, 'dist', 'evidence');
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const release = spawnSync(process.execPath, ['scripts/package-release.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, TZ: 'UTC', LC_ALL: 'C' },
});
if (release.status !== 0) process.exit(release.status ?? 1);
await mkdir(outputDir, { recursive: true });
const results = [];
for (const browser of ['chromium', 'edge', 'firefox']) {
  const artifact = join(root, 'dist', 'artifacts', `rtlx-${browser}-${packageJson.version}.zip`);
  const child = spawnSync(process.execPath, ['scripts/browser-manifest-e2e.mjs', browser], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      TZ: 'UTC',
      LC_ALL: 'C',
      ...(browser === 'firefox' ? {} : { RTLX_EXTENSION_ARTIFACT: artifact }),
    },
  });
  const parsed = parseReport(child.stdout);
  const result = {
    browser,
    exitCode: child.status,
    status:
      parsed?.status ??
      (child.status === 0 ? 'pass' : child.status === 2 ? 'insufficient_evidence' : 'failed'),
    report: parsed,
    stderr: child.stderr.trim().slice(-4000),
  };
  results.push(result);
  await writeFile(
    join(outputDir, `manifest-e2e-${browser}.json`),
    JSON.stringify(result, null, 2) + '\n'
  );
}
const status = results.some((item) => item.status === 'failed')
  ? 'failed'
  : results.every((item) => item.status === 'pass')
    ? 'pass'
    : 'insufficient_evidence';
const report = {
  schemaVersion: '1.0.0',
  campaign: 'cross-browser-manifest-e2e',
  status,
  results,
};
await writeFile(
  join(outputDir, 'cross-browser-evidence.json'),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));
process.exitCode = status === 'failed' ? 1 : status === 'insufficient_evidence' ? 2 : 0;

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
