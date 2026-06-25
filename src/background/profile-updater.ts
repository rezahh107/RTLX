import { REMOTE_PROFILE_ENDPOINT } from '../shared/constants';
import { createDiagnostic } from '../shared/diagnostics';
import type { Diagnostic } from '../shared/types';
export interface ProfileUpdateResult {
  updated: false;
  diagnostic: Diagnostic;
}
export async function updateRemoteProfiles(): Promise<ProfileUpdateResult> {
  if (REMOTE_PROFILE_ENDPOINT === null)
    return Object.freeze({
      updated: false,
      diagnostic: createDiagnostic('RTLX-PROFILE-001', 'info', 'REMOTE-PROFILE-001', 'extension', {
        status: 'insufficient_evidence',
        reason: 'endpoint_and_production_key_not_defined',
      }),
    });
  throw new Error('Unreachable until endpoint is defined by an authoritative amendment');
}
