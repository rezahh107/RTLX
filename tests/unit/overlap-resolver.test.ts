import { describe, expect, it } from 'vitest';
import { reconstructText, resolveOverlaps } from '../../src/content/overlap-resolver';
import type { BidiToken } from '../../src/shared/types';
describe('overlap resolver', () => {
  it('uses priority then length then start then lexical type', () => {
    const tokens: BidiToken[] = [
      { start: 0, end: 5, type: 'version', priority: 6, direction: 'ltr' },
      { start: 0, end: 10, type: 'url', priority: 3, direction: 'ltr' },
      { start: 2, end: 8, type: 'email', priority: 3, direction: 'ltr' },
    ];
    expect(resolveOverlaps(tokens, 20)).toEqual([
      { start: 0, end: 10, type: 'url', priority: 3, direction: 'ltr' },
    ]);
  });
  it('preserves text reconstruction', () => {
    const text = 'abc def ghi';
    const output = resolveOverlaps(
      [
        { start: 0, end: 3, type: 'technical_identifier', priority: 5, direction: 'ltr' },
        { start: 4, end: 7, type: 'version', priority: 6, direction: 'ltr' },
      ],
      text.length
    );
    expect(reconstructText(text, output)).toBe(text);
  });
  it('rejects zero and invalid bounds', () =>
    expect(
      resolveOverlaps(
        [
          { start: 1, end: 1, type: 'url', priority: 3, direction: 'ltr' },
          { start: -1, end: 2, type: 'email', priority: 3, direction: 'ltr' },
        ],
        4
      )
    ).toEqual([]));
});
