import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTextBlockEnumerationCursor,
  enumerateTextBlocks,
} from '../../src/content/text-block-enumerator';
import { installDom } from '../dom-test-setup';

beforeEach(() => installDom());

function makeParagraphRegion(count: number): Element {
  const region = document.createElement('section');
  region.id = 'region';
  for (let index = 0; index < count; index += 1) {
    const paragraph = document.createElement('p');
    paragraph.id = `paragraph-${index}`;
    paragraph.textContent = index % 2 === 0 ? `متن فارسی ${index}` : `Latin text ${index}`;
    region.append(paragraph);
  }
  document.body.replaceChildren(region);
  return region;
}

describe('v15.9.1 resumable text block enumeration', () => {
  it.each([
    [511, false],
    [512, false],
    [513, true],
  ] as const)('handles the %i descendant boundary without loss', (count, firstHasMore) => {
    const cursor = createTextBlockEnumerationCursor(makeParagraphRegion(count));
    const first = cursor.nextBatch(512);
    expect(first.blocks).toHaveLength(Math.min(count, 512));
    expect(first.hasMore).toBe(firstHasMore);
    const ids = [...first.blocks.map((entry) => entry.element.id)];
    let batch = first;
    while (batch.hasMore) {
      batch = cursor.nextBatch(512);
      ids.push(...batch.blocks.map((entry) => entry.element.id));
    }
    expect(ids).toHaveLength(count);
    expect(ids[0]).toBe('paragraph-0');
    expect(ids.at(-1)).toBe(`paragraph-${count - 1}`);
    expect(new Set(ids).size).toBe(count);
  });

  it('continues through more than 512 blocks in stable DOM order', () => {
    const cursor = createTextBlockEnumerationCursor(makeParagraphRegion(600));
    const ids: string[] = [];
    const batchSizes: number[] = [];
    let batch = cursor.nextBatch(512);
    while (true) {
      batchSizes.push(batch.inspectedElements);
      ids.push(...batch.blocks.map((entry) => entry.element.id));
      if (!batch.hasMore) break;
      batch = cursor.nextBatch(512);
    }
    expect(batchSizes).toEqual([512, 88]);
    expect(ids).toEqual(Array.from({ length: 600 }, (_, index) => `paragraph-${index}`));
    expect(cursor.snapshot()).toMatchObject({
      completed: true,
      batches: 2,
      totalInspectedElements: 600,
      totalBlocks: 600,
    });
  });

  it('does not duplicate nested list and table blocks across a continuation boundary', () => {
    const region = document.createElement('section');
    for (let index = 0; index < 260; index += 1) {
      const list = document.createElement('ul');
      const item = document.createElement('li');
      item.id = `item-${index}`;
      const paragraph = document.createElement('p');
      paragraph.id = `nested-${index}`;
      paragraph.textContent = `مورد ${index}`;
      item.append(paragraph);
      list.append(item);
      region.append(list);
    }
    const table = document.createElement('table');
    for (let index = 0; index < 20; index += 1) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.id = `cell-${index}`;
      cell.textContent = `سلول ${index}`;
      row.append(cell);
      table.append(row);
    }
    region.append(table);
    document.body.replaceChildren(region);

    const blocks = enumerateTextBlocks(region);
    const ids = blocks.map((entry) => entry.element.id);
    expect(ids.filter((id) => id.startsWith('nested-'))).toHaveLength(260);
    expect(ids.filter((id) => id.startsWith('item-'))).toHaveLength(0);
    expect(ids.filter((id) => id.startsWith('cell-'))).toHaveLength(20);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
