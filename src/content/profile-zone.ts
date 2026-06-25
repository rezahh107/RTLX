import { SESSION_IGNORE_CLASS } from '../shared/constants';
import type {
  ContentLanguage,
  ProfileRule,
  RuleMatchInspection,
  ProfileSelectorGroup,
  Settings,
  SiteProfile,
  TypographyDecision,
} from '../shared/types';
import { assessAccessibility, isIconProtected } from './accessibility-guard';
import { isHardExcluded, isMutationSensitive } from './exclusion-registry';
import { classifyCodeContext } from './code-context';
const GROUP_ORDER: readonly ProfileSelectorGroup[] = Object.freeze([
  'exclude',
  'editor',
  'terminal',
  'math',
  'code',
  'mutationSensitive',
  'content',
]);
export function matchingProfileRules(
  element: Element,
  profile: SiteProfile | null
): readonly RuleMatchInspection[] {
  if (!profile) return Object.freeze([]);
  const matched: { rule: ProfileRule; profileOrder: number }[] = [];
  for (const [profileOrder, rule] of profile.rules.entries()) {
    if (!rule.enabled) continue;
    try {
      if (!element.matches(rule.selector) && !element.closest(rule.selector)) continue;
      matched.push({ rule, profileOrder });
    } catch {
      continue;
    }
  }
  matched.sort((left, right) => {
    const groupDelta = groupRank(left.rule.category) - groupRank(right.rule.category);
    if (groupDelta !== 0) return groupDelta;
    const profileDelta = left.profileOrder - right.profileOrder;
    if (profileDelta !== 0) return profileDelta;
    return left.rule.ruleId.localeCompare(right.rule.ruleId);
  });
  return Object.freeze(
    matched.map(({ rule, profileOrder }, index) =>
      Object.freeze({
        ruleId: rule.ruleId,
        category: rule.category,
        profileOrder,
        accepted: index === 0,
        reason: index === 0 ? 'first-enabled-match' : 'suppressed-later-match',
      })
    )
  );
}

function groupRank(category: ProfileRule['category']): number {
  const normalized: ProfileSelectorGroup = category === 'ignore' ? 'exclude' : category;
  const index = GROUP_ORDER.indexOf(normalized);
  return index === -1 ? GROUP_ORDER.length : index;
}

export function matchedProfileRule(
  element: Element,
  profile: SiteProfile | null
): ProfileRule | null {
  const first = matchingProfileRules(element, profile)[0];
  return first && profile ? (profile.rules[first.profileOrder] ?? null) : null;
}
export function matchedProfileGroup(
  element: Element,
  profile: SiteProfile | null
): ProfileSelectorGroup | null {
  const rule = matchedProfileRule(element, profile);
  if (rule) return rule.category === 'ignore' ? 'exclude' : rule.category;
  for (const group of GROUP_ORDER) {
    if (profile && matchesAny(element, selectorsForGroup(profile, group))) return group;
  }
  return null;
}

function selectorsForGroup(profile: SiteProfile, group: ProfileSelectorGroup): readonly string[] {
  switch (group) {
    case 'exclude':
      return profile.selectors.exclude;
    case 'editor':
      return profile.selectors.editor;
    case 'terminal':
      return profile.selectors.terminal;
    case 'math':
      return profile.selectors.math;
    case 'code':
      return profile.selectors.code;
    case 'mutationSensitive':
      return profile.selectors.mutationSensitive;
    case 'content':
      return profile.selectors.content;
  }
}

export function exclusionReason(element: Element, profile: SiteProfile | null): string | null {
  if (
    element.classList.contains(SESSION_IGNORE_CLASS) ||
    element.closest(`.${SESSION_IGNORE_CLASS}`)
  )
    return 'session-ignore';
  if (isHardExcluded(element)) return 'hard-exclusion';
  const group = matchedProfileGroup(element, profile);
  if (group === 'exclude') return 'profile-ignore';
  if (group === 'editor') return 'profile-editor';
  if (group === 'terminal') return 'profile-terminal';
  if (group === 'math') return 'profile-math';
  if (group === 'code') return 'profile-code';
  if (group === 'mutationSensitive' || isMutationSensitive(element)) return 'mutation-sensitive';
  const accessibility = assessAccessibility(element);
  return accessibility === 'safe' || accessibility === 'conditionally-safe'
    ? null
    : `accessibility-${accessibility}`;
}
export function isProfileExcluded(element: Element, profile: SiteProfile | null): boolean {
  const group = matchedProfileGroup(element, profile);
  return (
    element.classList.contains(SESSION_IGNORE_CLASS) ||
    group === 'exclude' ||
    group === 'editor' ||
    group === 'math'
  );
}
export function codeLikeSelectors(profile: SiteProfile | null): readonly string[] {
  if (!profile) return Object.freeze([]);
  return Object.freeze([...profile.selectors.code, ...profile.selectors.terminal].sort());
}
export function protectedTextSelectors(profile: SiteProfile | null): readonly string[] {
  if (!profile) return Object.freeze([]);
  return Object.freeze(
    [
      ...profile.selectors.code,
      ...profile.selectors.math,
      ...profile.selectors.editor,
      ...profile.selectors.terminal,
      ...profile.selectors.exclude,
    ].sort()
  );
}
export function typographyDecision(
  element: Element,
  settings: Settings,
  profile: SiteProfile | null,
  language: ContentLanguage
): TypographyDecision {
  if (!settings.typography) return 'disabled';
  if (isHardExcluded(element)) return 'hard-excluded';
  const group = matchedProfileGroup(element, profile);
  if (group === 'code') {
    const context = classifyCodeContext(element, codeLikeSelectors(profile));
    if (context === 'block-code' || context === 'inline-technical') return 'code-zone';
  }
  if (group === 'math') return 'math-zone';
  if (group === 'editor') return 'editor-zone';
  if (group === 'terminal') return 'terminal-zone';
  const codeContext = classifyCodeContext(element, codeLikeSelectors(profile));
  if (codeContext === 'block-code' || codeContext === 'inline-technical') return 'code-zone';
  if (isIconProtected(element)) return 'icon-protected';
  if (language !== 'persian' && language !== 'mixed') return 'not-persian';
  return element.classList.contains('rtlx-owned-candidate') ? 'applied' : 'eligible';
}
export function matchesAny(element: Element, selectors: readonly string[]): boolean {
  for (const selector of selectors) {
    try {
      if (element.matches(selector) || element.closest(selector)) return true;
    } catch {
      return false;
    }
  }
  return false;
}
