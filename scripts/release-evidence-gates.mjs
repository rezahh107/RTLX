import { evaluateReleaseEvidence, normalizeEvidenceStatus } from './release-evidence-core.mjs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageFile = fileURLToPath(new URL('../package.json', import.meta.url));
const root = dirname(packageFile);
const { version } = JSON.parse(await readFile(packageFile, 'utf8'));
const outputDir = join(root, 'dist/evidence');
await mkdir(outputDir, { recursive: true });

const gateSpecs = [
  ['development_checks', 'development-checks.json'],
  ['eslint_warning_audit', 'eslint-warning-audit.json'],
  ['api_adapter_conformance', 'api-adapter-conformance.json'],
  ['store_readiness', 'store-readiness.json'],
  ['clean_source_reproduction', 'clean-source-reproduction.json'],
  ['manifest_chromium', 'exact-artifact-e2e-chromium.json'],
  ['manifest_edge', 'exact-artifact-e2e-edge.json'],
  ['manifest_firefox_desktop', 'exact-artifact-e2e-firefox.json'],
  ['manifest_firefox_android', 'firefox-android-device-evidence.json'],
  ['crash_campaign', 'browser-crash-campaign.json'],
  ['eight_hour_soak', 'eight-hour-soak.json'],
  ['performance_budget', 'performance-evidence.json'],
  ['enterprise_policy', 'enterprise-policy-evidence.json'],
  ['manual_accessibility', 'manual-accessibility.json'],
  ['store_validation', 'store-validation.json'],
  ['installed_update_rollback', 'installed-update-rollback.json'],
  ['rollout_rehearsal', 'rollout-rehearsal.json'],
  ['signed_artifact_verification', 'signed-artifact-verification.json'],
];
const gates = [];
for (const [gateId, file] of gateSpecs) {
  const path = join(outputDir, file);
  let status = 'not_run';
  let source = null;
  try {
    await access(path);
    source = JSON.parse(await readFile(path, 'utf8'));
    status = normalizeEvidenceStatus(source.status);
  } catch {
    status = 'not_run';
  }
  gates.push({ gateId, status, sourceFile: file, source });
}
const evaluation = evaluateReleaseEvidence(gates);
const overall = evaluation.status;
const report = {
  schemaVersion: '1.0.0',
  release: version,
  status: overall,
  productionReady: overall === 'passed',
  gates,
};
await writeFile(
  join(outputDir, 'release-evidence-gates.json'),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));
process.exitCode = evaluation.exitCode;
