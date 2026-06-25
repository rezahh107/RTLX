// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { generateStableSelectorCandidates } from '../../src/content/selector-generator';
beforeEach(() => {
  const { document, window } = parseHTML(
    '<main data-testid="main"><article class="message"><p data-testid="answer">Text</p></article><article class="message"><p>Other</p></article></main>'
  );
  Object.assign(globalThis, { document, window, CSS: window.CSS });
});
describe('selector candidate preview', () => {
  it('offers exact and safe ancestor choices deterministically', () => {
    const element = document.querySelector('[data-testid="answer"]')!;
    const first = generateStableSelectorCandidates(element);
    const second = generateStableSelectorCandidates(element);
    expect(first).toEqual(second);
    expect(first.some((entry) => entry.target === 'exact')).toBe(true);
    expect(first.some((entry) => entry.target === 'ancestor')).toBe(true);
    expect(first.length).toBeLessThanOrEqual(8);
  });
});
