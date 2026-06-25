import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import { planMutationIntake } from '../../src/content/mutation-intake';

function mutationRecord(
  type: MutationRecordType,
  target: Node,
  options: {
    added?: readonly Node[];
    removed?: readonly Node[];
    attributeName?: string | null;
  } = {}
): MutationRecord {
  return {
    type,
    target,
    addedNodes: (options.added ?? []) as unknown as NodeList,
    removedNodes: (options.removed ?? []) as unknown as NodeList,
    previousSibling: null,
    nextSibling: null,
    attributeName: options.attributeName ?? null,
    attributeNamespace: null,
    oldValue: null,
  };
}

describe('RTLX 15.9.11 mutation intake narrowing', () => {
  beforeEach(() => {
    installDom(
      '<html><body><main id="root"><div id="response"><p id="block">سلام</p></div></main></body></html>'
    );
  });

  it('discovers a newly inserted inline element without promoting its large parent', () => {
    const response = document.querySelector('#response')!;
    const span = document.createElement('span');
    span.textContent = ' تازه';
    response.append(span);
    const plan = planMutationIntake(mutationRecord('childList', response, { added: [span] }));
    expect(plan.discoveryRoots).toEqual([span]);
    expect(plan.directCandidates).toEqual([]);
    expect(plan.invalidateTextBlockEnumeration).toBe(false);
  });

  it('invalidates enumeration when a structural text block is inserted', () => {
    const response = document.querySelector('#response')!;
    const paragraph = document.createElement('p');
    paragraph.textContent = 'پاراگراف تازه';
    response.append(paragraph);
    const plan = planMutationIntake(mutationRecord('childList', response, { added: [paragraph] }));
    expect(plan.discoveryRoots).toEqual([paragraph]);
    expect(plan.invalidateTextBlockEnumeration).toBe(true);
  });

  it('queues only the text-node parent for a new text node', () => {
    const block = document.querySelector('#block')!;
    const text = document.createTextNode(' ادامه');
    block.append(text);
    const plan = planMutationIntake(mutationRecord('childList', block, { added: [text] }));
    expect(plan.discoveryRoots).toEqual([]);
    expect(plan.directCandidates).toEqual([block]);
    expect(plan.invalidateTextBlockEnumeration).toBe(false);
  });

  it('reprocesses the mutation parent for removal without rescanning its subtree', () => {
    const response = document.querySelector('#response')!;
    const removed = document.createElement('span');
    removed.textContent = 'حذف';
    const plan = planMutationIntake(mutationRecord('childList', response, { removed: [removed] }));
    expect(plan.discoveryRoots).toEqual([]);
    expect(plan.directCandidates).toEqual([response]);
    expect(plan.invalidateTextBlockEnumeration).toBe(false);
  });

  it('invalidates protection-sensitive attributes but not dir-only updates', () => {
    const block = document.querySelector('#block')!;
    const classPlan = planMutationIntake(
      mutationRecord('attributes', block, { attributeName: 'class' })
    );
    const dirPlan = planMutationIntake(
      mutationRecord('attributes', block, { attributeName: 'dir' })
    );
    expect(classPlan.invalidateTextBlockEnumeration).toBe(true);
    expect(dirPlan.invalidateTextBlockEnumeration).toBe(false);
    expect(dirPlan.directCandidates).toEqual([block]);
  });
});
