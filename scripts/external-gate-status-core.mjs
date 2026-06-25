export function normalizeExternalGateStatus(value) {
  if (value === 'pass') return 'passed';
  if (value === 'insufficient-evidence') return 'insufficient_evidence';
  if (
    value === 'passed' ||
    value === 'failed' ||
    value === 'blocked' ||
    value === 'not_run' ||
    value === 'insufficient_evidence'
  )
    return value;
  return 'not_run';
}

export function summarizeExternalGates(statuses) {
  const normalized = statuses.map(normalizeExternalGateStatus);
  if (normalized.some((status) => status === 'failed')) return 'failed';
  if (normalized.length > 0 && normalized.every((status) => status === 'passed')) return 'passed';
  return 'blocked';
}

export function externalGateExitCode(status) {
  return status === 'passed' ? 0 : status === 'failed' ? 1 : 2;
}
