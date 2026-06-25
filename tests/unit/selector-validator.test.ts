import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import { validateSelectors } from '../../src/shared/selector-validator';
beforeEach(() => installDom());
describe('selector validator', () => {
  it('accepts safe selectors deterministically', () => {
    const result = validateSelectors(['article', '.content', 'article']);
    expect(result.ok && result.value).toEqual(['.content', 'article']);
  });
  it('rejects :has and pseudo-elements', () => {
    expect(validateSelectors(['main:has(script)']).ok).toBe(false);
    expect(validateSelectors(['p::before']).ok).toBe(false);
  });
  it('rejects html/body selectors', () =>
    expect(validateSelectors(['body .content']).ok).toBe(false));
});
