import { createDiagnostic } from '../shared/diagnostics';
import { sanitizeFailureObservation } from '../shared/failure-evidence';
import type {
  Diagnostic,
  FailureElementEvidenceForReport,
  FailureEvidenceReport,
  FailureEvidenceSection,
  FailureProfileEvidence,
  RuntimeSnapshot,
} from '../shared/types';

const OPTIONAL_AUTOMATIC_SELECTION_REASON_CODES = new Set([
  'RTLX-FEC-SELECTION-ABSENT',
  'RTLX-FEC-SELECTION-LOCATION-MISMATCH-CLEARED',
]);

export function derivedReportDiagnostics(
  profileStatus: string | null,
  selectionReasonCode: string,
  capturedAt: string,
  captureReadinessStatus: RuntimeSnapshot['captureReadiness']['status'] | null = null
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const clock = { now: () => new Date(capturedAt) };
  if (profileStatus === 'degraded' || profileStatus === 'no-match')
    diagnostics.push(
      createDiagnostic(
        'RTLX-PROFILE-101',
        'warning',
        'PROFILE-HEALTH-001',
        'site',
        { status: profileStatus },
        clock
      )
    );
  if (profileStatus === 'excessive-match' || profileStatus === 'invalid-selector')
    diagnostics.push(
      createDiagnostic(
        'RTLX-PROFILE-102',
        'error',
        'PROFILE-HEALTH-001',
        'site',
        { status: profileStatus },
        clock
      )
    );
  if (captureReadinessStatus && captureReadinessStatus !== 'ready')
    diagnostics.push(
      createDiagnostic(
        'RTLX-CAPTURE-101',
        'warning',
        'CAPTURE-READINESS-001',
        'frame',
        { status: captureReadinessStatus },
        clock
      )
    );
  if (selectionReasonCode.endsWith('-CLEARED'))
    diagnostics.push(
      createDiagnostic(
        'RTLX-SELECTION-101',
        'info',
        'FAILURE-SELECTION-001',
        'candidate',
        { cleared: true },
        clock
      )
    );
  return Object.freeze(diagnostics);
}

export function analysisSummary(
  runtimeSnapshot: FailureEvidenceSection<RuntimeSnapshot>,
  profileEvidence: FailureEvidenceSection<FailureProfileEvidence>,
  selectedElement: FailureEvidenceSection<FailureElementEvidenceForReport>
): FailureEvidenceReport['analysis'] {
  const reasons: string[] = [];
  if (runtimeSnapshot.data === null) reasons.push('runtime_snapshot_unavailable');
  else {
    const readiness = runtimeSnapshot.data.captureReadiness?.status;
    if (readiness && readiness !== 'ready') reasons.push(`capture_${readiness}`);
  }
  const profileStatus = profileEvidence.data?.health?.status ?? null;
  if (profileStatus && profileStatus !== 'healthy' && profileStatus !== 'not-applicable')
    reasons.push(`profile_${profileStatus.replaceAll('-', '_')}`);
  if (
    selectedElement.data === null &&
    !OPTIONAL_AUTOMATIC_SELECTION_REASON_CODES.has(selectedElement.reasonCode)
  )
    reasons.push('selected_element_unavailable');
  const status =
    runtimeSnapshot.data === null
      ? 'insufficient_evidence'
      : reasons.length === 0
        ? 'complete'
        : 'partial';
  return Object.freeze({ status, reasonCodes: Object.freeze(reasons.sort()) });
}

export function expectedObservation(
  settings: RuntimeSnapshot['pageDebug']['effectiveSettings'] | null,
  buildFlavor: RuntimeSnapshot['pageDebug']['buildFlavor'] | null = null
): string {
  if (!settings)
    return 'Expected: Persian and mixed Persian/English content should use RTL/right alignment; English content should use LTR/left alignment.';
  const hasBundledFonts = buildFlavor !== 'no-font-binaries';
  const persianFont =
    settings.persianFont === 'local-first'
      ? hasBundledFonts
        ? 'local Persian fonts with bundled Vazirmatn fallback'
        : 'local Persian/system fonts; this no-font-binaries build does not package Vazirmatn'
      : hasBundledFonts
        ? 'bundled Vazirmatn'
        : 'available system Persian font fallback; this no-font-binaries build does not package Vazirmatn';
  const latinFont =
    settings.latinFont === 'amazon-ember-local'
      ? hasBundledFonts
        ? 'local Amazon Ember with bundled Inter fallback'
        : 'local Amazon Ember/system fonts; this no-font-binaries build does not package Inter'
      : settings.latinFont === 'inter'
        ? hasBundledFonts
          ? 'bundled Inter'
          : 'available system Latin font fallback; this no-font-binaries build does not package Inter'
        : 'the original site font';
  return sanitizeFailureObservation(
    `Expected: Persian and mixed Persian/English content should use RTL/right alignment and ${persianFont}; English content should use LTR/left alignment and ${latinFont}.`
  );
}
