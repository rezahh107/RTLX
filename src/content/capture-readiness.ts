import type { CaptureReadiness, RuntimeSnapshot } from '../shared/types';

export interface CaptureReadinessInput {
  runtimeState: string;
  degradationLevel: 0 | 1 | 2 | 3 | 4;
  streaming: RuntimeSnapshot['streaming'];
  backpressure: RuntimeSnapshot['backpressure'];
  pendingCandidates: number;
  pendingDiscoveryRoots: number;
  activeDiscoveryCursors: number;
  textBlockEnumerationsPending: number;
  textBlocksProcessingPending: number;
  typographyContinuationsPending: number;
  typographyProtectionReconciliationsPending: number;
}

export function evaluateCaptureReadiness(input: CaptureReadinessInput): CaptureReadiness {
  const reasonCodes: string[] = [];
  if (input.runtimeState !== 'ACTIVE') reasonCodes.push('runtime_inactive');
  if (input.degradationLevel >= 4) reasonCodes.push('degradation_paused');
  if (input.streaming.pending) reasonCodes.push('streaming_pending');
  if (input.pendingCandidates > 0) reasonCodes.push('candidate_queue_pending');
  if (input.pendingDiscoveryRoots > 0) reasonCodes.push('discovery_queue_pending');
  if (input.activeDiscoveryCursors > 0) reasonCodes.push('discovery_cursor_active');
  if (input.textBlockEnumerationsPending > 0) reasonCodes.push('text_block_enumeration_pending');
  if (input.textBlocksProcessingPending > 0) reasonCodes.push('text_block_processing_pending');
  if (input.typographyContinuationsPending > 0) reasonCodes.push('typography_continuation_pending');
  if (input.typographyProtectionReconciliationsPending > 0)
    reasonCodes.push('typography_reconciliation_pending');
  if (input.backpressure.longTaskSignal) reasonCodes.push('long_task_signal');
  if (input.backpressure.level === 'pressure') reasonCodes.push('backpressure_pressure');
  if (input.backpressure.level === 'hidden') reasonCodes.push('document_hidden');

  const status: CaptureReadiness['status'] = reasonCodes.some(
    (code) =>
      code === 'runtime_inactive' || code === 'degradation_paused' || code === 'document_hidden'
  )
    ? 'blocked'
    : reasonCodes.length > 0
      ? 'partial'
      : 'ready';

  return Object.freeze({
    status,
    reasonCodes: Object.freeze(reasonCodes.sort()),
    certificationEligible: status === 'ready',
    streamingPending: input.streaming.pending,
    candidateQueuesEmpty: input.pendingCandidates === 0,
    discoveryQueuesEmpty: input.pendingDiscoveryRoots === 0 && input.activeDiscoveryCursors === 0,
    textBlockEnumerationsPending: input.textBlockEnumerationsPending,
    textBlocksProcessingPending: input.textBlocksProcessingPending,
    typographyContinuationsPending: input.typographyContinuationsPending,
    typographyProtectionReconciliationsPending: input.typographyProtectionReconciliationsPending,
    recentLongTaskSignal: input.backpressure.longTaskSignal,
  });
}
