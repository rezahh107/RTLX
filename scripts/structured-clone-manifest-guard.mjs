import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const manifests = [join(root, 'manifest.base.json')];
const dist = join(root, 'dist');
if (existsSync(dist)) {
  for (const target of await readdir(dist, { withFileTypes: true })) {
    if (!target.isDirectory()) continue;
    const manifest = join(dist, target.name, 'manifest.json');
    if (existsSync(manifest)) manifests.push(manifest);
  }
}

const optedIn = [];
for (const path of manifests) {
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  if (manifest.message_serialization === 'structured_clone') optedIn.push(path);
}

if (optedIn.length > 0) {
  const dedicatedTest = join(root, 'tests/unit/structured-clone-messaging-v1598.test.ts');
  if (!existsSync(dedicatedTest))
    throw new Error('Structured-clone messaging opt-in requires a dedicated transport test');
  if (
    packageJson.scripts?.['test:structured-clone'] !==
    'vitest run tests/unit/structured-clone-messaging-v1598.test.ts'
  )
    throw new Error('Structured-clone messaging opt-in requires the dedicated CI test script');
}

console.log(
  JSON.stringify(
    {
      status: 'pass',
      messageSerialization: optedIn.length > 0 ? 'structured_clone' : 'json_default',
      manifestsChecked: manifests.map((path) => path.slice(root.length + 1)),
      dedicatedTestRequired: optedIn.length > 0,
    },
    null,
    2
  )
);
