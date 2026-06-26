import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const packagePath = join(root, 'package.json');
const lockPath = join(root, 'package-lock.json');
const publicRegistry = 'https://registry.npmjs.org/';
const internalRegistryPattern =
  /https:\/\/packages\.applied-caas-gateway1\.internal\.api\.openai\.org\/artifactory\/api\/npm\/npm-public\//gu;

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
let lockText = await readFile(lockPath, 'utf8');
const beforeInternalRefs = (lockText.match(internalRegistryPattern) ?? []).length;
lockText = lockText.replace(internalRegistryPattern, publicRegistry);
const lockJson = JSON.parse(lockText);
if (typeof packageJson.version === 'string') {
  lockJson.version = packageJson.version;
  if (lockJson.packages?.['']) lockJson.packages[''].version = packageJson.version;
}
const next = `${JSON.stringify(lockJson, null, 2)}\n`;
if (next.includes('packages.applied-caas-gateway1.internal.api.openai.org')) {
  console.error('package-lock.json still contains internal registry references after sanitization');
  process.exit(1);
}
await writeFile(lockPath, next);
console.log(
  JSON.stringify(
    {
      schemaVersion: '1.0.0',
      status: 'sanitized',
      publicRegistry,
      internalResolvedUrlsRewritten: beforeInternalRefs,
      packageVersion: packageJson.version,
    },
    null,
    2
  )
);
