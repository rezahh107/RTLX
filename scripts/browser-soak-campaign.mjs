import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const outputDir = join(root, 'dist', 'evidence');
await mkdir(outputDir, { recursive: true });
const iterations = clamp(
  Number.parseInt(process.env.RTLX_SOAK_ITERATIONS ?? '100', 10) || 100,
  20,
  10_000
);
const browser = process.env.RTLX_SOAK_BROWSER ?? 'chromium';
const budgets = JSON.parse(
  await readFile(join(root, 'registries/performance-budgets.v2.json'), 'utf8')
);
const child = spawnSync(process.execPath, ['scripts/browser-manifest-e2e.mjs', browser], {
  cwd: root,
  encoding: 'utf8',
  env: {
    ...process.env,
    RTLX_SOAK_ITERATIONS: String(iterations),
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
const soak = source?.evidence?.soak ?? null;
const observations = soak
  ? {
      heapBudgetObserved:
        soak.heapUsedDelta <= budgets.budgets.memoryGrowthAfter20SpaCyclesMbMax * 1024 * 1024,
      longTaskBudgetObserved: soak.longTaskCount <= budgets.budgets.longTasksOver50Ms,
      clsBudgetObserved: soak.cls <= budgets.budgets.inducedClsP95Max,
      listenerGrowthObserved: soak.listenerDelta,
      nodeGrowthObserved: soak.nodeDelta,
    }
  : null;
const functionalStatus =
  source?.status ?? (child.status === 2 ? 'insufficient_evidence' : 'failed');
const report = {
  schemaVersion: '1.0.0',
  campaign: 'browser-soak',
  browser,
  iterations,
  status: functionalStatus === 'failed' ? 'failed' : 'insufficient_evidence',
  functionalStatus,
  observations,
  source,
  limitations: [
    'This automated run is a bounded single-browser SPA cycle campaign, not the required eight-hour multi-tab certification.',
    'Observed threshold checks do not establish release acceptance without the full cross-browser run matrix.',
  ],
  stderr: child.stderr.trim().slice(-4000),
};
await writeFile(
  join(outputDir, 'browser-soak-campaign.json'),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.status === 'failed' ? 1 : 2;

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
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
