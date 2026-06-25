import { describe, expect, it } from 'vitest';
import { evaluateCaptureReadiness } from '../../src/content/capture-readiness';
import type { RuntimeSnapshot } from '../../src/shared/types';

const streaming: RuntimeSnapshot['streaming'] = {
  queuedRoots: 0,
  batchesFlushed: 0,
  rootsFlushed: 0,
  maxBurstSize: 0,
  pending: false,
  acceptedRoots: 0,
  duplicateRoots: 0,
  coalescedRoots: 0,
  rejectedRoots: 0,
  forcedFlushes: 0,
  overflowEpisodes: 0,
  flushFailures: 0,
  activeOverflowEpisodeId: null,
  lastFlushReason: null,
  quietForMs: 1000,
};
const backpressure: RuntimeSnapshot['backpressure'] = {
  level: 'normal',
  sliceMs: 8,
  nodesPerSlice: 50,
  queueDepth: 0,
  mutationBurst: 0,
  longTaskSignal: false,
};

describe('CAPTURE-READINESS-001', () => {
  it('marks only a quiescent active runtime as certification eligible', () => {
    expect(
      evaluateCaptureReadiness({
        runtimeState: 'ACTIVE',
        degradationLevel: 0,
        streaming,
        backpressure,
        pendingCandidates: 0,
        pendingDiscoveryRoots: 0,
        activeDiscoveryCursors: 0,
        textBlockEnumerationsPending: 0,
        textBlocksProcessingPending: 0,
        typographyContinuationsPending: 0,
        typographyProtectionReconciliationsPending: 0,
      })
    ).toEqual({
      status: 'ready',
      reasonCodes: [],
      certificationEligible: true,
      streamingPending: false,
      candidateQueuesEmpty: true,
      discoveryQueuesEmpty: true,
      textBlockEnumerationsPending: 0,
      textBlocksProcessingPending: 0,
      typographyContinuationsPending: 0,
      typographyProtectionReconciliationsPending: 0,
      recentLongTaskSignal: false,
    });
  });

  it('reports deterministic partial reasons for pending work and pressure', () => {
    const value = evaluateCaptureReadiness({
      runtimeState: 'ACTIVE',
      degradationLevel: 2,
      streaming: { ...streaming, pending: true, queuedRoots: 2 },
      backpressure: { ...backpressure, level: 'pressure', longTaskSignal: true },
      pendingCandidates: 3,
      pendingDiscoveryRoots: 1,
      activeDiscoveryCursors: 1,
      textBlockEnumerationsPending: 2,
      textBlocksProcessingPending: 3,
      typographyContinuationsPending: 1,
      typographyProtectionReconciliationsPending: 1,
    });
    expect(value.status).toBe('partial');
    expect(value.certificationEligible).toBe(false);
    expect(value.reasonCodes).toEqual([
      'backpressure_pressure',
      'candidate_queue_pending',
      'discovery_cursor_active',
      'discovery_queue_pending',
      'long_task_signal',
      'streaming_pending',
      'text_block_enumeration_pending',
      'text_block_processing_pending',
      'typography_continuation_pending',
      'typography_reconciliation_pending',
    ]);
  });

  it('keeps capture partial when discovered text blocks still require processing', () => {
    const value = evaluateCaptureReadiness({
      runtimeState: 'ACTIVE',
      degradationLevel: 0,
      streaming,
      backpressure,
      pendingCandidates: 0,
      pendingDiscoveryRoots: 0,
      activeDiscoveryCursors: 0,
      textBlockEnumerationsPending: 0,
      textBlocksProcessingPending: 1,
      typographyContinuationsPending: 0,
      typographyProtectionReconciliationsPending: 0,
    });
    expect(value.status).toBe('partial');
    expect(value.certificationEligible).toBe(false);
    expect(value.reasonCodes).toEqual(['text_block_processing_pending']);
    expect(value.textBlocksProcessingPending).toBe(1);
  });

  it('blocks certification for paused or inactive runtimes', () => {
    const value = evaluateCaptureReadiness({
      runtimeState: 'PAUSED',
      degradationLevel: 4,
      streaming,
      backpressure,
      pendingCandidates: 0,
      pendingDiscoveryRoots: 0,
      activeDiscoveryCursors: 0,
      textBlockEnumerationsPending: 0,
      textBlocksProcessingPending: 0,
      typographyContinuationsPending: 0,
      typographyProtectionReconciliationsPending: 0,
    });
    expect(value.status).toBe('blocked');
    expect(value.reasonCodes).toEqual(['degradation_paused', 'runtime_inactive']);
  });
});
