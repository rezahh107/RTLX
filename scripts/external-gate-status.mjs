import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { externalGateExitCode, summarizeExternalGates } from './external-gate-status-core.mjs';

const packageFile = fileURLToPath(new URL('../package.json', import.meta.url));
const root = dirname(packageFile);
const { version } = JSON.parse(await readFile(packageFile, 'utf8'));
const outputDir = join(root, 'dist', 'evidence');
await mkdir(outputDir, { recursive: true });

const reports = [
  [
    'installed-update-rollback.json',
    'installed_update_rollback',
    'Requires installed historical and candidate extension builds in a controllable browser profile.',
  ],
  [
    'eight-hour-soak.json',
    'eight_hour_multi_tab_soak',
    'Requires an eight-hour real-browser execution environment.',
  ],
  [
    'manual-accessibility.json',
    'manual_accessibility_certification',
    'Requires keyboard, screen-reader, zoom, forced-colors, and manual focus verification.',
  ],
  [
    'store-validation.json',
    'store_signing_and_validation',
    'Requires authenticated Chrome Web Store, Microsoft Edge Add-ons, and Mozilla Add-ons credentials.',
  ],
  [
    'rollout-rehearsal.json',
    'staged_rollout_and_rollback_rehearsal',
    'Requires a protected release channel and store-side staged rollout controls.',
  ],
];
const generated = [];
for (const [file, gateId, reason] of reports) {
  const report = {
    schemaVersion: '1.1.0',
    release: version,
    gateId,
    status: 'not_run',
    reason,
    evidenceState: 'insufficient_evidence',
  };
  await writeFile(join(outputDir, file), JSON.stringify(report, null, 2) + '\n');
  generated.push({ file, gateId, status: report.status, evidenceState: report.evidenceState });
}
const status = summarizeExternalGates(generated.map((item) => item.status));
const report = {
  schemaVersion: '1.1.0',
  release: version,
  operationStatus: 'placeholder_files_created',
  status,
  evidenceState: 'insufficient_evidence',
  reports: generated,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = externalGateExitCode(status);
