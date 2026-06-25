import { canonicalize, type CanonicalJson } from './canonical-json';
import { PRODUCT_VERSION } from './constants';
import {
  emptySelectors,
  normalizeProfile,
  selectorsFromRules,
  stableRuleId,
  validateProfile,
} from './profile-schema';
import type { PickerSelection, ProfileExportPackage, ProfileRule, SiteProfile } from './types';

const KIND_TO_CATEGORY = Object.freeze({
  content: 'content',
  code: 'code',
  math: 'math',
  editor: 'editor',
  terminal: 'terminal',
  ignore: 'ignore',
} as const);

export function addSelectionToProfile(
  hostname: string,
  selection: PickerSelection,
  current: SiteProfile | null
): SiteProfile {
  const normalizedHost = normalizeHostname(hostname);
  if (selection.hostname !== normalizedHost) throw new Error('Selection hostname mismatch');
  const base = current ?? createEmptyUserProfile(normalizedHost);
  if (base.profileKind !== 'user') throw new Error('Bundled profiles cannot be modified');
  const category = KIND_TO_CATEGORY[selection.kind];
  const rule: ProfileRule = {
    ruleId: stableRuleId(category, selection.selector),
    selector: selection.selector,
    category,
    enabled: true,
    directionMode: selection.directionMode,
    alignmentMode: selection.alignmentMode,
    typographyMode: selection.typographyMode,
    initialDelayMs: selection.initialDelayMs,
  };
  const rules = base.rules.filter((candidate) => candidate.ruleId !== rule.ruleId);
  const existing = base.rules.find((candidate) => candidate.ruleId === rule.ruleId);
  rules.push(rule);
  const changed = JSON.stringify(existing ?? null) !== JSON.stringify(rule);
  return finalize({
    ...base,
    profileVersion: changed ? base.profileVersion + 1 : base.profileVersion,
    rules,
    selectors: selectorsFromRules(rules),
    metadata: { source: 'user-picker', verification: 'user-authored', product: null },
  });
}

export function updateProfileRule(
  profile: SiteProfile,
  ruleId: string,
  patch: Partial<
    Pick<
      ProfileRule,
      'enabled' | 'directionMode' | 'alignmentMode' | 'typographyMode' | 'initialDelayMs'
    >
  >
): SiteProfile {
  if (profile.profileKind !== 'user') throw new Error('Bundled profiles cannot be modified');
  let found = false;
  const rules = profile.rules.map((rule) => {
    if (rule.ruleId !== ruleId) return rule;
    found = true;
    return { ...rule, ...patch };
  });
  if (!found) throw new Error('Profile rule not found');
  return finalize({
    ...profile,
    profileVersion: profile.profileVersion + 1,
    rules,
    selectors: selectorsFromRules(rules),
  });
}

export function deleteProfileRule(profile: SiteProfile, ruleId: string): SiteProfile {
  if (profile.profileKind !== 'user') throw new Error('Bundled profiles cannot be modified');
  const rules = profile.rules.filter((rule) => rule.ruleId !== ruleId);
  if (rules.length === profile.rules.length) throw new Error('Profile rule not found');
  return finalize({
    ...profile,
    profileVersion: profile.profileVersion + 1,
    rules,
    selectors: selectorsFromRules(rules),
  });
}

export function createEmptyUserProfile(hostname: string): SiteProfile {
  const normalizedHost = normalizeHostname(hostname);
  return finalize({
    schemaVersion: '3.0.0',
    profileId: `user:${normalizedHost}`,
    profileVersion: 1,
    profileKind: 'user',
    displayName: `Custom profile — ${normalizedHost}`,
    match: { hosts: [normalizedHost], pathPrefixes: ['/'] },
    selectors: emptySelectors(),
    rules: [],
    scopePolicy: { mode: 'site', pathDepth: 2 },
    features: { direction: true, bidi: true, typography: true, shadowOpen: true },
    thresholds: {},
    metadata: { source: 'user-picker', verification: 'user-authored', product: null },
  });
}

export function exportProfiles(profiles: readonly SiteProfile[]): string {
  const normalized = profiles
    .map(normalizeProfile)
    .sort((a, b) => a.profileId.localeCompare(b.profileId, 'en'));
  const packageValue: ProfileExportPackage = {
    schemaVersion: '2.0.0',
    productVersion: PRODUCT_VERSION,
    profiles: normalized,
  };
  return `${canonicalize(packageValue as unknown as CanonicalJson)}\n`;
}

export function importProfiles(value: unknown): readonly SiteProfile[] {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join('|') !== 'productVersion|profiles|schemaVersion' ||
    (value.schemaVersion !== '2.0.0' && value.schemaVersion !== '1.0.0') ||
    (value.productVersion !== PRODUCT_VERSION &&
      value.productVersion !== '14.0.0' &&
      value.productVersion !== '13.0.0') ||
    !Array.isArray(value.profiles)
  )
    throw new Error('Profile import package invalid');
  if (value.profiles.length > 100) throw new Error('Profile import limit exceeded');
  const profiles = value.profiles.map((entry) => normalizeProfile(entry));
  for (const profile of profiles) validateProfile(profile);
  if (profiles.some((profile) => profile.profileKind !== 'user'))
    throw new Error('Only user profiles may be imported');
  const ids = profiles.map((profile) => profile.profileId);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate profile IDs');
  return Object.freeze(profiles.sort((a, b) => a.profileId.localeCompare(b.profileId, 'en')));
}

export function canonicalSigningPayload(profile: SiteProfile): string {
  validateProfile(profile);
  return canonicalize(profile as unknown as CanonicalJson);
}
function finalize(profile: SiteProfile): SiteProfile {
  validateProfile(profile);
  return normalizeProfile(profile);
}
function normalizeHostname(value: string): string {
  const hostname = value.trim().toLowerCase();
  if (
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(
      hostname
    )
  )
    throw new Error('Invalid hostname');
  return hostname;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
