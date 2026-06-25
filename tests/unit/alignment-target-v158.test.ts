import { beforeEach, describe, expect, it } from 'vitest';
import { resolveDirectionTarget } from '../../src/content/direction-target-resolver';
import { planMutations } from '../../src/content/mutation-planner';
import { DIRECTION_RTL_CLASS, DIRECTION_STYLE_ELEMENT_ID } from '../../src/shared/constants';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';
import { installDom } from '../dom-test-setup';

beforeEach(() => installDom());

describe('v15.9.1 separate direction and alignment targets', () => {
  it('uses inline direction isolation without applying block alignment to a span', () => {
    document.body.innerHTML = `
      <div id="row" style="display:flex"><span id="text">سلام</span><button>Action</button></div>`;
    const row = document.querySelector('#row')!;
    const text = document.querySelector('#text')!;
    const resolution = resolveDirectionTarget(text, row);
    expect(resolution.element).toBe(text);
    expect(resolution.alignmentElement).toBeNull();

    const plan = planMutations({
      candidate: row,
      directionTarget: resolution.element,
      alignmentTarget: resolution.alignmentElement,
      action: 'set-rtl-on-candidate',
      settings: { ...DEFAULT_SETTINGS, typography: false, bidiIsolation: false },
      tokensByTextNode: new Map(),
      root: document,
      startSequence: 1,
      applyTypography: false,
      remainingWrapperBudget: 0,
    });

    expect(
      plan.operations.some(
        (operation) =>
          operation.type === 'add-attribute' &&
          operation.target === text &&
          operation.name === 'dir' &&
          operation.value === 'rtl'
      )
    ).toBe(true);
    expect(
      plan.operations.some(
        (operation) =>
          operation.type === 'add-class' &&
          operation.target === text &&
          operation.className === DIRECTION_RTL_CLASS
      )
    ).toBe(false);
  });

  it('uses logical start alignment on a block-capable target', () => {
    document.body.innerHTML = '<p id="message">سلام دنیا</p>';
    const paragraph = document.querySelector('#message')!;
    const resolution = resolveDirectionTarget(paragraph, paragraph);
    expect(resolution.alignmentElement).toBe(paragraph);

    const plan = planMutations({
      candidate: paragraph,
      directionTarget: resolution.element,
      alignmentTarget: resolution.alignmentElement,
      action: 'set-rtl-on-candidate',
      settings: { ...DEFAULT_SETTINGS, typography: false, bidiIsolation: false },
      tokensByTextNode: new Map(),
      root: document,
      startSequence: 1,
      applyTypography: false,
      remainingWrapperBudget: 0,
    });

    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'add-class',
          target: paragraph,
          className: DIRECTION_RTL_CLASS,
        }),
        expect.objectContaining({
          type: 'inject-style',
          styleId: DIRECTION_STYLE_ELEMENT_ID,
          cssText: expect.stringContaining('text-align:start!important'),
        }),
      ])
    );
  });
});
