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

function healthyProfile(): FailureEvidenceSection<FailureProfileEvidence> {
  return section({
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
}

describe('v15.9.1 failure report analysis', () => {
  it('separates capture completion from partial analytical evidence', () => {
    const runtime = section({} as RuntimeSnapshot);
    expect(
      analysisSummary(runtime, healthyProfile(), section<FailureElementEvidenceForReport>(null))
    ).toEqual({
      status: 'partial',
      reasonCodes: ['selected_element_unavailable'],
    });
  });

  it('does not make automatic reports partial only because no selected element exists', () => {
    const runtime = section({} as RuntimeSnapshot);
    expect(
      analysisSummary(
        runtime,
        healthyProfile(),
        section<FailureElementEvidenceForReport>(
          null,
          'no_data',
          'RTLX-FEC-SELECTION-LOCATION-MISMATCH-CLEARED'
        )
      )
    ).toEqual({
      status: 'complete',
      reasonCodes: [],
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

  it('does not claim bundled font fallback for source-no-font-binaries builds', () => {
    const text = expectedObservation(
      {
        bidiIsolation: true,
        directionCorrection: true,
        latinFont: 'amazon-ember-local',
        persianFont: 'local-first',
        siteMode: 'auto-safe',
        typography: true,
      },
      'source-no-font-binaries'
    );
    expect(text).toContain('source repository does not track vendored Vazirmatn binaries');
    expect(text).toContain('source repository does not track vendored Inter binaries');
    expect(text).not.toContain('bundled Vazirmatn fallback');
    expect(text).not.toContain('bundled Inter fallback');
  });
});
