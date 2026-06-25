import { LIMITS } from './constants';

export type CanonicalJson =
  | null
  | boolean
  | number
  | string
  | CanonicalJson[]
  | { [key: string]: CanonicalJson };

export const CANONICAL_CYCLE_ERROR_CODE = 'RTLX-CANONICAL-001' as const;
export const CANONICAL_DEPTH_ERROR_CODE = 'RTLX-CANONICAL-002' as const;

export function canonicalize(value: CanonicalJson): string {
  return canonicalizeValue(value, '$', 0, new WeakSet<object>());
}

export function toCanonicalJson(value: unknown, path = '$'): CanonicalJson {
  return toCanonicalJsonValue(value, path, 0, new WeakSet<object>());
}

export function canonicalByteLength(value: unknown): number {
  return new TextEncoder().encode(canonicalize(toCanonicalJson(value))).byteLength;
}

function canonicalizeValue(
  value: CanonicalJson,
  path: string,
  depth: number,
  active: WeakSet<object>
): string {
  assertCanonicalDepth(path, depth);
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') {
    assertNoLoneSurrogates(value);
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('RFC8785 rejects NaN and infinities');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value !== 'object' || value === null)
    throw new TypeError(`${path} is not canonical JSON`);
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null)
    throw new TypeError(`${path} must be a plain object`);
  assertNoCanonicalCycle(value, path, active);
  active.add(value);
  try {
    if (Array.isArray(value))
      return `[${value
        .map((entry, index) => canonicalizeValue(entry, `${path}[${index}]`, depth + 1, active))
        .join(',')}]`;
    const keys = Object.keys(value).sort(compareUnicodeCodeUnits);
    return `{${keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalizeValue(value[key]!, childPath(path, key), depth + 1, active)}`
      )
      .join(',')}}`;
  } finally {
    active.delete(value);
  }
}

function toCanonicalJsonValue(
  value: unknown,
  path: string,
  depth: number,
  active: WeakSet<object>
): CanonicalJson {
  assertCanonicalDepth(path, depth);
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    assertNoLoneSurrogates(value);
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== 'object' || value === undefined)
    throw new TypeError(`${path} is not canonical JSON`);
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null)
    throw new TypeError(`${path} must be a plain object`);
  assertNoCanonicalCycle(value, path, active);
  active.add(value);
  try {
    if (Array.isArray(value))
      return value.map((entry, index) =>
        toCanonicalJsonValue(entry, `${path}[${index}]`, depth + 1, active)
      );
    const result: Record<string, CanonicalJson> = {};
    const entries = Object.entries(value).sort(([left], [right]) =>
      compareUnicodeCodeUnits(left, right)
    );
    for (const [key, entry] of entries) {
      assertNoLoneSurrogates(key);
      const entryPath = childPath(path, key);
      if (entry === undefined) throw new TypeError(`${entryPath} contains undefined`);
      result[key] = toCanonicalJsonValue(entry, entryPath, depth + 1, active);
    }
    return result;
  } finally {
    active.delete(value);
  }
}

function assertCanonicalDepth(path: string, depth: number): void {
  if (depth <= LIMITS.maxCanonicalJsonDepth) return;
  throw new TypeError(
    `${CANONICAL_DEPTH_ERROR_CODE} ${path} exceeds maximum depth ${LIMITS.maxCanonicalJsonDepth}`
  );
}

function assertNoCanonicalCycle(value: object, path: string, active: WeakSet<object>): void {
  if (!active.has(value)) return;
  throw new TypeError(`${CANONICAL_CYCLE_ERROR_CODE} ${path} contains a cyclic reference`);
}

function childPath(path: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

function compareUnicodeCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export async function sha256Hex(content: string | Uint8Array): Promise<string> {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function assertNoLoneSurrogates(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff))
        throw new TypeError('RFC8785/I-JSON rejects lone surrogate code units');
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError('RFC8785/I-JSON rejects lone surrogate code units');
    }
  }
}
