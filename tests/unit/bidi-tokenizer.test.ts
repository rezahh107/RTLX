import { describe, expect, it } from 'vitest';
import { tokenizeBidi } from '../../src/content/bidi-tokenizer';
describe('bidi tokenizer', () => {
  it('detects structured tokens but not plain short English words', () => {
    const text = 'برای API به https://example.com/v1 و user@example.com بروید، test نه.';
    const types = tokenizeBidi(text).map((token) => token.type);
    expect(types).toContain('url');
    expect(types).toContain('email');
    expect(types).not.toContain('natural_ltr_phrase');
  });
  it('does not emit out-of-bounds tokens', () => {
    const text = 'نسخه v12.0.0 و --help';
    for (const token of tokenizeBidi(text)) {
      expect(token.start).toBeGreaterThanOrEqual(0);
      expect(token.end).toBeLessThanOrEqual(text.length);
      expect(token.end).toBeGreaterThan(token.start);
    }
  });
  it('skips text above hard UTF-16 limit', () =>
    expect(tokenizeBidi('a'.repeat(20001))).toEqual([]));
});
