export type ExternalGateStatus =
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'not_run'
  | 'insufficient_evidence';
export function normalizeExternalGateStatus(value: unknown): ExternalGateStatus;
export function summarizeExternalGates(
  statuses: readonly unknown[]
): 'passed' | 'failed' | 'blocked';
export function externalGateExitCode(status: 'passed' | 'failed' | 'blocked'): 0 | 1 | 2;
