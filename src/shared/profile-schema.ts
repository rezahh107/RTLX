import { LIMITS } from './constants';
import { validateSelectors } from './selector-validator';
import { isRecord } from './settings';
import type {
  LegacySiteProfileV1,
  LegacySiteProfileV2,
  ProfileRule,
  ProfileRuleCategory,
  ProfileSelectorGroup,
  ProfileSelectorsV2,
  SiteProfile,
} from './types';

const PROFILE_KEYS = Object.freeze([
  'displayName',
  'features',
  'match',
  'metadata',
  'profileId',
  'profileKind',
  'profileVersion',
  'rules',
  'schemaVersion',
  'scopePolicy',
  'selectors',
  'thresholds',
]);
const V2_PROFILE_KEYS = Object.freeze([
  'displayName',
  'features',
  'match',
  'metadata',
  'profileId',
  'profileKind',
  'profileVersion',
  'schemaVersion',
  'selectors',
  'thresholds',
]);
export const SELECTOR_KEYS: readonly ProfileSelectorGroup[] = Object.freeze([
  'code',
  'content',
  'editor',
  'exclude',
  'math',
  'mutationSensitive',
  'terminal',
]);
const RULE_CATEGORIES = new Set<ProfileRuleCategory>([
  'content',
  'code',
  'math',
  'editor',
  'terminal',
  'ignore',
  'mutationSensitive',
]);

export function validateProfile(profile: unknown): asserts profile is SiteProfile {
  if (!isSiteProfile(profile)) throw new Error('Profile schema invalid');
  if (profile.rules.length > LIMITS.maxProfileRules) throw new Error('Too many rules in profile');
  const selectorGroups = SELECTOR_KEYS.map((key) => profile.selectors[key]);
  const totalSelectors = selectorGroups.reduce((total, selectors) => total + selectors.length, 0);
  if (totalSelectors > LIMITS.selectorMaxCount) throw new Error('Too many selectors in profile');
  for (const selectors of selectorGroups) {
    const result = validateSelectors(selectors);
    if (!result.ok) throw result.error;
  }
  for (const rule of profile.rules) {
    const result = validateSelectors([rule.selector]);
    if (!result.ok || result.value[0] !== rule.selector) throw new Error('Rule selector invalid');
  }
  const derived = selectorsFromRules(profile.rules);
  for (const key of SELECTOR_KEYS) {
    if (!sameStringArray(derived[key], profile.selectors[key]))
      throw new Error(`Profile selectors do not match rules: ${key}`);
  }
}

export function normalizeProfile(value: unknown): SiteProfile {
  if (isSiteProfile(value)) return freezeProfile(value);
  if (isLegacySiteProfileV2(value)) return migrateV2(value);
  if (isLegacySiteProfileV1(value)) return migrateV1(value);
  throw new Error('Profile schema invalid');
}

export function emptySelectors(): ProfileSelectorsV2 {
  return {
    content: [],
    exclude: [],
    code: [],
    math: [],
    editor: [],
    terminal: [],
    mutationSensitive: [],
  };
}

export function selectorsFromRules(rules: readonly ProfileRule[]): ProfileSelectorsV2 {
  const selectors = emptySelectors();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const group = categoryToGroup(rule.category);
    selectors[group].push(rule.selector);
  }
  for (const key of SELECTOR_KEYS) selectors[key] = [...new Set(selectors[key])].sort();
  return selectors;
}

export function rulesFromSelectors(selectors: ProfileSelectorsV2): ProfileRule[] {
  const rules: ProfileRule[] = [];
  for (const key of SELECTOR_KEYS) {
    for (const selector of [...new Set(selectors[key])].sort()) {
      const category = groupToCategory(key);
      rules.push({
        ruleId: stableRuleId(category, selector),
        selector,
        category,
        enabled: true,
        directionMode:
          category === 'code' || category === 'editor' || category === 'terminal'
            ? 'force-ltr'
            : category === 'ignore' || category === 'mutationSensitive' || category === 'math'
              ? 'preserve'
              : 'auto-safe',
        alignmentMode: category === 'content' ? 'start' : 'preserve',
        typographyMode: category === 'content' ? 'persian-only' : 'preserve',
        initialDelayMs: 0,
      });
    }
  }
  return rules.sort(compareRules);
}

