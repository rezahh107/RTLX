export function normalizeEvidenceStatus(value) {
  if (value === 'pass') return 'passed';
  if (value === 'insufficient-evidence') return 'insufficient_evidence';
  if (['passed', 'failed', 'not_run', 'insufficient_evidence', 'blocked'].includes(value))
    return value;
  return 'not_run';
}
export function evaluateReleaseEvidence(gates) {
  const status = gates.some((gate) => gate.status === 'failed')
    ? 'failed'
    : gates.every((gate) => gate.status === 'passed')
      ? 'passed'
      : 'blocked';
  return Object.freeze({
    status,
    productionReady: status === 'passed',
    exitCode: status === 'passed' ? 0 : status === 'failed' ? 1 : 2,
  });
}
