import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import { applyMutationPlan } from '../../src/content/mutation-applier';
import { createPlan } from '../../src/content/mutation-plan';
import { MutationJournal } from '../../src/content/mutation-journal';

describe('document stylesheet mutation', () => {
  beforeEach(() => installDom('<html><head></head><body></body></html>'));

  it('injects owned styles into document head instead of the Document node', () => {
    const journal = new MutationJournal();
    const result = applyMutationPlan(
      createPlan([
        {
          type: 'inject-style',
          sequence: 1,
          target: document,
          owner: 'RTLX-15.9.11',
          requirementId: 'TYPOGRAPHY-001',
          styleId: 'rtlx-v15-test-style',
          cssText: '.example{direction:inherit}',
        },
      ]),
      journal
    );

    expect(result.committed).toBe(1);
    expect(document.head.querySelector('#rtlx-v15-test-style')?.textContent).toBe(
      '.example{direction:inherit}'
    );
    expect(journal.size()).toBe(1);
  });
});
