import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageFile = fileURLToPath(new URL('../package.json', import.meta.url));
const root = dirname(packageFile);
const { version } = JSON.parse(await readFile(packageFile, 'utf8'));
const outputDir = join(root, 'dist', 'evidence');
const logDir = process.env.RTLX_DEVELOPMENT_LOG_DIR;
await mkdir(outputDir, { recursive: true });
const required = [
  'format-check',
  'typecheck',
  'eslint',
  'lint-warning-audit',
  'validate-schemas',
  'validate-profiles',
  'test-coverage',
  'adapter-conformance',
  'build',
  'browser-smoke',
  'manifest-validate',
  'firefox-lint',
  'security-scan',
  'audit-production',
  'audit-all',
  'store-readiness',
];
const checks = [];
for (const checkId of required) {
  const exitPath = logDir ? join(logDir, `${checkId}.exit`) : '';
  const logPath = logDir ? join(logDir, `${checkId}.log`) : '';
  if (!logDir || !existsSync(exitPath) || !existsSync(logPath)) {
    checks.push({ checkId, status: 'not_run', exitCode: null, logSha256: null });
    continue;
  }
  const exitCode = Number.parseInt((await readFile(exitPath, 'utf8')).trim(), 10);
  const bytes = await readFile(logPath);
  checks.push({
    checkId,
    status: exitCode === 0 ? 'passed' : 'failed',
    exitCode,
    logSha256: createHash('sha256').update(bytes).digest('hex'),
    logBytes: bytes.byteLength,
  });
}
const status = checks.some((item) => item.status === 'failed')
  ? 'failed'
  : checks.every((item) => item.status === 'passed')
    ? 'passed'
    : 'not_run';
const report = {
  schemaVersion: '1.0.0',
  release: version,
  status,
  executionModel: 'independent_commands_with_recorded_exit_codes',
  aggregateCommand: {
    status: 'not_claimed',
    reason:
      'The long wrapper command exceeded the execution wrapper limit; constituent gates were executed independently.',
  },
  checks,
};
await writeFile(join(outputDir, 'development-checks.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
process.exitCode = status === 'passed' ? 0 : status === 'failed' ? 1 : 2;
