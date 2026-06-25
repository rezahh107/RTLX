import { beforeEach, describe, expect, it } from 'vitest';
import { TYPOGRAPHY_CLASS } from '../../src/shared/constants';
import { applyMutationPlan, removeJournaledClass } from '../../src/content/mutation-applier';
import { MutationJournal } from '../../src/content/mutation-journal';
import type { MutationPlan } from '../../src/content/mutation-plan';
import {
  collectTypographyBatch,
  createTypographyProtectionCursor,
  typographyProtectionReason,
} from '../../src/content/typography-planner';
import { installDom } from '../dom-test-setup';

beforeEach(() => installDom());

function commitTypographyClass(target: Element, journal: MutationJournal): void {
  const plan: MutationPlan = Object.freeze({
    createdAtSequence: 1,
    operations: Object.freeze([
      Object.freeze({
        type: 'add-class' as const,
        sequence: 1,
        target,
        owner: 'RTLX-15.9.11' as const,
        requirementId: 'TYPOGRAPHY-CASCADE-001',
        className: TYPOGRAPHY_CLASS,
        expectedAbsent: true,
      }),
    ]),
  });
  applyMutationPlan(plan, journal);
}

describe('v15.9.11 typography cache and protection reconciliation', () => {
  it('invalidates eligible to protected state and removes only the journal-owned class', () => {
    document.body.innerHTML = '<section id="root"><p id="message">متن فارسی</p></section>';
    const root = document.querySelector('#root')!;
    const message = document.querySelector('#message')!;
    const processed = new WeakMap<Text, string>();
    const initial = collectTypographyBatch(root, [], processed, 'context', 50);
    initial.fingerprints.forEach((fingerprint, node) => processed.set(node, fingerprint));
    expect(initial.targets).toEqual([message]);

    const journal = new MutationJournal();
    commitTypographyClass(message, journal);
    expect(message.classList.contains(TYPOGRAPHY_CLASS)).toBe(true);
    message.classList.add('code-block');

    const changed = collectTypographyBatch(root, ['.code-block'], processed, 'context', 50);
    expect(changed.inspectedNodes).toBe(1);
    expect(changed.targets).toEqual([]);
    expect(changed.skipped['protected-selector']).toBe(1);

    const cursor = createTypographyProtectionCursor(message, ['.code-block']);
    const protection = cursor.nextBatch(1);
    expect(protection.targets).toEqual([message]);
    expect(removeJournaledClass(message, TYPOGRAPHY_CLASS, journal)).toBe(true);
    expect(message.classList.contains(TYPOGRAPHY_CLASS)).toBe(false);
    expect(message.classList.contains('code-block')).toBe(true);
    expect(journal.size()).toBe(0);
  });

  it('invalidates protected to eligible state without changing the text', () => {
    document.body.innerHTML =
      '<section id="root"><div id="guard" class="protected"><p id="message">متن فارسی</p></div></section>';
    const root = document.querySelector('#root')!;
    const guard = document.querySelector('#guard')!;
    const message = document.querySelector('#message')!;
    const processed = new WeakMap<Text, string>();
    const protectedBatch = collectTypographyBatch(root, ['.protected'], processed, 'context', 50);
    protectedBatch.fingerprints.forEach((fingerprint, node) => processed.set(node, fingerprint));
    expect(protectedBatch.targets).toEqual([]);

    guard.classList.remove('protected');
    const eligibleBatch = collectTypographyBatch(root, ['.protected'], processed, 'context', 50);
    expect(eligibleBatch.inspectedNodes).toBe(1);
    expect(eligibleBatch.targets).toEqual([message]);
  });

  it('invalidates a stable text node when it is reparented into a protected ancestor', () => {
    document.body.innerHTML =
      '<section id="root"><div id="open"><p id="message">متن فارسی</p></div><div id="guard" contenteditable="true"></div></section>';
    const root = document.querySelector('#root')!;
    const guard = document.querySelector('#guard')!;
    const message = document.querySelector('#message')!;
    const processed = new WeakMap<Text, string>();
    const first = collectTypographyBatch(root, [], processed, 'context', 50);
    first.fingerprints.forEach((fingerprint, node) => processed.set(node, fingerprint));
    expect(first.targets).toEqual([message]);

    guard.append(message);
    const moved = collectTypographyBatch(root, [], processed, 'context', 50);
    expect(moved.inspectedNodes).toBe(1);
    expect(moved.targets).toEqual([]);
    expect(moved.skipped['code-zone']).toBe(1);
  });

  it.each([
    ['code', 'code-zone'],
    ['contenteditable', 'code-zone'],
    ['textbox', 'code-zone'],
    ['icon', 'icon-boundary'],
    ['layout', 'layout-sensitive'],
  ] as const)('classifies the %s protection dependency deterministically', (name, expected) => {
    const target = name === 'code' ? document.createElement('code') : document.createElement('div');
    target.id = 'target';
    target.textContent = name === 'code' ? 'const x = 1' : 'متن';
    if (name === 'contenteditable') target.setAttribute('contenteditable', 'true');
    if (name === 'textbox') target.setAttribute('role', 'textbox');
    if (name === 'icon') target.setAttribute('role', 'img');
    if (name === 'layout') target.setAttribute('role', 'toolbar');
    document.body.replaceChildren(target);
    expect(typographyProtectionReason(target, ['[contenteditable]', '[role="textbox"]'])).toBe(
      expected
    );
  });
});
