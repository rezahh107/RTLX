import { describe, expect, it } from 'vitest';
import { decideDirection } from '../../src/content/direction-decider';
import type { DirectionEvidence } from '../../src/shared/types';
const base: DirectionEvidence = {
  localDir: null,
  nearestAncestorDir: null,
  documentDirDeclared: false,
  detectedDirection: 'rtl',
  language: 'persian',
  languageConfidence: 0.9,
  userMode: 'auto-safe',
  hardExcluded: false,
  codeZone: false,
  isHtmlOrBody: false,
  userConfirmedSuspiciousDirection: false,
};
describe('direction decision table', () => {
  it('never mutates html/body', () =>
    expect(decideDirection({ ...base, isHtmlOrBody: true })).toBe('no-op'));
  it('preserves local explicit dir', () =>
    expect(decideDirection({ ...base, localDir: 'ltr' })).toBe('preserve'));
  it('preserves inherited rtl', () =>
    expect(decideDirection({ ...base, nearestAncestorDir: 'rtl' })).toBe('preserve'));
  it('applies rtl on high-confidence Persian candidate in inherited ltr auto-safe mode', () =>
    expect(decideDirection({ ...base, nearestAncestorDir: 'ltr' })).toBe('set-rtl-on-candidate'));
  it('applies rtl on high-confidence Persian candidate under inherited auto direction', () =>
    expect(decideDirection({ ...base, nearestAncestorDir: 'auto' })).toBe('set-rtl-on-candidate'));
  it('keeps ask mode confirmation for inherited ltr', () =>
    expect(decideDirection({ ...base, nearestAncestorDir: 'ltr', userMode: 'ask' })).toBe(
      'request-user-confirmation'
    ));
  it('allows force mode only on candidate', () =>
    expect(
      decideDirection({ ...base, nearestAncestorDir: 'ltr', userMode: 'force-candidate-rtl' })
    ).toBe('set-rtl-on-candidate'));
  it('applies ltr to high-confidence English content inside an rtl ancestor', () =>
    expect(
      decideDirection({
        ...base,
        detectedDirection: 'ltr',
        language: 'latin',
        languageConfidence: 0.95,
        nearestAncestorDir: 'rtl',
      })
    ).toBe('set-ltr-on-candidate'));
  it('sets code zone ltr', () =>
    expect(decideDirection({ ...base, codeZone: true })).toBe('set-ltr-on-code-zone'));
});
