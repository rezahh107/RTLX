import { sha256Hex } from '../shared/canonical-json';
import { PRODUCT_VERSION } from '../shared/constants';
import { runtimeUrl } from '../shared/api-adapter';

export type PackageIntegrityStatus =
  | 'verified'
  | 'mismatch'
  | 'manifest_missing'
  | 'insufficient_evidence';

export interface PackageIntegrityFileResult {
  path: string;
  expectedSha256: string;
  actualSha256: string | null;
  expectedBytes: number;
  actualBytes: number | null;
  status: 'verified' | 'mismatch' | 'unavailable';
}

export interface PackageIntegrityResult {
  status: PackageIntegrityStatus;
  productVersion: string;
  target: string | null;
  checkedAt: string;
  files: readonly PackageIntegrityFileResult[];
}

interface IntegrityManifest {
  schemaVersion: '1.0.0';
  productVersion: string;
  target: string;
  files: Readonly<Record<string, Readonly<{ sha256: string; bytes: number }>>>;
}

let cached: Promise<PackageIntegrityResult> | null = null;

export function verifyCriticalPackageFiles(
  options: Readonly<{ force?: boolean }> = {}
): Promise<PackageIntegrityResult> {
  if (!options.force && cached) return cached;
  const result = verify();
  if (!options.force) cached = result;
  return result;
}

export function resetPackageIntegrityForTests(): void {
  cached = null;
}

async function verify(): Promise<PackageIntegrityResult> {
  const checkedAt = new Date().toISOString();
  if (
    typeof fetch !== 'function' ||
    typeof globalThis.chrome === 'undefined' ||
    typeof globalThis.chrome.runtime?.getURL !== 'function'
  )
    return freezeResult({
      status: 'insufficient_evidence',
      productVersion: PRODUCT_VERSION,
      target: null,
      checkedAt,
      files: [],
    });
  let response: Response;
  try {
    response = await fetch(runtimeUrl('package-integrity.json'), { cache: 'no-store' });
  } catch {
    return freezeResult({
      status: 'manifest_missing',
      productVersion: PRODUCT_VERSION,
      target: null,
      checkedAt,
      files: [],
    });
  }
  if (!response.ok)
    return freezeResult({
      status: 'manifest_missing',
      productVersion: PRODUCT_VERSION,
      target: null,
      checkedAt,
      files: [],
    });
  let manifest: IntegrityManifest;
  try {
    manifest = normalizeManifest(await response.json());
  } catch {
    return freezeResult({
      status: 'mismatch',
      productVersion: PRODUCT_VERSION,
      target: null,
      checkedAt,
      files: [],
    });
  }
  const files: PackageIntegrityFileResult[] = [];
  for (const [path, expected] of Object.entries(manifest.files).sort(([a], [b]) =>
    a.localeCompare(b, 'en')
  )) {
    try {
      const fileResponse = await fetch(runtimeUrl(path), { cache: 'no-store' });
      if (!fileResponse.ok) throw new Error('Unavailable');
      const bytes = new Uint8Array(await fileResponse.arrayBuffer());
      const actualSha256 = await sha256Hex(bytes);
      files.push(
        Object.freeze({
          path,
          expectedSha256: expected.sha256,
          actualSha256,
          expectedBytes: expected.bytes,
          actualBytes: bytes.byteLength,
          status:
            actualSha256 === expected.sha256 && bytes.byteLength === expected.bytes
              ? 'verified'
              : 'mismatch',
        })
      );
    } catch {
      files.push(
        Object.freeze({
          path,
          expectedSha256: expected.sha256,
          actualSha256: null,
          expectedBytes: expected.bytes,
          actualBytes: null,
          status: 'unavailable',
        })
      );
    }
  }
  const manifestVersionMatches = manifest.productVersion === PRODUCT_VERSION;
  const status =
    manifestVersionMatches && files.every((entry) => entry.status === 'verified')
      ? 'verified'
      : 'mismatch';
  return freezeResult({
    status,
    productVersion: manifest.productVersion,
    target: manifest.target,
    checkedAt,
    files,
  });
}

function normalizeManifest(value: unknown): IntegrityManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Invalid package integrity manifest');
  const record = value as Record<string, unknown>;
  if (
    record.schemaVersion !== '1.0.0' ||
    typeof record.productVersion !== 'string' ||
    typeof record.target !== 'string' ||
    typeof record.files !== 'object' ||
    record.files === null ||
    Array.isArray(record.files)
  )
    throw new Error('Invalid package integrity manifest');
  const files: Record<string, { sha256: string; bytes: number }> = {};
  for (const [path, raw] of Object.entries(record.files as Record<string, unknown>)) {
    if (
      !/^[a-zA-Z0-9_./-]{1,256}$/u.test(path) ||
      path.startsWith('/') ||
      path.includes('..') ||
      typeof raw !== 'object' ||
      raw === null ||
      Array.isArray(raw)
    )
      throw new Error('Invalid package integrity file');
    const entry = raw as Record<string, unknown>;
    if (
      typeof entry.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/u.test(entry.sha256) ||
      !Number.isInteger(entry.bytes) ||
      Number(entry.bytes) < 0
    )
      throw new Error('Invalid package integrity file');
    files[path] = { sha256: entry.sha256, bytes: Number(entry.bytes) };
  }
  if (Object.keys(files).length === 0) throw new Error('Empty package integrity manifest');
  return Object.freeze({
    schemaVersion: '1.0.0',
    productVersion: record.productVersion,
    target: record.target,
    files: Object.freeze(files),
  });
}

function freezeResult(value: PackageIntegrityResult): PackageIntegrityResult {
  return Object.freeze({ ...value, files: Object.freeze([...value.files]) });
}
