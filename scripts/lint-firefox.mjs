import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const reportDir = join(root, 'dist/reports');
await mkdir(reportDir, { recursive: true });
const targets = ['firefox', 'firefox-android'];
const results = [];
for (const target of targets) {
  const outputPath = join(reportDir, `web-ext-lint-${target}.json`);
  const result = spawnSync(
    join(root, 'node_modules/.bin/web-ext'),
    ['lint', '--source-dir', `dist/${target}`, '--output', 'json', '--boring'],
    { cwd: root, encoding: 'utf8', env: { ...process.env, TZ: 'UTC', LC_ALL: 'C' } }
  );
  await writeFile(outputPath, result.stdout || '{}');
  if (result.error) throw result.error;
  const report = JSON.parse(await readFile(outputPath, 'utf8'));
  const errors = report.errors ?? [];
  const warnings = report.warnings ?? [];
  const allowed =
    target === 'firefox' ? new Set(['KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION']) : new Set();
  const unexpected = warnings.filter((warning) => !allowed.has(warning.code));
  results.push({ target, errors: errors.length, warnings: warnings.length, unexpected });
  if (errors.length > 0 || unexpected.length > 0 || result.status !== 0) {
    console.error(JSON.stringify({ target, errors, unexpectedWarnings: unexpected }, null, 2));
    process.exit(1);
  }
}
await writeFile(
  join(reportDir, 'web-ext-lint-summary.json'),
  JSON.stringify({ schemaVersion: '1.0.0', results }, null, 2) + '\n'
);
console.log(
  `web-ext lint passed: ${results.map((entry) => `${entry.target}=${entry.errors} errors/${entry.warnings} warnings`).join(', ')}`
);
