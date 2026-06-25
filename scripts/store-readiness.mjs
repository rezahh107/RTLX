import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const requiredFiles = [
  'store/disclosure-en.md',
  'store/disclosure-fa.md',
  'docs/privacy.md',
  'docs/security.md',
  'docs/reviewer-guide.md',
  'docs/release-checklist.md',
];
const missing = [];
for (const file of requiredFiles) {
  try {
    await readFile(join(root, file));
  } catch {
    missing.push(file);
  }
}
const secretsPresent = [
  'CHROME_WEBSTORE_CLIENT_SECRET',
  'EDGE_PRODUCT_ID',
  'AMO_API_SECRET',
].filter((name) => Boolean(process.env[name]));
const report = {
  schemaVersion: '1.0.0',
  release: packageJson.version,
  status: missing.length === 0 ? 'passed' : 'failed',
  mode: 'readiness_only_no_upload',
  missing,
  credentialPresence: secretsPresent,
  safeguards: {
    automaticPublishFromDevelopmentBranch: false,
    manualApprovalRequired: true,
    stagedRolloutRequired: true,
    rollbackPlanRequired: true,
  },
};
await mkdir(join(root, 'dist', 'evidence'), { recursive: true });
await writeFile(
  join(root, 'dist', 'evidence', 'store-readiness.json'),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'passed') process.exitCode = 1;
