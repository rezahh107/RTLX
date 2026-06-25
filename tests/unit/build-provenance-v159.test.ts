import { describe, expect, it } from 'vitest';
import { BUILD_INPUT_HASH } from '../../src/generated/build-fingerprint';

describe('RUNTIME-PROVENANCE-001', () => {
  it('exposes a versioned SHA-256 build-input fingerprint', () => {
    expect(BUILD_INPUT_HASH).toMatch(/^sha256:[a-f0-9]{64}$/u);
  });
});
