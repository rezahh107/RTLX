import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const outputDir = join(root, 'dist', 'evidence');
await mkdir(outputDir, { recursive: true });
const results = [];
for (const browser of ['chromium', 'edge', 'firefox']) {
  const child = spawnSync(process.execPath, ['scripts/browser-manifest-e2e.mjs', browser], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      TZ: 'UTC',
      LC_ALL: 'C',
      ...(browser === 'firefox'
        ? {}
        : {
            RTLX_EXTENSION_ARTIFACT: join(
              root,
              'dist',
              'artifacts',
              `rtlx-${browser}-${packageJson.version}.zip`
            ),
          }),
    },
  });
  const source = parseReport(child.stdout);
  let status = source?.status ?? (child.status === 2 ? 'insufficient_evidence' : 'failed');
  let verification = 'not_observed';
  if (source?.status === 'pass' && source?.evidence?.serviceWorkerRestart === 'pass') {
    status = 'pass';
    verification = 'service_worker_target_terminated_and_restarted';
  } else if (browser === 'firefox') {
    status = 'insufficient_evidence';
    verification = 'about_crashextensions_or_webdriver_environment_required';
  }
  results.push({ browser, status, verification, source, stderr: child.stderr.trim().slice(-4000) });
}
const status = results.some((item) => item.status === 'failed')
  ? 'failed'
  : results.every((item) => item.status === 'pass')
    ? 'pass'
    : 'insufficient_evidence';
const report = {
  schemaVersion: '1.0.0',
  campaign: 'browser-extension-crash-recovery',
  scope: 'worker_termination_plus_environment_specific_crash_hooks',
  status,
  note: 'A service-worker target restart is not equivalent to a full browser or renderer crash.',
  results,
};
await writeFile(
  join(outputDir, 'browser-crash-campaign.json'),
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
