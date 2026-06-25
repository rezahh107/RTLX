import { describe, expect, it } from 'vitest';
import {
  addSelectionToProfile,
  createEmptyUserProfile,
  exportProfiles,
  importProfiles,
} from '../../src/shared/profile-builder';
import { parseStrictJson } from '../../src/shared/strict-json';

describe('profile builder', () => {
  it('adds picker selections deterministically and without duplicates', () => {
    const empty = createEmptyUserProfile('Example.COM');
    const selection = {
      schemaVersion: '2.0.0' as const,
      hostname: 'example.com',
      kind: 'math' as const,
      selector: '.katex',
      directionMode: 'preserve' as const,
      alignmentMode: 'preserve' as const,
      typographyMode: 'preserve' as const,
      initialDelayMs: 0,
    };
    const first = addSelectionToProfile('example.com', selection, empty);
    const second = addSelectionToProfile('example.com', selection, first);
    expect(first.selectors.math).toEqual(['.katex']);
    expect(first.profileVersion).toBe(2);
    expect(second.profileVersion).toBe(2);
  });

  it('exports canonical packages and imports user profiles', () => {
    const profile = createEmptyUserProfile('example.com');
    const first = exportProfiles([profile]);
    const second = exportProfiles([profile]);
    expect(first).toBe(second);
    expect(importProfiles(parseStrictJson(first))).toEqual([profile]);
  });
  it('rejects unknown export fields and incompatible product versions', () => {
    const profile = createEmptyUserProfile('example.com');
    expect(() =>
      importProfiles({ schemaVersion: '2.0.0', productVersion: '12.0.0', profiles: [profile] })
    ).toThrow('invalid');
    expect(() =>
      importProfiles({
        schemaVersion: '2.0.0',
        productVersion: '15.4.0',
        profiles: [profile],
        extra: true,
      })
    ).toThrow('invalid');
  });
});
