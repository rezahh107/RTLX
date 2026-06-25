import {
  DIRECTION_LTR_CLASS,
  DIRECTION_OWNER_ATTRIBUTE,
  DIRECTION_RTL_CLASS,
  DIRECTION_STYLE_ELEMENT_ID,
  LIMITS,
  OWNED_CLASS,
} from '../shared/constants';
import type { Settings, DirectionAction, BidiToken } from '../shared/types';
import { assessAccessibility } from './accessibility-guard';
import type { MutationOperation } from './mutation-plan';
import { createPlan, type MutationPlan } from './mutation-plan';
import { typographyOperations } from './typography-planner';

export interface PlanningInput {
  candidate: Element;
  directionTarget: Element | null;
  alignmentTarget?: Element | null;
  listMarkerTarget?: Element | null;
  action: DirectionAction;
  settings: Settings;
  tokensByTextNode: ReadonlyMap<Text, readonly BidiToken[]>;
  root: Document | ShadowRoot;
  startSequence: number;
  applyTypography: boolean;
  remainingWrapperBudget: number;
  typographyProtectedSelectors?: readonly string[];
  typographyTargets?: readonly Element[];
  alignmentMode?: 'start' | 'preserve';
  directionOwnerToken?: string;
}

function resolveListMarkerDirection(
  action: DirectionAction,
  directionTarget: Element | null
): 'rtl' | 'ltr' | null {
  if (action === 'set-rtl-on-candidate') return 'rtl';
  if (action === 'set-ltr-on-candidate') return 'ltr';
  if (action !== 'preserve' || !directionTarget) return null;
  const explicit = directionTarget.getAttribute('dir')?.toLowerCase();
  return explicit === 'rtl' || explicit === 'ltr' ? explicit : null;
}

export function planMutations(input: PlanningInput): MutationPlan {
  const operations: MutationOperation[] = [];
  let sequence = input.startSequence;
  const wantsRtl = input.action === 'set-rtl-on-candidate';
  const wantsLtr =
    input.action === 'set-ltr-on-code-zone' || input.action === 'set-ltr-on-candidate';

  const directionTarget = input.directionTarget;
  const alignmentTarget =
    input.alignmentTarget === undefined ? directionTarget : input.alignmentTarget;
  const listMarkerDirection = resolveListMarkerDirection(input.action, directionTarget);

  if ((wantsRtl || wantsLtr) && directionTarget && !directionTarget.hasAttribute('dir')) {
    operations.push({
      type: 'add-attribute',
      sequence: sequence++,
      target: directionTarget,
      owner: 'RTLX-15.9.11',
      requirementId: wantsRtl ? 'DIRECTION-DECISION-001' : 'LANGUAGE-DIRECTION-001',
      name: 'dir',
      value: wantsRtl ? 'rtl' : 'ltr',
      expectedCurrentValue: null,
    });
    if (input.directionOwnerToken && !directionTarget.hasAttribute(DIRECTION_OWNER_ATTRIBUTE))
      operations.push({
        type: 'add-attribute',
        sequence: sequence++,
        target: directionTarget,
        owner: 'RTLX-15.9.11',
        requirementId: 'MUTATION-OWNERSHIP-002',
        name: DIRECTION_OWNER_ATTRIBUTE,
        value: input.directionOwnerToken,
        expectedCurrentValue: null,
      });
  }
  const listMarkerTarget = input.settings.listRepair ? input.listMarkerTarget : null;
  if (
    listMarkerDirection &&
    listMarkerTarget &&
    listMarkerTarget !== directionTarget &&
    !listMarkerTarget.hasAttribute('dir')
  ) {
    operations.push({
      type: 'add-attribute',
      sequence: sequence++,
      target: listMarkerTarget,
      owner: 'RTLX-15.9.11',
      requirementId: 'LIST-MARKER-DIRECTION-001',
      name: 'dir',
      value: listMarkerDirection,
      expectedCurrentValue: null,
    });
    if (input.directionOwnerToken && !listMarkerTarget.hasAttribute(DIRECTION_OWNER_ATTRIBUTE))
      operations.push({
        type: 'add-attribute',
        sequence: sequence++,
        target: listMarkerTarget,
        owner: 'RTLX-15.9.11',
        requirementId: 'MUTATION-OWNERSHIP-002',
        name: DIRECTION_OWNER_ATTRIBUTE,
        value: input.directionOwnerToken,
        expectedCurrentValue: null,
      });
  }
  if ((wantsRtl || wantsLtr) && alignmentTarget && (input.alignmentMode ?? 'start') === 'start') {
    operations.push({
      type: 'inject-style',
      sequence: sequence++,
      target: input.root,
      owner: 'RTLX-15.9.11',
      requirementId: 'LANGUAGE-ALIGNMENT-001',
      styleId: DIRECTION_STYLE_ELEMENT_ID,
      cssText: `.${DIRECTION_RTL_CLASS},.${DIRECTION_LTR_CLASS}{text-align:start!important}`,
    });
    const className = wantsRtl ? DIRECTION_RTL_CLASS : DIRECTION_LTR_CLASS;
    if (!alignmentTarget.classList.contains(className))
      operations.push({
        type: 'add-class',
        sequence: sequence++,
        target: alignmentTarget,
        owner: 'RTLX-15.9.11',
        requirementId: 'LANGUAGE-ALIGNMENT-001',
        className,
        expectedAbsent: true,
      });
  }
  if (input.settings.typography && input.applyTypography) {
    const typography = typographyOperations(
      input.candidate,
      input.root,
      sequence,
      input.settings,
      input.alignmentMode ?? 'start',
      input.typographyProtectedSelectors ?? [],
      input.typographyTargets
    );
    operations.push(...typography);
    sequence += typography.length;
  }
  if (input.settings.bidiIsolation && input.remainingWrapperBudget > 0) {
    let remaining = input.remainingWrapperBudget;
    for (const [textNode, tokens] of input.tokensByTextNode) {
      const parent = textNode.parentElement;
      if (!parent || assessAccessibility(parent) !== 'safe') continue;
      let expectedSourceText = textNode.data;
      for (const token of [...tokens]
        .slice(0, Math.min(tokens.length, LIMITS.maxTokensPerTextNode))
        .sort((a, b) => b.start - a.start)) {
        if (remaining <= 0) break;
        operations.push({
          type: 'insert-bdi-wrapper',
          sequence: sequence++,
          target: textNode,
          owner: 'RTLX-15.9.11',
          requirementId: 'BIDI-MUTATION-001',
          token,
          expectedSourceText,
        });
        expectedSourceText = expectedSourceText.slice(0, token.start);
        remaining -= 1;
      }
      if (remaining <= 0) break;
    }
  }
  if (!input.candidate.classList.contains(OWNED_CLASS) && input.settings.directionCorrection) {
    // Ownership is recorded by direction or typography operations above.
  }
  return createPlan(operations);
}
