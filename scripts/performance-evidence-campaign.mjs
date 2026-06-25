import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const outputDir = join(root, 'dist/evidence');
await mkdir(outputDir, { recursive: true });
const requestedRuns = Math.max(
  1,
  Math.min(30, Number.parseInt(process.env.RTLX_PERF_RUNS ?? '1', 10) || 1)
);
const certification = process.env.RTLX_PERFORMANCE_CERTIFY === '1';
const browsers = ['chromium', 'edge', 'firefox'];
const results = [];

if (certification) {
  for (const browser of browsers) {
    const runs = [];
    for (let run = 0; run < requestedRuns; run += 1) {
      const child = spawnSync(process.execPath, ['scripts/browser-manifest-e2e.mjs', browser], {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          RTLX_SOAK_ITERATIONS: process.env.RTLX_PERF_ITERATIONS ?? '20',
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
      runs.push({
        run: run + 1,
        status:
          child.status === 0 ? 'passed' : child.status === 2 ? 'insufficient_evidence' : 'failed',
        report: parseReport(child.stdout),
        stderr: child.stderr.trim().slice(-2000),
      });
      if (child.status !== 0) break;
    }
    results.push({ browser, runs });
  }
}

const allRuns = results.flatMap((entry) => entry.runs);
const status = !certification
  ? 'not_run'
  : requestedRuns < 30
    ? 'insufficient_evidence'
    : allRuns.length === 90 && allRuns.every((entry) => entry.status === 'passed')
      ? 'passed'
      : allRuns.some((entry) => entry.status === 'failed')
        ? 'failed'
        : 'insufficient_evidence';
const report = {
  schemaVersion: '1.0.0',
  campaign: 'cross-browser-performance-budget',
  status,
  requestedRuns,
  requiredRunsPerBrowser: 30,
  browsers,
  results,
  limitations:
    status === 'passed'
      ? []
      : [
          'Release acceptance requires 30 cold runs per desktop browser on pinned hardware.',
          'Eight-hour multi-tab soak, retained-heap review, long-task review, and CLS review remain separate gates.',
        ],
};
await writeFile(
  join(outputDir, 'performance-evidence.json'),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));
process.exitCode = status === 'failed' ? 1 : status === 'passed' ? 0 : 2;

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
