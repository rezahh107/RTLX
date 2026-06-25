import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
for (const target of ['chromium', 'edge', 'firefox', 'firefox-android']) {
  const directory = join(root, 'dist', target);
  const candidates = [
    'manifest.json',
    'background.js',
    'content.js',
    'popup/index.js',
    '_locales/fa/messages.json',
    '_locales/en/messages.json',
    'registries/personal-install.v1.json',
    'schemas/settings.schema.json',
  ];
  const files = {};
  for (const path of candidates) {
    await access(join(directory, path));
    const content = await readFile(join(directory, path));
    files[path] = {
      sha256: createHash('sha256').update(content).digest('hex'),
      bytes: content.byteLength,
    };
  }
  const manifest = {
    schemaVersion: '1.0.0',
    productVersion: packageJson.version,
    target,
    files,
  };
  await writeFile(
    join(directory, 'package-integrity.json'),
    `${JSON.stringify(sort(manifest), null, 2)}\n`
  );
}
console.log('package integrity manifests generated');

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
