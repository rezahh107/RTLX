import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installDom } from '../dom-test-setup';
import {
  assessLayoutSafety,
  resolveDirectionTarget,
} from '../../src/content/direction-target-resolver';
import { planMutations } from '../../src/content/mutation-planner';
import { typographyOperations } from '../../src/content/typography-planner';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';
import { DIRECTION_RTL_CLASS, TYPOGRAPHY_CLASS } from '../../src/shared/constants';

beforeEach(() => {
  installDom();
  vi.stubGlobal('chrome', {
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
    },
  });
});

describe('v15.9.1 layout-safe direction targeting', () => {
  it('redirects direction from an icon-bearing flex row to its safe text owner', () => {
    document.body.innerHTML = `
      <div id="row" style="display:flex;overflow:hidden">
        <span id="text">سلام دنیا</span>
        <button id="action"><span role="img"><svg><use></use></svg></span></button>
      </div>`;
    const row = document.querySelector('#row')!;
    const text = document.querySelector('#text')!;
    const resolution = resolveDirectionTarget(text, row);

    expect(assessLayoutSafety(row)).toMatchObject({
      layoutSensitive: true,
      containsIcons: true,
      containsControls: true,
    });
    expect(resolution.element).toBe(text);
    expect(resolution.strategy).toBe('inline-isolation-only');
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
        (operation) => operation.type === 'add-attribute' && operation.target === row
      )
    ).toBe(false);
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

  it('suppresses direction mutation when direct text shares an unsafe clipped layout owner', () => {
    document.body.innerHTML = `
      <div id="row" style="display:flex;overflow:hidden">
        سلام دنیا
        <button><svg><use></use></svg></button>
      </div>`;
    const row = document.querySelector('#row')!;
    const resolution = resolveDirectionTarget(row, row);
    expect(resolution.element).toBeNull();
    expect(resolution.strategy).toBe('unavailable-layout-sensitive');

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
    expect(plan.operations).toEqual([]);
  });

  it('keeps a normal paragraph as the direction target', () => {
    document.body.innerHTML = '<p id="message">سلام <strong>دنیا</strong></p>';
    const paragraph = document.querySelector('#message')!;
    const strong = document.querySelector('strong')!;
    const resolution = resolveDirectionTarget(strong, paragraph);
    expect(resolution.element).toBe(paragraph);
    expect(resolution.strategy).toBe('semantic-block');
  });

  it('applies typography to a safe label leaf without touching its icon-bearing button', () => {
    document.body.innerHTML = `
      <button id="action" style="display:flex">
        <span role="img"><svg><use></use></svg></span>
        <span id="label">ارسال پیام</span>
      </button>`;
    const button = document.querySelector('#action')!;
    const label = document.querySelector('#label')!;
    const operations = typographyOperations(button, document, 1, DEFAULT_SETTINGS, 'start');
    const typographyTargets = operations
      .filter(
        (operation) => operation.type === 'add-class' && operation.className === TYPOGRAPHY_CLASS
      )
      .map((operation) => operation.target);
    expect(typographyTargets).toContain(label);
    expect(typographyTargets).not.toContain(button);
    expect(
      typographyTargets.some(
        (target) => target instanceof Element && target.matches('svg,use,[role=img]')
      )
    ).toBe(false);
  });
});
