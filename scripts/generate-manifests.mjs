import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const base = JSON.parse(await readFile(join(root, 'manifest.base.json'), 'utf8'));
const FIREFOX_ID = '{c70856f4-3b2c-4c21-a94f-b5a9172c46ac}';
const personalInstall = JSON.parse(
  await readFile(join(root, 'registries/personal-install.v1.json'), 'utf8')
);
for (const target of ['chromium', 'edge', 'firefox', 'firefox-android'])
  await mkdir(join(root, 'dist', target), { recursive: true });
const chromium = {
  ...base,
  key: personalInstall.chromiumPublicKey,
  permissions: [...base.permissions],
  minimum_chrome_version: '121',
  background: { service_worker: 'background.js', type: 'module' },
};
const edge = { ...chromium, name: '__MSG_extensionName__' };
const firefoxBase = JSON.parse(JSON.stringify(base));
delete firefoxBase.optional_permissions;
const firefox = {
  ...firefoxBase,
  permissions: [...base.permissions],
  background: { scripts: ['background.js'], type: 'module' },
  browser_specific_settings: {
    gecko: {
      id: FIREFOX_ID,
      strict_min_version: '140.0',
      data_collection_permissions: { required: ['none'] },
    },
  },
};
const firefoxAndroidBase = JSON.parse(JSON.stringify(base));
delete firefoxAndroidBase.optional_permissions;
delete firefoxAndroidBase.commands;
const firefoxAndroid = {
  ...firefoxAndroidBase,
  permissions: [...base.permissions],
  background: { scripts: ['background.js'], type: 'module' },
  browser_specific_settings: {
    gecko: {
      id: FIREFOX_ID,
      strict_min_version: '142.0',
      data_collection_permissions: { required: ['none'] },
    },
    gecko_android: { strict_min_version: '142.0' },
  },
};
for (const [target, value] of [
  ['chromium', chromium],
  ['edge', edge],
  ['firefox', firefox],
  ['firefox-android', firefoxAndroid],
])
  await writeFile(join(root, `dist/${target}/manifest.json`), stable(value));
function stable(value) {
  return JSON.stringify(sort(value), null, 2) + '\n';
}
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sort(value[key])])
    );
  return value;
}
