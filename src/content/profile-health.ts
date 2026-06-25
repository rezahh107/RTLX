import { LIMITS } from '../shared/constants';
import type {
  ProfileHealthReport,
  ProfileHealthStatus,
  ProfileRuleHealth,
  SiteProfile,
  ProfileRuleCategory,
} from '../shared/types';

export type ProfileHealthRoot = Document | ShadowRoot;

export function evaluateProfileHealth(
  root: ProfileHealthRoot | readonly ProfileHealthRoot[],
  profile: SiteProfile | null,
  now: () => Date = () => new Date()
): ProfileHealthReport {
  if (!profile) {
    return Object.freeze({
      schemaVersion: '1.1.0',
      profileId: null,
      profileVersion: null,
      profileMode: 'none',
      status: 'not-applicable',
      checkedAt: now().toISOString(),
      maxMatchesPerRule: LIMITS.profileHealthMaxMatchesPerRule,
      rules: Object.freeze([]),
    });
  }

  const roots = Array.isArray(root) ? root : [root];
  const rules: ProfileRuleHealth[] = profile.rules.map((rule) => {
    if (!rule.enabled) {
      return Object.freeze({
        ruleId: rule.ruleId,
        category: rule.category,
        impact: impactForCategory(rule.category),
        status: 'disabled',
        matchCount: 0,
      });
    }
    try {
      const matchCount = roots.reduce(
        (total, current) => total + current.querySelectorAll(rule.selector).length,
        0
      );
      const status: ProfileHealthStatus =
        matchCount === 0
          ? 'no-match'
          : matchCount > LIMITS.profileHealthMaxMatchesPerRule
            ? 'excessive-match'
            : 'healthy';
      return Object.freeze({
        ruleId: rule.ruleId,
        category: rule.category,
        impact: impactForCategory(rule.category),
        status,
        matchCount,
      });
    } catch {
      return Object.freeze({
        ruleId: rule.ruleId,
        category: rule.category,
        impact: impactForCategory(rule.category),
        status: 'invalid-selector',
        matchCount: 0,
      });
    }
  });

  const active = rules.filter((rule) => rule.status !== 'disabled');
  const ruleHealthById = new Map(active.map((rule) => [rule.ruleId, rule] as const));
  const semanticRules = profile.rules
    .filter((rule) => rule.enabled && rule.category === 'content')
    .map((rule) => Object.freeze({ rule, health: ruleHealthById.get(rule.ruleId)! }));
  const semanticAllNoMatch =
    semanticRules.length > 0 && semanticRules.every(({ health }) => health.status === 'no-match');
  const requiredStandaloneMissing = semanticRules.some(
    ({ rule, health }) =>
      !rule.alternativeGroup &&
      rule.healthExpectation !== 'optional' &&
      health.status === 'no-match'
  );
  const alternativeGroups = new Map<string, typeof semanticRules>();
  for (const entry of semanticRules) {
    if (!entry.rule.alternativeGroup) continue;
    const group = alternativeGroups.get(entry.rule.alternativeGroup) ?? [];
    alternativeGroups.set(entry.rule.alternativeGroup, [...group, entry]);
  }
  const requiredAlternativeGroupMissing = [...alternativeGroups.values()].some(
    (group) =>
      group.some(({ rule }) => rule.healthExpectation !== 'optional') &&
      group.every(({ health }) => health.status === 'no-match')
  );
  const status: ProfileHealthStatus = active.some((rule) => rule.status === 'invalid-selector')
    ? 'invalid-selector'
    : active.some((rule) => rule.status === 'excessive-match')
      ? 'excessive-match'
      : semanticAllNoMatch
        ? 'no-match'
        : requiredStandaloneMissing || requiredAlternativeGroupMissing
          ? 'degraded'
          : 'healthy';

  return Object.freeze({
    schemaVersion: '1.1.0',
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    profileMode: semanticRules.length > 0 ? 'semantic-assisted' : 'protective-only',
    status,
    checkedAt: now().toISOString(),
    maxMatchesPerRule: LIMITS.profileHealthMaxMatchesPerRule,
    rules: Object.freeze(rules),
  });
}

function impactForCategory(category: ProfileRuleCategory): 'semantic' | 'protective' {
  return category === 'content' ? 'semantic' : 'protective';
}
