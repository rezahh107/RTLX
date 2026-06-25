import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
export function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('RTLX-ATTEST-003: non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  throw new TypeError(`RTLX-ATTEST-004: unsupported value ${typeof value}`);
}
export async function walkFiles(directory, excluded = new Set()) {
  const result = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name, 'en')
  )) {
    if (excluded.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new TypeError(`RTLX-ATTEST-001: symbolic link ${path}`);
    if (entry.isDirectory()) result.push(...(await walkFiles(path, excluded)));
    else if (entry.isFile()) {
      if (!(path.endsWith('.woff2') && path.includes(`${join('assets', 'fonts')}`)))
        result.push(path);
    } else throw new TypeError(`RTLX-ATTEST-002: unsupported filesystem entry ${path}`);
  }
  return result.sort((a, b) => a.localeCompare(b, 'en'));
}
export async function hashTree(directory, excluded) {
  const files = await walkFiles(directory, excluded);
  const hash = createHash('sha256');
  for (const file of files) {
    const key = relative(directory, file).replaceAll('\\', '/');
    const bytes = await readFile(file);
    hash.update(Buffer.from(`${key}\0${bytes.byteLength}\0`, 'utf8'));
    hash.update(bytes);
  }
  return { sha256: hash.digest('hex'), files: files.length };
}
export function normalizeStatus(value) {
  if (value === 'pass') return 'passed';
  if (['passed', 'failed', 'not_run', 'insufficient_evidence', 'blocked'].includes(value))
    return value;
  return 'unknown';
}
