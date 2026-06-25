import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { resolveOverlaps } from '../../src/content/overlap-resolver';
import type { BidiToken, TokenType } from '../../src/shared/types';
const types: TokenType[] = [
  'url',
  'email',
  'file_path',
  'package_identifier',
  'technical_identifier',
  'version',
];
const arbitrary = fc
  .array(
    fc.record({
      start: fc.integer({ min: -2, max: 20 }),
      length: fc.integer({ min: 0, max: 12 }),
      priority: fc.integer({ min: 1, max: 10 }),
      type: fc.constantFrom(...types),
    }),
    { maxLength: 30 }
  )
  .map((items) =>
    items.map(
      (item): BidiToken => ({
        start: item.start,
        end: item.start + item.length,
        priority: item.priority,
        type: item.type,
        direction: 'ltr',
      })
    )
  );
describe('resolver properties', () => {
  it('is deterministic under permutation and outputs no overlap', () =>
    fc.assert(
      fc.property(arbitrary, (tokens) => {
        const a = resolveOverlaps(tokens, 20);
        const b = resolveOverlaps([...tokens].reverse(), 20);
        expect(a).toEqual(b);
        for (let i = 1; i < a.length; i++) expect(a[i - 1]!.end).toBeLessThanOrEqual(a[i]!.start);
        for (const token of a) {
          expect(token.start).toBeGreaterThanOrEqual(0);
          expect(token.end).toBeLessThanOrEqual(20);
        }
      }),
      { numRuns: 300 }
    ));
});
