import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import { planMutations } from '../../src/content/mutation-planner';
import { DIRECTION_OWNER_ATTRIBUTE } from '../../src/shared/constants';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';

const settings = Object.freeze({ ...DEFAULT_SETTINGS, typography: false });

describe('RTLX 15.9.11 direction ownership marker', () => {
  beforeEach(() => installDom('<html><head></head><body></body></html>'));

  it('plans the dir attribute and its runtime ownership marker together', () => {
    const element = document.createElement('p');
    document.body.append(element);
    const plan = planMutations({
      candidate: element,
      directionTarget: element,
      alignmentTarget: element,
      action: 'set-rtl-on-candidate',
      settings,
      tokensByTextNode: new Map(),
      root: document,
      startSequence: 1,
      applyTypography: false,
      remainingWrapperBudget: 0,
      directionOwnerToken: '15.9.11:test-runtime',
    });

    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'add-attribute', name: 'dir', value: 'rtl' }),
        expect.objectContaining({
          type: 'add-attribute',
          name: DIRECTION_OWNER_ATTRIBUTE,
          value: '15.9.11:test-runtime',
        }),
      ])
    );
  });
});
