import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import { planMutations } from '../../src/content/mutation-planner';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';

beforeEach(() =>
  installDom('<html><body><p id="x" dir="rtl">هذا نص عربي للاختبار</p></body></html>')
);

describe('typography planning', () => {
  it('does not apply Persian typography solely because direction is RTL', () => {
    const candidate = document.getElementById('x')!;
    const plan = planMutations({
      candidate,
      directionTarget: candidate,
      action: 'preserve',
      settings: DEFAULT_SETTINGS,
      tokensByTextNode: new Map(),
      root: document,
      startSequence: 1,
      applyTypography: false,
      remainingWrapperBudget: 500,
    });
    expect(plan.operations.some((operation) => operation.type === 'add-class')).toBe(false);
  });
});
