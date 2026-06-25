import { beforeEach, describe, expect, it } from 'vitest';
import { enumerateTextBlocks } from '../../src/content/text-block-enumerator';
import { installDom } from '../dom-test-setup';

beforeEach(() => installDom());

describe('v15.9.1 deterministic text block enumeration', () => {
  it('enumerates structured Markdown blocks in DOM order and excludes controls', () => {
    document.body.innerHTML = `
      <div id="region">
        <h3 id="heading">عنوان فارسی</h3>
        <p id="first">پاراگراف <code>font-family</code> اول</p>
        <ul><li id="item-one">مورد اول</li><li id="item-two">مورد دوم</li></ul>
        <blockquote id="quote">نقل قول فارسی</blockquote>
        <div class="actions"><button><span role="img"><svg><use></use></svg></span></button></div>
        <p id="last">پاراگراف پایانی</p>
      </div>`;

    const region = document.querySelector('#region')!;
    const blocks = enumerateTextBlocks(region, ['code']);

    expect(blocks.map((entry) => entry.element.id)).toEqual([
      'heading',
      'first',
      'item-one',
      'item-two',
      'quote',
      'last',
    ]);
    expect(blocks.map((entry) => entry.kind)).toEqual([
      'heading',
      'paragraph',
      'list-item',
      'list-item',
      'quote',
      'paragraph',
    ]);
  });

  it('avoids duplicate parent mutations when a nested meaningful block exists', () => {
    document.body.innerHTML = `
      <div id="region"><ul><li id="item"><p id="paragraph">متن فارسی</p></li></ul></div>`;
    const blocks = enumerateTextBlocks(document.querySelector('#region')!);
    expect(blocks.map((entry) => entry.element.id)).toEqual(['paragraph']);
  });

  it('uses the region only as a fallback when no structural child block exists', () => {
    document.body.innerHTML = '<div id="region">متن مستقیم فارسی <strong>مهم</strong></div>';
    const blocks = enumerateTextBlocks(document.querySelector('#region')!);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: 'generic-block', depth: 0 });
  });
});
