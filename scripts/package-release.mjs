import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { zipSync } from 'fflate';
import { createReleaseManifest, verifyReleaseManifest } from './release-integrity-core.mjs';

const packageFile = fileURLToPath(new URL('../package.json', import.meta.url));
const root = dirname(packageFile);
const packageJson = JSON.parse(await readFile(packageFile, 'utf8'));
const version = packageJson.version;
run('node', ['scripts/build.mjs']);
const artifacts = join(root, 'dist/artifacts');
await mkdir(artifacts, { recursive: true });
const artifactFiles = [];
for (const target of ['chromium', 'edge', 'firefox', 'firefox-android']) {
  const base = join(root, 'dist', target);
  const entries = {};
  for (const file of await walk(base)) {
    const key = relative(base, file).replaceAll('\\', '/');
    entries[key] = [
      new Uint8Array(await readFile(file)),
      { mtime: new Date('1980-01-01T00:00:00Z') },
    ];
  }
  const bytes = zipSync(entries, { level: 9 });
  const name = `rtlx-${target}-${version}.zip`;
  await writeFile(join(artifacts, name), bytes);
  artifactFiles.push(name);
}
const manifestName = `RTLX-v${version}-ARTIFACT-SHA256-MANIFEST.json`;
const manifest = await createReleaseManifest(artifacts, artifactFiles, {
  release: version,
  artifactType: 'browser-packages',
});
await writeFile(join(artifacts, manifestName), JSON.stringify(manifest, null, 2) + '\n');
const verification = await verifyReleaseManifest({
  manifest,
  root: artifacts,
  ignoreFiles: [manifestName],
});
console.log(
  JSON.stringify({ manifest: manifestName, ...verification, files: manifest.files }, null, 2)
);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, TZ: 'UTC', LC_ALL: 'C' },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(path)));
    else result.push(path);
  }
  return result.sort();
}
