import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const packageFile = fileURLToPath(new URL('../package.json', import.meta.url));
const root = dirname(packageFile);
const packageJson = JSON.parse(await readFile(packageFile, 'utf8'));
const version = packageJson.version;
const sourceRoot = `rtlx-v${version}-source`;
const outputDir = join(root, 'dist', 'artifacts');
const outputName = `rtlx-v${version}-font-sanitized-source.zip`;
const excludedDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage']);
const entries = {};
for (const file of await walk(root)) {
  const key = relative(root, file).replaceAll('\\', '/');
  if (key.startsWith('assets/fonts/') && key.endsWith('.woff2')) continue;
  entries[`${sourceRoot}/${key}`] = [
    new Uint8Array(await readFile(file)),
    { mtime: new Date('1980-01-01T00:00:00Z') },
  ];
}
await mkdir(outputDir, { recursive: true });
const bytes = zipSync(entries, { level: 9 });
await writeFile(join(outputDir, outputName), bytes);
const report = {
  file: outputName,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  files: Object.keys(entries).length,
  binaryFontsIncluded: false,
  vendorScriptsIncluded:
    `${sourceRoot}/scripts/vendor-fonts.mjs` in entries &&
    `${sourceRoot}/scripts/verify-fonts.mjs` in entries,
};
console.log(JSON.stringify(report, null, 2));

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      (excludedDirectories.has(entry.name) || entry.name.startsWith('evidence-'))
    )
      continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(path)));
    else result.push(path);
  }
  return result.sort();
}
