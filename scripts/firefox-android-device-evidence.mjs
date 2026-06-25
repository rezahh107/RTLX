import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outputDir = join(root, 'dist', 'evidence');
await mkdir(outputDir, { recursive: true });
const manifestPath = join(root, 'dist', 'firefox-android', 'manifest.json');
let staticPackaging = 'failed';
let reasons = [];
try {
  await access(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const unsupported = ['commands', 'sidebar_action'].filter((key) => key in manifest);
  const hasMenus = Array.isArray(manifest.permissions) && manifest.permissions.includes('menus');
  if (unsupported.length === 0 && !hasMenus) staticPackaging = 'pass';
  else
    reasons.push(
      `desktop-only manifest keys remain: ${[...unsupported, ...(hasMenus ? ['menus'] : [])].join(', ')}`
    );
} catch (error) {
  reasons.push(error instanceof Error ? error.message : String(error));
}
const deviceRun = process.env.RTLX_FIREFOX_ANDROID_DEVICE_RUN === '1';
const report = {
  schemaVersion: '1.0.0',
  campaign: 'firefox-android-device-evidence',
  status:
    staticPackaging === 'failed'
      ? 'failed'
      : deviceRun
        ? 'insufficient_evidence'
        : 'insufficient_evidence',
  staticPackaging,
  deviceExecution: deviceRun ? 'not_verified_by_this_harness' : 'not_run',
  requiredEvidence: [
    'real Firefox for Android installation',
    'popup interaction',
    'optional host permission grant and revoke',
    'IME and virtual-keyboard input',
    'page mutation and ownership-checked rollback',
  ],
  blockingReasons: deviceRun
    ? ['Device-side result ingestion is not configured for this local harness']
    : ['Firefox Android device or emulator evidence was not supplied'],
  reasons,
};
await writeFile(
  join(outputDir, 'firefox-android-device-evidence.json'),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.status === 'failed' ? 1 : 2;
