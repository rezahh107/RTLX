import { describe, expect, it } from 'vitest';
import { decideDirectionDetailed } from '../../src/content/direction-decider';
import type { DirectionEvidence } from '../../src/shared/types';

function evidence(overrides: Partial<DirectionEvidence> = {}): DirectionEvidence {
  return {
    isHtmlOrBody: false,
    localDir: null,
    hardExcluded: false,
    codeZone: false,
    documentDirDeclared: false,
    detectedDirection: 'rtl',
    language: 'persian',
    languageConfidence: 0.95,
    nearestAncestorDir: 'ltr',
    userMode: 'auto-safe',
    userConfirmedSuspiciousDirection: false,
    ...overrides,
  };
}

describe('v15.7 explainable direction decisions', () => {
  it('returns a stable reason with the mutation action', () => {
    expect(decideDirectionDetailed(evidence())).toEqual({
      action: 'set-rtl-on-candidate',
      reason: 'confident-persian-in-ltr-context',
    });
  });

  it('preserves explicit direction before considering document or language hints', () => {
    expect(decideDirectionDetailed(evidence({ localDir: 'ltr' }))).toEqual({
      action: 'preserve',
      reason: 'explicit-direction-preserved',
    });
  });
});
