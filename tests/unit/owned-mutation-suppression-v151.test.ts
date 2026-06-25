import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import { OwnedMutationSuppression } from '../../src/content/owned-mutation-suppression';

beforeEach(() => installDom('<html><body><div id="x"></div></body></html>'));

describe('BH-006 exact owned mutation suppression', () => {
  it('consumes only exact generation-scoped attribute signatures', () => {
    const tracker = new OwnedMutationSuppression(() => 0);
    const target = document.querySelector('#x') as Element;
    tracker.expectAttribute(target, 'dir', 'rtl', 3);
    target.setAttribute('dir', 'rtl');
    const exact = { type: 'attributes', target, attributeName: 'dir' } as unknown as MutationRecord;
    expect(tracker.consume(exact, 3)).toBe(true);
    tracker.expectAttribute(target, 'dir', 'ltr', 3);
    target.setAttribute('lang', 'fa');
    const siteMutation = {
      type: 'attributes',
      target,
      attributeName: 'lang',
    } as unknown as MutationRecord;
    expect(tracker.consume(siteMutation, 3)).toBe(false);
    expect(tracker.consume(exact, 4)).toBe(false);
  });

  it('requires exact child node identity', () => {
    const tracker = new OwnedMutationSuppression(() => 0);
    const target = document.body;
    const owned = document.createElement('style');
    const site = document.createElement('style');
    tracker.expectChildList(target, [owned], [], 1);
    const record = {
      type: 'childList',
      target,
      addedNodes: { length: 1, item: () => site },
      removedNodes: { length: 0, item: () => null },
    } as unknown as MutationRecord;
    expect(tracker.consume(record, 1)).toBe(false);
  });
});
