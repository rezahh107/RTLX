import { describe, expect, it } from 'vitest';
import {
  analysisSummary,
  derivedReportDiagnostics,
  expectedObservation,
} from '../../src/background/failure-report-analysis';
import type {
  FailureElementEvidenceForReport,
  FailureEvidenceSection,
  FailureProfileEvidence,
  RuntimeSnapshot,
} from '../../src/shared/types';

function section<T>(
  data: T | null,
  status: FailureEvidenceSection<T>['status'] = data === null ? 'no_data' : 'available',
  reasonCode = data === null ? 'RTLX-FEC-SECTION-NO-DATA' : 'RTLX-FEC-SECTION-AVAILABLE'
): FailureEvidenceSection<T> {
  return {
    schemaVersion: '1.0.0',
    status,
    reasonCode,
    capturedAt: '2026-06-18T00:00:00.000Z',
    document: {
      tabId: 1,
      frameId: 0,
      browserDocumentId: 'document',
      contentDocumentInstanceId: 'instance',
      documentGeneration: 1,
      lifecycle: 'active',
      provenanceStatus: 'matched',
    },
    byteLength: 0,
    data,
  };
}

describe('v15.9.1 failure report analysis', () => {
  it('separates capture completion from partial analytical evidence', () => {
    const runtime = section({} as RuntimeSnapshot);
    const profile = section({
      profileId: 'official:deepseek',
      profileVersion: 2,
      profileSource: 'official',
      health: {
        schemaVersion: '1.1.0',
        profileId: 'official:deepseek',
        profileVersion: 2,
        profileMode: 'protective-only',
        status: 'healthy',
        checkedAt: '2026-06-18T00:00:00.000Z',
        maxMatchesPerRule: 250,
        rules: [],
      },
      selectedElementDecision: null,
    } satisfies FailureProfileEvidence);
    expect(
      analysisSummary(runtime, profile, section<FailureElementEvidenceForReport>(null))
    ).toEqual({
      status: 'partial',
      reasonCodes: ['selected_element_unavailable'],
    });
  });

  it('emits deterministic diagnostics for degraded profiles and cleared stale selections', () => {
    expect(
      derivedReportDiagnostics(
        'degraded',
        'RTLX-FEC-SELECTION-LOCATION-MISMATCH-CLEARED',
        '2026-06-18T00:00:00.000Z'
      ).map((diagnostic) => diagnostic.code)
    ).toEqual(['RTLX-PROFILE-101', 'RTLX-SELECTION-101']);
  });

  it('describes the effective local-first font policy instead of the retired alias', () => {
    const text = expectedObservation({
      bidiIsolation: true,
      directionCorrection: true,
      latinFont: 'amazon-ember-local',
      persianFont: 'local-first',
      siteMode: 'auto-safe',
      typography: true,
    });
    expect(text).toContain('local Persian fonts with bundled Vazirmatn fallback');
    expect(text).toContain('local Amazon Ember with bundled Inter fallback');
    expect(text).not.toContain('RTLX Mixed Text');
  });

  it('does not claim bundled font fallback for no-font-binaries builds', () => {
    const text = expectedObservation(
      {
        bidiIsolation: true,
        directionCorrection: true,
        latinFont: 'amazon-ember-local',
        persianFont: 'local-first',
        siteMode: 'auto-safe',
        typography: true,
      },
      'no-font-binaries'
    );
    expect(text).toContain('no-font-binaries build does not package Vazirmatn');
    expect(text).toContain('no-font-binaries build does not package Inter');
    expect(text).not.toContain('bundled Vazirmatn fallback');
    expect(text).not.toContain('bundled Inter fallback');
  });
});
