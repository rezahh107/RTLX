import { beforeEach, describe, expect, it } from 'vitest';
import { collectTypographyBatch } from '../../src/content/typography-planner';
import { installDom } from '../dom-test-setup';

beforeEach(() => installDom());

describe('v15.9.1 bounded typography continuation', () => {
  it('continues after the first bounded slice until every eligible text node is inspected', () => {
    const region = document.createElement('section');
    region.id = 'region';
    for (let index = 0; index < 121; index += 1) {
      const paragraph = document.createElement('p');
      paragraph.id = `p-${index}`;
      paragraph.textContent = `متن فارسی ${index}`;
      region.append(paragraph);
    }
    document.body.replaceChildren(region);
    const processed = new WeakMap<Text, string>();
    const seenTargets = new Set<Element>();
    let batches = 0;
    let inspected = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = collectTypographyBatch(region, [], processed, 'region:1', 50);
      batches += 1;
      inspected += batch.inspectedNodes;
      batch.targets.forEach((target) => seenTargets.add(target));
      batch.fingerprints.forEach((fingerprint, node) => processed.set(node, fingerprint));
      hasMore = batch.hasMore;
      expect(batches).toBeLessThanOrEqual(4);
    }

    expect(batches).toBe(3);
    expect(inspected).toBe(121);
    expect(seenTargets.size).toBe(121);
  });

  it('invalidates a processed typography fingerprint when text context changes', () => {
    const message = document.createElement('p');
    message.id = 'message';
    message.textContent = 'متن فارسی';
    document.body.replaceChildren(message);
    const processed = new WeakMap<Text, string>();
    const first = collectTypographyBatch(message, [], processed, 'context-a', 50);
    first.fingerprints.forEach((fingerprint, node) => processed.set(node, fingerprint));
    expect(first.targets).toEqual([message]);

    const cached = collectTypographyBatch(message, [], processed, 'context-a', 50);
    expect(cached.inspectedNodes).toBe(0);
    expect(cached.targets).toEqual([]);

    const changed = collectTypographyBatch(message, [], processed, 'context-b', 50);
    expect(changed.inspectedNodes).toBe(1);
    expect(changed.targets).toEqual([message]);
  });
});
