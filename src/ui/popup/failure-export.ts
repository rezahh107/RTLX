import type { FailureEvidenceExportBlockedReason } from '../../shared/types';

export interface FailureEvidenceDownloadData {
  readonly content: string;
  readonly report: unknown;
}

export interface FailureEvidenceExportHandlers {
  readonly onBlocked: (reasonCode: FailureEvidenceExportBlockedReason) => void;
  readonly onExport: (data: FailureEvidenceDownloadData) => void;
  readonly onInvalid: () => void;
}

export type FailureEvidenceExportRoute = 'blocked' | 'exported' | 'invalid';

export function routeFailureEvidenceExportResult(
  value: unknown,
  handlers: FailureEvidenceExportHandlers
): FailureEvidenceExportRoute {
  if (isBlockedFailureEvidenceExport(value)) {
    handlers.onBlocked(value.reasonCode);
    return 'blocked';
  }
  if (isFailureEvidenceDownloadData(value)) {
    handlers.onExport(value);
    return 'exported';
  }
  handlers.onInvalid();
  return 'invalid';
}

function isBlockedFailureEvidenceExport(value: unknown): value is {
  status: 'blocked';
  reasonCode: FailureEvidenceExportBlockedReason;
} {
  return (
    isRecord(value) &&
    value.status === 'blocked' &&
    value.reasonCode === 'RTLX-CAPTURE-VISIBLE-TAB-REQUIRED'
  );
}

function isFailureEvidenceDownloadData(value: unknown): value is FailureEvidenceDownloadData {
  return isRecord(value) && typeof value.content === 'string' && 'report' in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
