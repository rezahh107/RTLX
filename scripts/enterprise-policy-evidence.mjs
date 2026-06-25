import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outputDir = join(root, 'dist/evidence');
await mkdir(outputDir, { recursive: true });
const cases = [
  'optional_host_permission_denied',
  'context_menu_permission_denied',
  'unpacked_extensions_blocked',
  'extension_force_installed',
  'extension_disabled_by_policy',
  'sleeping_tabs_forced_on',
  'automatic_tab_discard_forced_on',
  'administrator_controlled_update_channel',
].map((caseId) => ({ caseId, status: 'not_run' }));
const report = {
  schemaVersion: '1.0.0',
  campaign: 'enterprise-policy-matrix',
  status: 'not_run',
  cases,
  deterministicCoverage: {
    permissionPromptCooldown: 'verified_by_unit_test',
    unsupportedContextMenuApi: 'verified_by_manifest_and_feature_detection',
    policyManagedBrowserExecution: 'not_run',
  },
};
await writeFile(
  join(outputDir, 'enterprise-policy-evidence.json'),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));
process.exitCode = 2;
