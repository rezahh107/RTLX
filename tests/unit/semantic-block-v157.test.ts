import { beforeEach, describe, expect, it } from 'vitest';
import {
  isSimpleInteractiveText,
  resolveSemanticBlock,
  semanticAncestorKinds,
} from '../../src/content/semantic-block-resolver';
import { installDom } from '../dom-test-setup';

describe('v15.7 semantic block resolution', () => {
  beforeEach(() => installDom());

  it('lifts nested inline text to the nearest meaningful block', () => {
    document.body.innerHTML =
      '<article><p id="message">سلام <strong id="token">دنیا</strong></p></article>';
    const token = document.querySelector('#token')!;
    const result = resolveSemanticBlock(token);
    expect(result.element.id).toBe('message');
    expect(result.strategy).toBe('nearest-block');
    expect(semanticAncestorKinds(token)).toEqual(['strong', 'p', 'article', 'body']);
  });

  it('keeps a simple text-only link or button as its own semantic target', () => {
    document.body.innerHTML =
      '<button id="simple">ادامه</button><button id="complex"><svg></svg>ادامه</button>';
    const simple = document.querySelector('#simple')!;
    const complex = document.querySelector('#complex')!;
    expect(isSimpleInteractiveText(simple)).toBe(true);
    expect(resolveSemanticBlock(simple).strategy).toBe('simple-interactive');
    expect(isSimpleInteractiveText(complex)).toBe(false);
  });

  it('lifts nested descendants to their simple interactive owner', () => {
    document.body.innerHTML = '<a id=link href=#><span id=child>ادامه</span></a>';
    const child = document.querySelector('#child')!;
    const result = resolveSemanticBlock(child);
    expect(result.element.id).toBe('link');
    expect(result.strategy).toBe('simple-interactive');
  });
});
