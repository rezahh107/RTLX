import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import process from 'node:process';
import { unzipSync } from 'fflate';

const options = parseArgs(process.argv.slice(2));
const artifact = resolve(options.artifact);
const installDirectory = resolve(options.installDir);
const artifactBytes = await readFile(artifact);
const artifactSha256 = sha256(artifactBytes);
if (options.sha256 && options.sha256.toLowerCase() !== artifactSha256)
  throw new Error('Artifact SHA-256 mismatch');

const parent = dirname(installDirectory);
const temporary = join(parent, `.${basename(installDirectory)}.next-${process.pid}`);
const previous = join(parent, `.${basename(installDirectory)}.previous`);
await rm(temporary, { recursive: true, force: true });
await mkdir(temporary, { recursive: true });
try {
  await extractZip(artifactBytes, temporary);
  const manifest = JSON.parse(await readFile(join(temporary, 'manifest.json'), 'utf8'));
  if (manifest.manifest_version !== 3 || typeof manifest.version !== 'string')
    throw new Error('Artifact manifest invalid');
  const integrity = JSON.parse(await readFile(join(temporary, 'package-integrity.json'), 'utf8'));
  if (integrity.productVersion !== manifest.version)
    throw new Error('Package integrity version mismatch');
  await verifyIntegrity(temporary, integrity);
  await rm(previous, { recursive: true, force: true });
  let movedCurrent = false;
  try {
    await rename(installDirectory, previous);
    movedCurrent = true;
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  try {
    await rename(temporary, installDirectory);
  } catch (error) {
    if (movedCurrent) await rename(previous, installDirectory).catch(() => undefined);
    throw error;
  }
  const report = {
    schemaVersion: '1.0.0',
    installedAt: new Date().toISOString(),
    artifact: basename(artifact),
    artifactSha256,
    installDirectory,
    previousDirectory: movedCurrent ? previous : null,
    version: manifest.version,
    extensionKeyPresent: typeof manifest.key === 'string',
    nextStep: 'Open chrome://extensions or edge://extensions and click Reload for RTLX.',
  };
  await writeFile(
    `${installDirectory}.install-report.json`,
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}

function parseArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    const value = args[index + 1];
    if (name === '--artifact' && value) result.artifact = value;
    else if (name === '--install-dir' && value) result.installDir = value;
    else if (name === '--sha256' && value) result.sha256 = value;
    else continue;
    index += 1;
  }
  if (!result.artifact || !result.installDir)
    throw new Error(
      'Usage: node scripts/install-personal.mjs --artifact <zip> --install-dir <fixed-directory> [--sha256 <hash>]'
    );
  return result;
}

async function extractZip(bytes, target) {
  const entries = unzipSync(new Uint8Array(bytes));
  for (const [relative, content] of Object.entries(entries).sort(([a], [b]) =>
    a.localeCompare(b, 'en')
  )) {
    const normalized = relative.replaceAll('\\', '/');
    if (normalized.startsWith('/') || normalized.split('/').includes('..'))
      throw new Error('Unsafe ZIP path');
    if (normalized.endsWith('/')) continue;
    const destination = resolve(target, normalized);
    if (!destination.startsWith(`${resolve(target)}${sep}`)) throw new Error('Unsafe ZIP path');
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
}

async function verifyIntegrity(directory, manifest) {
  if (
    manifest.schemaVersion !== '1.0.0' ||
    typeof manifest.files !== 'object' ||
    manifest.files === null
  )
    throw new Error('Package integrity manifest invalid');
  for (const [relative, expected] of Object.entries(manifest.files).sort(([a], [b]) =>
    a.localeCompare(b, 'en')
  )) {
    const content = await readFile(join(directory, relative));
    if (content.byteLength !== expected.bytes || sha256(content) !== expected.sha256)
      throw new Error(`Package integrity mismatch: ${relative}`);
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
function isMissing(error) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}
