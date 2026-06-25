import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDirectionTarget } from '../../src/content/direction-target-resolver';
import { planMutations } from '../../src/content/mutation-planner';
import { typographyOperations } from '../../src/content/typography-planner';
import { DIRECTION_OWNER_ATTRIBUTE } from '../../src/shared/constants';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';
import { installDom } from '../dom-test-setup';

beforeEach(() => {
  installDom();
  vi.stubGlobal('chrome', {
    runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
  });
});

describe('v15.9.11 list marker direction ownership', () => {
  it('targets the nearest list item while keeping the paragraph as the text target', () => {
    document.body.innerHTML = '<ul><li id="item"><p id="text">متن فارسی</p></li></ul>';
    const paragraph = document.querySelector('#text')!;
    const item = document.querySelector('#item')!;

    const resolution = resolveDirectionTarget(paragraph, paragraph);

    expect(resolution.element).toBe(paragraph);
    expect(resolution.listMarkerElement).toBe(item);
  });

  it('adds owned RTL direction to the marker owner without duplicating the text target', () => {
    document.body.innerHTML = '<ul><li id="item"><p id="text">متن فارسی</p></li></ul>';
    const paragraph = document.querySelector('#text')!;
    const item = document.querySelector('#item')!;
    const resolution = resolveDirectionTarget(paragraph, paragraph);

    const plan = planMutations({
      candidate: paragraph,
      directionTarget: resolution.element,
      alignmentTarget: resolution.alignmentElement,
      listMarkerTarget: resolution.listMarkerElement,
      action: 'set-rtl-on-candidate',
      settings: { ...DEFAULT_SETTINGS, typography: false, bidiIsolation: false, listRepair: true },
      tokensByTextNode: new Map(),
      root: document,
      startSequence: 1,
      applyTypography: false,
      remainingWrapperBudget: 0,
      directionOwnerToken: '15.9.11:test-runtime',
    });

    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'add-attribute',
          target: paragraph,
          name: 'dir',
          value: 'rtl',
        }),
        expect.objectContaining({
          type: 'add-attribute',
          target: item,
          name: 'dir',
          value: 'rtl',
          requirementId: 'LIST-MARKER-DIRECTION-001',
        }),
        expect.objectContaining({
          type: 'add-attribute',
          target: item,
          name: DIRECTION_OWNER_ATTRIBUTE,
          value: '15.9.11:test-runtime',
        }),
      ])
    );
  });

  it('preserves an explicit list-item direction', () => {
    document.body.innerHTML = '<ul><li id="item" dir="ltr"><p id="text">متن فارسی</p></li></ul>';
    const paragraph = document.querySelector('#text')!;
    const item = document.querySelector('#item')!;
    const resolution = resolveDirectionTarget(paragraph, paragraph);

    const plan = planMutations({
      candidate: paragraph,
      directionTarget: resolution.element,
      alignmentTarget: resolution.alignmentElement,
      listMarkerTarget: resolution.listMarkerElement,
      action: 'set-rtl-on-candidate',
      settings: { ...DEFAULT_SETTINGS, typography: false, bidiIsolation: false, listRepair: true },
      tokensByTextNode: new Map(),
      root: document,
      startSequence: 1,
      applyTypography: false,
      remainingWrapperBudget: 0,
      directionOwnerToken: '15.9.11:test-runtime',
    });

    expect(
      plan.operations.some(
        (operation) =>
          operation.type === 'add-attribute' &&
          operation.target === item &&
          operation.name === 'dir'
      )
    ).toBe(false);
  });

  it('does not mutate a marker owner when list repair is disabled', () => {
    document.body.innerHTML = '<ul><li id="item"><p id="text">متن فارسی</p></li></ul>';
    const paragraph = document.querySelector('#text')!;
    const item = document.querySelector('#item')!;
    const resolution = resolveDirectionTarget(paragraph, paragraph);

    const plan = planMutations({
      candidate: paragraph,
      directionTarget: resolution.element,
      alignmentTarget: resolution.alignmentElement,
      listMarkerTarget: resolution.listMarkerElement,
      action: 'set-rtl-on-candidate',
      settings: { ...DEFAULT_SETTINGS, typography: false, bidiIsolation: false, listRepair: false },
      tokensByTextNode: new Map(),
      root: document,
      startSequence: 1,
      applyTypography: false,
      remainingWrapperBudget: 0,
      directionOwnerToken: '15.9.11:test-runtime',
    });

    expect(
      plan.operations.some(
        (operation) => operation.type === 'add-attribute' && operation.target === item
      )
    ).toBe(false);
  });

  it('uses the nearest list item for nested lists', () => {
    document.body.innerHTML = `
      <ul><li id="outer">متن والد<ul><li id="inner"><p id="text">Nested English</p></li></ul></li></ul>`;
    const paragraph = document.querySelector('#text')!;
    const inner = document.querySelector('#inner')!;

    expect(resolveDirectionTarget(paragraph, paragraph).listMarkerElement).toBe(inner);
  });

  it('emits marker CSS only for RTLX-owned list directions', () => {
    document.body.innerHTML = '<p id="text">متن فارسی</p>';
    const paragraph = document.querySelector('#text')!;
    const operations = typographyOperations(
      paragraph,
      document,
      1,
      { ...DEFAULT_SETTINGS, listRepair: true },
      'start'
    );
    const style = operations.find((operation) => operation.type === 'inject-style');

    expect(style && style.type === 'inject-style' ? style.cssText : '').toContain(
      `li[${DIRECTION_OWNER_ATTRIBUTE}][dir="rtl"]::marker{direction:rtl;unicode-bidi:isolate}`
    );
  });
});
