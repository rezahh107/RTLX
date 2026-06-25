import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import { generateStableSelector } from '../../src/content/selector-generator';

beforeEach(() =>
  installDom(
    '<html><body><main><article data-testid="answer"><p class="copy prose">Text</p></article><article data-testid="other"></article></main></body></html>'
  )
);

describe('stable selector generator', () => {
  it('prefers unique stable attributes', () => {
    const element = document.querySelector('[data-testid="answer"]')!;
    expect(generateStableSelector(element).selector).toBe('article[data-testid="answer"]');
  });

  it('rejects html and body roots', () => {
    expect(() => generateStableSelector(document.body)).toThrow('Document roots');
  });

  it('is deterministic for the same DOM', () => {
    const element = document.querySelector('p')!;
    expect(generateStableSelector(element)).toEqual(generateStableSelector(element));
  });
});
