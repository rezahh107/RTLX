import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const baseline = JSON.parse(
  await readFile(join(root, 'registries/eslint-warning-baseline.v1.json'), 'utf8')
);
const eslintExecutable = join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'eslint.cmd' : 'eslint'
);
const run = spawnSync(eslintExecutable, ['.', '-f', 'json'], {
  cwd: root,
  encoding: 'utf8',
  shell: false,
  timeout: 120_000,
  maxBuffer: 10 * 1024 * 1024,
});
if (run.error) throw run.error;
if (run.status !== 0 && run.status !== 1)
  throw new Error(`ESLint warning audit failed with exit ${String(run.status)}: ${run.stderr}`);
const parsed = JSON.parse(run.stdout || '[]');
const current = [];
for (const file of parsed) {
  const rel = relative(root, file.filePath).replaceAll('\\', '/');
  for (const message of file.messages) {
    if (message.severity !== 1) continue;
    current.push({
      file: rel,
      line: message.line ?? 0,
      column: message.column ?? 0,
      ruleId: message.ruleId ?? 'unknown',
    });
  }
}
const key = (item) => `${item.file}:${item.line}:${item.column}:${item.ruleId}`;
const allowed = new Set(baseline.entries.map(key));
const unreviewed = current.filter((item) => !allowed.has(key(item)));
const stale = baseline.entries.filter(
  (item) => !current.some((candidate) => key(candidate) === key(item))
);
const report = {
  schemaVersion: '1.0.0',
  status: unreviewed.length === 0 ? 'passed' : 'failed',
  warningCount: current.length,
  reviewedWarningCount: current.length - unreviewed.length,
  unreviewed,
  staleBaselineEntries: stale.map(({ file, line, column, ruleId }) => ({
    file,
    line,
    column,
    ruleId,
  })),
};
await mkdir(join(root, 'dist', 'evidence'), { recursive: true });
await writeFile(
  join(root, 'dist', 'evidence', 'eslint-warning-audit.json'),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'passed') process.exitCode = 1;
