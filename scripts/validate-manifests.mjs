import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageFile = fileURLToPath(new URL('../package.json', import.meta.url));
const root = dirname(packageFile);
const packageJson = JSON.parse(await readFile(packageFile, 'utf8'));
const expectedVersion = packageJson.version;
const personalInstall = JSON.parse(
  await readFile(join(root, 'registries/personal-install.v1.json'), 'utf8')
);
const forbidden = new Set([
  'cookies',
  'history',
  'webRequest',
  'declarativeNetRequest',
  'nativeMessaging',
  'downloads',
  'clipboardRead',
  'clipboardWrite',
  'debugger',
  'management',
  'sidePanel',
  'menus',
  'contextMenus',
]);
const expectedPermissions = ['activeTab', 'alarms', 'scripting', 'storage'];
const optionalHosts = ['http://*/*', 'https://*/*'];

for (const target of ['chromium', 'edge', 'firefox', 'firefox-android']) {
  const dir = join(root, 'dist', target);
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  assert(manifest.manifest_version === 3, `${target}: MV3 required`);
  assert(manifest.version === expectedVersion, `${target}: version mismatch`);
  assert(
    equalSorted(manifest.permissions, expectedPermissions),
    `${target}: focused permission set mismatch`
  );
  assert(
    manifest.optional_permissions === undefined,
    `${target}: optional API permissions prohibited`
  );
  assert(
    equalSorted(manifest.optional_host_permissions, optionalHosts),
    `${target}: optional host permission mismatch`
  );
  for (const permission of manifest.permissions ?? [])
    assert(!forbidden.has(permission), `${target}: forbidden permission ${permission}`);
  assert(!('host_permissions' in manifest), `${target}: mandatory host access prohibited`);
  assert(
    manifest.options_ui === undefined,
    `${target}: options UI must not ship in focused edition`
  );
  assert(
    manifest.side_panel === undefined,
    `${target}: side panel must not ship in focused edition`
  );
  assert(
    manifest.sidebar_action === undefined,
    `${target}: sidebar must not ship in focused edition`
  );
  assert(
    manifest.content_security_policy?.extension_pages ===
      "script-src 'self'; object-src 'none'; base-uri 'none'",
    `${target}: CSP mismatch`
  );
  assertWar(manifest, target);
  if (target.startsWith('firefox')) {
    assert(manifest.key === undefined, `${target}: Chromium key prohibited`);
    assert(
      Array.isArray(manifest.background?.scripts) &&
        manifest.background.scripts[0] === 'background.js' &&
        !('service_worker' in manifest.background),
      `${target}: background mismatch`
    );
    assert(
      manifest.browser_specific_settings?.gecko?.id === '{c70856f4-3b2c-4c21-a94f-b5a9172c46ac}',
      `${target}: ID mismatch`
    );
    if (target === 'firefox') {
      assert(manifest.commands?.['toggle-current-site'], 'firefox command missing');
      assert(
        manifest.browser_specific_settings.gecko.strict_min_version === '140.0',
        'firefox baseline mismatch'
      );
      assert(
        manifest.browser_specific_settings.gecko_android === undefined,
        'desktop firefox must not claim Android support'
      );
    } else {
      assert(manifest.commands === undefined, 'firefox Android commands prohibited');
      assert(
        manifest.browser_specific_settings.gecko_android?.strict_min_version === '142.0',
        'firefox Android baseline mismatch'
      );
    }
  } else {
    assert(
      manifest.key === personalInstall.chromiumPublicKey,
      `${target}: stable extension key mismatch`
    );
    assert(
      manifest.background?.service_worker === 'background.js' &&
        !('scripts' in manifest.background),
      `${target} service worker mismatch`
    );
    assert(manifest.commands?.['toggle-current-site'], `${target}: site toggle command missing`);
  }
  for (const file of refs(manifest)) await access(join(dir, file));
  await access(join(dir, 'package-integrity.json'));
}
console.log('manifest validation passed');

function refs(manifest) {
  return [
    'background.js',
    'content.js',
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
    '_locales/fa/messages.json',
    '_locales/en/messages.json',
  ].filter(Boolean);
}
function assertWar(manifest, target) {
  const resources = manifest.web_accessible_resources ?? [];
  assert(
    resources.length === 1 &&
      resources[0].resources?.length === 1 &&
      resources[0].resources[0] === 'fonts/*.woff2',
    `${target}: WAR mismatch`
  );
}
function equalSorted(actual, expected) {
  return (
    Array.isArray(actual) &&
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort())
  );
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
