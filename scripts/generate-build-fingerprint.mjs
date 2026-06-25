import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const generatedRelative = 'src/generated/build-fingerprint.ts';
const roots = ['src', 'profiles', 'registries', 'schemas'];
const fixedFiles = ['package.json', 'manifest.base.json'];
const files = [...fixedFiles];
for (const directory of roots) files.push(...(await walk(join(root, directory))));
const normalized = files
  .map((file) => (file.startsWith(root) ? relative(root, file) : file).replaceAll('\\', '/'))
  .filter((file) => file !== generatedRelative)
  .sort();
const hash = createHash('sha256');
for (const path of normalized) {
  hash.update(path, 'utf8');
  hash.update('\0', 'utf8');
  hash.update(await readFile(join(root, path)));
  hash.update('\0', 'utf8');
}
const value = `sha256:${hash.digest('hex')}`;
const output = `// Generated deterministically by scripts/generate-build-fingerprint.mjs.\nexport const BUILD_INPUT_HASH =\n  '${value}' as const;\n`;
await mkdir(join(root, 'src/generated'), { recursive: true });
await writeFile(join(root, generatedRelative), output);
console.log(value);

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(path)));
    else result.push(path);
  }
  return result;
}