export function stableRuleId(category: ProfileRuleCategory, selector: string): string {
  let hash = 0x811c9dc5;
  const input = `${category}\u0000${selector}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `rule-${hash.toString(16).padStart(8, '0')}`;
}

export function selectorGroupEntries(
  profile: SiteProfile
): readonly (readonly [ProfileSelectorGroup, readonly string[]])[] {
  return Object.freeze(
    SELECTOR_KEYS.map((key) => Object.freeze([key, profile.selectors[key]] as const))
  );
}

function migrateV2(value: LegacySiteProfileV2): SiteProfile {
  const rules = rulesFromSelectors(value.selectors);
  return freezeProfile({
    schemaVersion: '3.0.0',
    profileId: value.profileId,
    profileVersion: value.profileVersion,
    profileKind: value.profileKind,
    displayName: value.displayName,
    match: value.match,
    selectors: selectorsFromRules(rules),
    rules,
    scopePolicy: {
      mode: isAiProduct(value.metadata.product) ? 'conversation' : 'site',
      pathDepth: 2,
    },
    features: value.features,
    thresholds: value.thresholds,
    metadata: {
      source: value.metadata.source,
      verification: value.metadata.verification,
      product: value.metadata.product,
    },
  });
}

function migrateV1(value: LegacySiteProfileV1): SiteProfile {
  const displayName = `Migrated profile: ${value.profileId.replace(/^host:/u, '')}`;
  const selectors: ProfileSelectorsV2 = {
    content: value.selectors.content,
    exclude: value.selectors.exclude,
    code: value.selectors.code,
    math: [],
    editor: [],
    terminal: [],
    mutationSensitive: value.selectors.mutationSensitive,
  };
  const rules = rulesFromSelectors(selectors);
  return freezeProfile({
    schemaVersion: '3.0.0',
    profileId: value.profileId,
    profileVersion: value.profileVersion,
    profileKind: 'user',
    displayName,
    match: value.match,
    selectors: selectorsFromRules(rules),
    rules,
    scopePolicy: { mode: 'site', pathDepth: 2 },
    features: value.features,
    thresholds: value.thresholds,
    metadata: { source: 'imported', verification: 'unverified', product: null },
  });
}

function isSiteProfile(value: unknown): value is SiteProfile {
  if (!isRecord(value) || !hasExactKeys(value, PROFILE_KEYS)) return false;
  if (
    value.schemaVersion !== '3.0.0' ||
    typeof value.profileId !== 'string' ||
    !/^(?:official|user|host):[A-Za-z0-9.-]+$/u.test(value.profileId) ||
    !Number.isInteger(value.profileVersion) ||
    Number(value.profileVersion) < 1 ||
    (value.profileKind !== 'bundled' && value.profileKind !== 'user') ||
    typeof value.displayName !== 'string' ||
    value.displayName.length < 1 ||
    value.displayName.length > 100 ||
    !isMatch(value.match) ||
    !isSelectors(value.selectors) ||
    !Array.isArray(value.rules) ||
    !value.rules.every(isProfileRule) ||
    !isScopePolicy(value.scopePolicy) ||
    !isFeatures(value.features) ||
    !isThresholds(value.thresholds) ||
    !isMetadata(value.metadata)
  )
    return false;
  return true;
}

function isLegacySiteProfileV2(value: unknown): value is LegacySiteProfileV2 {
  if (!isRecord(value) || !hasExactKeys(value, V2_PROFILE_KEYS)) return false;
  return (
    value.schemaVersion === '2.0.0' &&
    typeof value.profileId === 'string' &&
    /^(?:official|user|host):[A-Za-z0-9.-]+$/u.test(value.profileId) &&
    Number.isInteger(value.profileVersion) &&
    Number(value.profileVersion) >= 1 &&
    (value.profileKind === 'bundled' || value.profileKind === 'user') &&
    typeof value.displayName === 'string' &&
    isMatch(value.match) &&
    isSelectors(value.selectors) &&
    isFeatures(value.features) &&
    isThresholds(value.thresholds) &&
    isLegacyMetadata(value.metadata)
  );
}

function isLegacySiteProfileV1(value: unknown): value is LegacySiteProfileV1 {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'features',
      'match',
      'profileId',
      'profileVersion',
      'schemaVersion',
      'selectors',
      'thresholds',
    ])
  )
    return false;
  return (
    value.schemaVersion === '1.0.0' &&
    typeof value.profileId === 'string' &&
    /^host:[A-Za-z0-9.-]+$/u.test(value.profileId) &&
    Number.isInteger(value.profileVersion) &&
    Number(value.profileVersion) >= 1 &&
    isMatch(value.match) &&
    isRecord(value.selectors) &&
    hasExactKeys(value.selectors, ['code', 'content', 'exclude', 'mutationSensitive']) &&
    isStringArray(value.selectors.content) &&
    isStringArray(value.selectors.exclude) &&
    isStringArray(value.selectors.code) &&
    isStringArray(value.selectors.mutationSensitive) &&
    isFeatures(value.features) &&
    isThresholds(value.thresholds)
  );
}

function isProfileRule(value: unknown): value is ProfileRule {
  if (
    !isRecord(value) ||
    !hasRequiredAndOptionalKeys(
      value,
      [
        'alignmentMode',
        'category',
        'directionMode',
        'enabled',
        'initialDelayMs',
        'ruleId',
        'selector',
        'typographyMode',
      ],
      ['alternativeGroup', 'healthExpectation']
    )
  )
    return false;
  return (
    typeof value.ruleId === 'string' &&
    /^rule-[0-9a-f]{8}$/u.test(value.ruleId) &&
    typeof value.selector === 'string' &&
    value.selector.length > 0 &&
    value.selector.length <= LIMITS.selectorMaxLength &&
    typeof value.category === 'string' &&
    RULE_CATEGORIES.has(value.category as ProfileRuleCategory) &&
    typeof value.enabled === 'boolean' &&
    (value.directionMode === 'auto-safe' ||
      value.directionMode === 'force-rtl' ||
      value.directionMode === 'force-ltr' ||
      value.directionMode === 'preserve') &&
    (value.alignmentMode === 'start' || value.alignmentMode === 'preserve') &&
    (value.typographyMode === 'persian-only' || value.typographyMode === 'preserve') &&
    Number.isInteger(value.initialDelayMs) &&
    Number(value.initialDelayMs) >= 0 &&
    Number(value.initialDelayMs) <= LIMITS.maxRuleDelayMs &&
    (value.healthExpectation === undefined ||
      value.healthExpectation === 'required' ||
      value.healthExpectation === 'optional') &&
    (value.alternativeGroup === undefined ||
      (typeof value.alternativeGroup === 'string' &&
        /^[A-Za-z0-9._-]{1,64}$/u.test(value.alternativeGroup))) &&
    value.ruleId === stableRuleId(value.category as ProfileRuleCategory, value.selector)
  );
}

function isScopePolicy(value: unknown): value is SiteProfile['scopePolicy'] {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['mode', 'pathDepth']) &&
    (value.mode === 'site' || value.mode === 'conversation') &&
    (value.pathDepth === 1 || value.pathDepth === 2 || value.pathDepth === 3)
  );
}

function isMatch(value: unknown): value is SiteProfile['match'] {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['hosts', 'pathPrefixes']) &&
    isStringArray(value.hosts, 32) &&
    value.hosts.length > 0 &&
    value.hosts.every(isHostname) &&
    isStringArray(value.pathPrefixes, 64) &&
    value.pathPrefixes.length > 0 &&
    value.pathPrefixes.every((path) => path.startsWith('/'))
  );
}
function isSelectors(value: unknown): value is ProfileSelectorsV2 {
  return (
    isRecord(value) &&
    hasExactKeys(value, SELECTOR_KEYS) &&
    SELECTOR_KEYS.every((key) => isStringArray(value[key]))
  );
}
function isFeatures(value: unknown): value is SiteProfile['features'] {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['bidi', 'direction', 'shadowOpen', 'typography']) &&
    Object.values(value).every((entry) => typeof entry === 'boolean')
  );
}
function isThresholds(value: unknown): value is Readonly<Record<string, number>> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  );
}
function isMetadata(value: unknown): value is SiteProfile['metadata'] {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['product', 'source', 'verification']) &&
    (value.source === 'official' ||
      value.source === 'user-picker' ||
      value.source === 'imported' ||
      value.source === 'community') &&
    (value.verification === 'verified-fixture' ||
      value.verification === 'synthetic-fixture' ||
      value.verification === 'user-authored' ||
      value.verification === 'signature-verified' ||
      value.verification === 'unverified') &&
    (value.product === null || (typeof value.product === 'string' && value.product.length <= 80))
  );
}
function isLegacyMetadata(value: unknown): value is LegacySiteProfileV2['metadata'] {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['product', 'source', 'verification']) &&
    (value.source === 'official' ||
      value.source === 'user-picker' ||
      value.source === 'imported') &&
    (value.verification === 'verified-fixture' ||
      value.verification === 'synthetic-fixture' ||
      value.verification === 'user-authored' ||
      value.verification === 'unverified') &&
    (value.product === null || typeof value.product === 'string')
  );
}

function freezeProfile(profile: SiteProfile): SiteProfile {
  const rules = [...profile.rules].map((rule) => Object.freeze({ ...rule })).sort(compareRules);
  const selectors = selectorsFromRules(rules);
  return Object.freeze({
    ...profile,
    match: Object.freeze({
      hosts: Object.freeze(
        [...new Set(profile.match.hosts.map((host) => host.toLowerCase()))].sort()
      ),
      pathPrefixes: Object.freeze([...new Set(profile.match.pathPrefixes)].sort()),
    }),
    selectors: Object.freeze(
      Object.fromEntries(SELECTOR_KEYS.map((key) => [key, Object.freeze([...selectors[key]])]))
    ) as unknown as ProfileSelectorsV2,
    rules: Object.freeze(rules),
    scopePolicy: Object.freeze({ ...profile.scopePolicy }),
    features: Object.freeze({ ...profile.features }),
    thresholds: Object.freeze(
      Object.fromEntries(
        Object.entries(profile.thresholds).sort(([a], [b]) => a.localeCompare(b, 'en'))
      )
    ),
    metadata: Object.freeze({ ...profile.metadata }),
  }) as SiteProfile;
}

function compareRules(a: ProfileRule, b: ProfileRule): number {
  return (
    a.category.localeCompare(b.category, 'en') ||
    a.selector.localeCompare(b.selector, 'en') ||
    a.ruleId.localeCompare(b.ruleId, 'en')
  );
}
function categoryToGroup(category: ProfileRuleCategory): ProfileSelectorGroup {
  return category === 'ignore' ? 'exclude' : category;
}
function groupToCategory(group: ProfileSelectorGroup): ProfileRuleCategory {
  return group === 'exclude' ? 'ignore' : group;
}
function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function hasRequiredAndOptionalKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[]
): boolean {
  const keys = Object.keys(value);
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => key in value) && keys.every((key) => allowed.has(key));
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}
function isStringArray(value: unknown, max: number = LIMITS.selectorMaxCount): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= max &&
    value.every((item) => typeof item === 'string' && item.length > 0)
  );
}
function isHostname(value: string): boolean {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/iu.test(
    value
  );
}
function isAiProduct(product: string | null): boolean {
  return (
    product !== null &&
    [
      'ChatGPT',
      'Claude',
      'Gemini',
      'DeepSeek',
      'Copilot',
      'Perplexity',
      'NotebookLM',
      'Qwen',
    ].includes(product)
  );
}
