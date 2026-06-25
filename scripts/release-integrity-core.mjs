import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

export async function sha256File(path) {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

export async function createReleaseManifest(root, relativeFiles, metadata = {}) {
  const normalized = [...new Set(relativeFiles.map(normalizePath))].sort();
  const files = [];
  for (const relativePath of normalized) {
    const absolutePath = safeResolve(root, relativePath);
    const info = await stat(absolutePath);
    if (!info.isFile()) throw new Error(`Manifest entry is not a file: ${relativePath}`);
    files.push({
      path: relativePath,
      size: info.size,
      sha256: await sha256File(absolutePath),
    });
  }
  return {
    schemaVersion: '1.0.0',
    hashAlgorithm: 'sha256',
    canonicalizationVersion: '1.0.0',
    ...metadata,
    files,
  };
}

export async function verifyReleaseManifest({ manifest, root, ignoreFiles = [] }) {
  if (!manifest || manifest.hashAlgorithm !== 'sha256' || !Array.isArray(manifest.files))
    throw new Error('Invalid release manifest contract');
  const ignored = new Set(ignoreFiles.map(normalizePath));
  const seen = new Set();
  for (const record of manifest.files) {
    const relativePath = normalizePath(record.path);
    if (seen.has(relativePath)) throw new Error(`Duplicate manifest path: ${relativePath}`);
    seen.add(relativePath);
    const absolutePath = safeResolve(root, relativePath);
    let info;
    try {
      info = await stat(absolutePath);
    } catch {
      throw new Error(`Missing manifest file: ${relativePath}`);
    }
    if (!info.isFile()) throw new Error(`Manifest path is not a file: ${relativePath}`);
    if (info.size !== record.size)
      throw new Error(
        `Size mismatch for ${relativePath}: expected ${record.size}, got ${info.size}`
      );
    const digest = await sha256File(absolutePath);
    if (digest !== record.sha256)
      throw new Error(
        `SHA-256 mismatch for ${relativePath}: expected ${record.sha256}, got ${digest}`
      );
  }
  const actual = (await walkFiles(root))
    .map((path) => normalizePath(relative(root, path)))
    .filter((path) => !ignored.has(path))
    .sort();
  const extra = actual.filter((path) => !seen.has(path));
  if (extra.length > 0) throw new Error(`Unmanifested files: ${extra.join(', ')}`);
  return { status: 'passed', verifiedFiles: seen.size };
}

export async function walkFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await walkFiles(path)));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort();
}

function normalizePath(value) {
  const normalized = String(value).replaceAll('\\', '/').replace(/^\.\//u, '');
  if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..'))
    throw new Error(`Unsafe manifest path: ${value}`);
  return normalized;
}

function safeResolve(root, relativePath) {
  const normalized = normalizePath(relativePath);
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(root, normalized);
  if (absolutePath !== absoluteRoot && !absolutePath.startsWith(`${absoluteRoot}${sep}`))
    throw new Error(`Manifest path escapes root: ${relativePath}`);
  return absolutePath;
}
