import { describe, expect, it } from 'vitest';
import {
  externalGateExitCode,
  normalizeExternalGateStatus,
  summarizeExternalGates,
} from '../../scripts/external-gate-status-core.mjs';

describe('v15.9.1 external evidence gate status', () => {
  it('never promotes not_run or insufficient evidence to passed', () => {
    expect(summarizeExternalGates(['not_run', 'insufficient_evidence'])).toBe('blocked');
    expect(externalGateExitCode('blocked')).toBe(2);
  });

  it('passes only when every gate passed and fails when any gate failed', () => {
    expect(summarizeExternalGates(['pass', 'passed'])).toBe('passed');
    expect(externalGateExitCode('passed')).toBe(0);
    expect(summarizeExternalGates(['passed', 'failed', 'not_run'])).toBe('failed');
    expect(externalGateExitCode('failed')).toBe(1);
  });

  it('normalizes unknown and alternate status values conservatively', () => {
    expect(normalizeExternalGateStatus('insufficient-evidence')).toBe('insufficient_evidence');
    expect(normalizeExternalGateStatus('unexpected')).toBe('not_run');
    expect(normalizeExternalGateStatus(null)).toBe('not_run');
  });
});
