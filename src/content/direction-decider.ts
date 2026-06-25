import type { DirectionAction, DirectionEvidence } from '../shared/types';

export type DirectionDecisionReason =
  | 'document-root-protected'
  | 'explicit-direction-preserved'
  | 'hard-excluded'
  | 'block-code-forced-ltr'
  | 'latin-already-in-ltr-context'
  | 'confident-latin'
  | 'persian-already-in-rtl-context'
  | 'confident-persian-in-ltr-context'
  | 'confident-persian-without-context'
  | 'user-confirmation-required'
  | 'profile-preserve'
  | 'profile-force-rtl'
  | 'profile-force-ltr'
  | 'insufficient-evidence';

export interface DirectionDecision {
  action: DirectionAction;
  reason: DirectionDecisionReason;
}

export function decideDirection(evidence: DirectionEvidence): DirectionAction {
  return decideDirectionDetailed(evidence).action;
}

export function decideDirectionDetailed(evidence: DirectionEvidence): DirectionDecision {
  if (evidence.isHtmlOrBody) return decision('no-op', 'document-root-protected');
  if (evidence.localDir !== null) return decision('preserve', 'explicit-direction-preserved');
  if (evidence.hardExcluded) return decision('no-op', 'hard-excluded');
  if (evidence.codeZone) return decision('set-ltr-on-code-zone', 'block-code-forced-ltr');

  const persianLike = evidence.language === 'persian' || evidence.language === 'mixed';
  const confidentPersian = persianLike && evidence.languageConfidence >= 0.8;
  const confidentLatin = evidence.language === 'latin' && evidence.languageConfidence >= 0.8;

  if (confidentLatin) {
    if (evidence.nearestAncestorDir === 'ltr')
      return decision('preserve', 'latin-already-in-ltr-context');
    if (evidence.userMode === 'auto-safe' || evidence.userMode === 'force-candidate-rtl')
      return decision('set-ltr-on-candidate', 'confident-latin');
    return decision('no-op', 'insufficient-evidence');
  }

  if (evidence.nearestAncestorDir === 'rtl')
    return decision('preserve', 'persian-already-in-rtl-context');
  if (evidence.nearestAncestorDir === 'ltr' && confidentPersian) {
    if (evidence.userMode === 'auto-safe' || evidence.userMode === 'force-candidate-rtl')
      return decision('set-rtl-on-candidate', 'confident-persian-in-ltr-context');
    if (evidence.userConfirmedSuspiciousDirection)
      return decision('set-rtl-on-candidate', 'confident-persian-in-ltr-context');
    return decision('request-user-confirmation', 'user-confirmation-required');
  }
  if (
    (evidence.nearestAncestorDir === null || evidence.nearestAncestorDir === 'auto') &&
    confidentPersian
  ) {
    if (evidence.userMode === 'auto-safe' || evidence.userMode === 'force-candidate-rtl')
      return decision('set-rtl-on-candidate', 'confident-persian-without-context');
    if (evidence.userMode === 'ask' && evidence.userConfirmedSuspiciousDirection)
      return decision('set-rtl-on-candidate', 'confident-persian-without-context');
    return decision('request-user-confirmation', 'user-confirmation-required');
  }
  return decision('no-op', 'insufficient-evidence');
}

export function nearestExplicitDir(element: Element): 'rtl' | 'ltr' | 'auto' | null {
  let current = element.parentElement;
  while (current) {
    const value = current.getAttribute('dir');
    if (value === 'rtl' || value === 'ltr' || value === 'auto') return value;
    current = current.parentElement;
  }
  return null;
}

function decision(action: DirectionAction, reason: DirectionDecisionReason): DirectionDecision {
  return Object.freeze({ action, reason });
}
