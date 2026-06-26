import { describe, expect, it } from 'vitest';
import { analysisSummary } from '../../src/background/failure-report-analysis';
import type {
  FailureElementEvidenceForReport,
  FailureEvidenceSection,
  FailureProfileEvidence,
  RuntimeSnapshot,
} from '../../src/shared/types';

function section<T>(
  data: T | null,
  reasonCode = data === null ? 'RTLX-FEC-SECTION-NO-DATA' : 'RTLX-FEC-SECTION-AVAILABLE'
): FailureEvidenceSection<T> {
  return {
    schemaVersion: '1.0.0',
    status: data === null ? 'no_data' : 'available',
    reasonCode,
    capturedAt: '2026-06-25T00:00:00.000Z',
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

function runtime(
  status: RuntimeSnapshot['captureReadiness']['status']
): FailureEvidenceSection<RuntimeSnapshot> {
  return section({
    captureReadiness: {
      status,
      reasonCodes: Object.freeze(status === 'ready' ? [] : ['candidate_queue_pending']),
      certificationEligible: status === 'ready',
      streamingPending: false,
      candidateQueuesEmpty: status === 'ready',
      discoveryQueuesEmpty: true,
      textBlockEnumerationsPending: 0,
      textBlocksProcessingPending: status === 'ready' ? 0 : 1,
      typographyContinuationsPending: 0,
      typographyProtectionReconciliationsPending: 0,
      recentLongTaskSignal: false,
    },
  } as RuntimeSnapshot);
}

function profile(): FailureEvidenceSection<FailureProfileEvidence> {
  return section({
    profileId: 'official:chatgpt',
    profileVersion: 4,
    profileSource: 'official',
    health: {
      schemaVersion: '1.1.0',
      checkedAt: '2026-06-25T00:00:00.000Z',
      maxMatchesPerRule: 250,
      profileId: 'official:chatgpt',
      profileMode: 'protective-only',
      profileVersion: 4,
      rules: [],
      status: 'healthy',
    },
    selectedElementDecision: null,
  });
}

describe('v15.9.12 automatic report regression contracts', () => {
  it('does not mark a ready automatic report partial for an absent selection', () => {
    expect(
      analysisSummary(
        runtime('ready'),
        profile(),
        section<FailureElementEvidenceForReport>(null, 'RTLX-FEC-SELECTION-ABSENT')
      )
    ).toEqual({ status: 'complete', reasonCodes: [] });
  });

  it('does not mark a ready automatic report partial for a cleared stale selection', () => {
    expect(
      analysisSummary(
        runtime('ready'),
        profile(),
        section<FailureElementEvidenceForReport>(
          null,
          'RTLX-FEC-SELECTION-LOCATION-MISMATCH-CLEARED'
        )
      )
    ).toEqual({ status: 'complete', reasonCodes: [] });
  });

  it('still marks capture queue/readiness failures as partial', () => {
    expect(
      analysisSummary(
        runtime('partial'),
        profile(),
        section<FailureElementEvidenceForReport>(null, 'RTLX-FEC-SELECTION-ABSENT')
      )
    ).toEqual({ status: 'partial', reasonCodes: ['capture_partial'] });
  });

  it('still treats targeted selected-element evidence loss as partial', () => {
    expect(
      analysisSummary(
        runtime('ready'),
        profile(),
        section<FailureElementEvidenceForReport>(null, 'RTLX-FEC-SECTION-NO-DATA')
      )
    ).toEqual({ status: 'partial', reasonCodes: ['selected_element_unavailable'] });
  });
});
