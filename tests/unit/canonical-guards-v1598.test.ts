import { describe, expect, it } from 'vitest';
import {
  CANONICAL_CYCLE_ERROR_CODE,
  CANONICAL_DEPTH_ERROR_CODE,
  canonicalize,
  toCanonicalJson,
  type CanonicalJson,
} from '../../src/shared/canonical-json';
import { LIMITS } from '../../src/shared/constants';

describe('RTLX 15.9.11 canonical JSON recursion guards', () => {
  it('rejects cycles with a deterministic TypeError and path', () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    expect(() => toCanonicalJson(value)).toThrowError(
      new TypeError(`${CANONICAL_CYCLE_ERROR_CODE} $.self contains a cyclic reference`)
    );
    expect(() => canonicalize(value as CanonicalJson)).toThrowError(
      new TypeError(`${CANONICAL_CYCLE_ERROR_CODE} $.self contains a cyclic reference`)
    );
  });

  it('rejects excessive depth with a deterministic TypeError and path', () => {
    let value: Record<string, unknown> = {};
    const root = value;
    for (let depth = 0; depth <= LIMITS.maxCanonicalJsonDepth; depth += 1) {
      const next: Record<string, unknown> = {};
      value.child = next;
      value = next;
    }
    expect(() => toCanonicalJson(root)).toThrow(CANONICAL_DEPTH_ERROR_CODE);
    expect(() => toCanonicalJson(root)).toThrow(
      `exceeds maximum depth ${LIMITS.maxCanonicalJsonDepth}`
    );
  });

  it('allows repeated references when they do not form an active-path cycle', () => {
    const shared = { enabled: true };
    expect(toCanonicalJson({ left: shared, right: shared })).toEqual({
      left: { enabled: true },
      right: { enabled: true },
    });
  });
});
