import { describe, expect, it } from 'vitest';
import {
  createEmptyUserProfile,
  addSelectionToProfile,
  updateProfileRule,
} from '../../src/shared/profile-builder';
import { normalizeProfile, stableRuleId, validateProfile } from '../../src/shared/profile-schema';
describe('Profile v3 rules', () => {
  it('creates deterministic rules and derives selectors', () => {
    const selection = {
      schemaVersion: '2.0.0' as const,
      hostname: 'example.com',
      kind: 'content' as const,
      selector: 'main',
      directionMode: 'auto-safe' as const,
      alignmentMode: 'start' as const,
      typographyMode: 'persian-only' as const,
      initialDelayMs: 250,
    };
    const profile = addSelectionToProfile(
      'example.com',
      selection,
      createEmptyUserProfile('example.com')
    );
    expect(profile.rules[0]?.ruleId).toBe(stableRuleId('content', 'main'));
    expect(profile.selectors.content).toEqual(['main']);
    expect(() => validateProfile(profile)).not.toThrow();
  });
  it('disabling a rule removes it from active selectors without deleting it', () => {
    const selection = {
      schemaVersion: '2.0.0' as const,
      hostname: 'example.com',
      kind: 'content' as const,
      selector: 'main',
      directionMode: 'auto-safe' as const,
      alignmentMode: 'start' as const,
      typographyMode: 'persian-only' as const,
      initialDelayMs: 0,
    };
    const profile = addSelectionToProfile('example.com', selection, null);
    const next = updateProfileRule(profile, profile.rules[0]!.ruleId, { enabled: false });
    expect(next.rules[0]?.enabled).toBe(false);
    expect(next.selectors.content).toEqual([]);
  });
  it('migrates v2 deterministically', () => {
    const v2 = {
      schemaVersion: '2.0.0',
      profileId: 'user:example.com',
      profileVersion: 1,
      profileKind: 'user',
      displayName: 'Example',
      match: { hosts: ['example.com'], pathPrefixes: ['/'] },
      selectors: {
        content: ['main'],
        exclude: [],
        code: [],
        math: [],
        editor: [],
        terminal: [],
        mutationSensitive: [],
      },
      features: { direction: true, bidi: true, typography: true, shadowOpen: true },
      thresholds: {},
      metadata: { source: 'imported', verification: 'unverified', product: null },
    };
    const first = normalizeProfile(v2);
    const second = normalizeProfile(v2);
    expect(first).toEqual(second);
    expect(first.schemaVersion).toBe('3.0.0');
  });
});
