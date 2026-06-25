import { DIRECTION_OWNER_ATTRIBUTE } from '../shared/constants';
import { classifyCodeContext } from './code-context';
import { firstStrongDirection } from './language-classifier';
import { classifyPreElement } from './code-zone-classifier';
import { createPlan, type MutationPlan, type MutationOperation } from './mutation-plan';

export function planCodeZones(
  candidate: Element,
  startSequence: number,
  profileSelectors: readonly string[] = [],
  directionOwnerToken?: string
): MutationPlan {
  const operations: MutationOperation[] = [];
  let sequence = startSequence;
  const elements: Element[] = [];
  if (candidate.matches('code,kbd,samp,var,pre')) elements.push(candidate);
  elements.push(...candidate.querySelectorAll('code,kbd,samp,var,pre'));
  for (const selector of profileSelectors) {
    try {
      if (candidate.matches(selector)) elements.push(candidate);
      elements.push(...candidate.querySelectorAll(selector));
    } catch {
      continue;
    }
  }
  for (const element of [...new Set(elements)]) {
    if (element.hasAttribute('dir')) continue;
    const context = classifyCodeContext(element, profileSelectors);
    let value: 'ltr' | 'auto' = 'ltr';
    if (element instanceof HTMLPreElement && !classifyPreElement(element).codeLike) {
      const direction = firstStrongDirection(element.textContent ?? '');
      if (direction === 'unknown') continue;
      value = 'auto';
    } else if (context === 'inline-natural-rtl' || context === 'inline-natural-ltr') {
      value = 'auto';
    }
    operations.push({
      type: 'add-attribute',
      sequence: sequence++,
      target: element,
      owner: 'RTLX-15.9.11',
      requirementId: 'CODE-DIRECTION-002',
      name: 'dir',
      value,
      expectedCurrentValue: null,
    });
    if (directionOwnerToken && !element.hasAttribute(DIRECTION_OWNER_ATTRIBUTE))
      operations.push({
        type: 'add-attribute',
        sequence: sequence++,
        target: element,
        owner: 'RTLX-15.9.11',
        requirementId: 'MUTATION-OWNERSHIP-002',
        name: DIRECTION_OWNER_ATTRIBUTE,
        value: directionOwnerToken,
        expectedCurrentValue: null,
      });
  }
  return createPlan(operations);
}
