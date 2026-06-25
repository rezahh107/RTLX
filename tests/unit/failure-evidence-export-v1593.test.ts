import { describe, expect, it, vi } from 'vitest';
import { failureEvidenceExportBlockedReason } from '../../src/shared/failure-evidence';
import { routeFailureEvidenceExportResult } from '../../src/ui/popup/failure-export';
import type { CaptureReadiness, RuntimeSnapshot } from '../../src/shared/types';

function snapshot(
  status: CaptureReadiness['status'],
  reasonCodes: readonly string[]
): Pick<RuntimeSnapshot, 'captureReadiness'> {
  return {
    captureReadiness: {
      status,
      reasonCodes,
      certificationEligible: status === 'ready',
      streamingPending: false,
      candidateQueuesEmpty: true,
      discoveryQueuesEmpty: true,
      textBlockEnumerationsPending: 0,
      textBlocksProcessingPending: 0,
      typographyContinuationsPending: 0,
      typographyProtectionReconciliationsPending: 0,
      recentLongTaskSignal: false,
    },
  };
}

describe('RTLX 15.9.11 authoritative failure-evidence export gate', () => {
  it.each([['document_hidden'], ['runtime_inactive'], ['document_hidden', 'runtime_inactive']])(
    'blocks the final capture for %j',
    (...reasonCodes: string[]) => {
      expect(failureEvidenceExportBlockedReason(snapshot('blocked', reasonCodes))).toBe(
        'RTLX-CAPTURE-VISIBLE-TAB-REQUIRED'
      );
    }
  );

  it('preserves existing partial-report behavior for non-visibility reasons', () => {
    expect(
      failureEvidenceExportBlockedReason(snapshot('partial', ['text_block_enumeration_pending']))
    ).toBeNull();
    expect(
      failureEvidenceExportBlockedReason(snapshot('blocked', ['safe_mode_active']))
    ).toBeNull();
    expect(failureEvidenceExportBlockedReason(snapshot('ready', []))).toBeNull();
  });

  it('routes a blocked final capture without invoking the download callback', () => {
    const onBlocked = vi.fn();
    const onExport = vi.fn();
    const onInvalid = vi.fn();

    const route = routeFailureEvidenceExportResult(
      {
        status: 'blocked',
        reasonCode: 'RTLX-CAPTURE-VISIBLE-TAB-REQUIRED',
      },
      { onBlocked, onExport, onInvalid }
    );

    expect(route).toBe('blocked');
    expect(onBlocked).toHaveBeenCalledWith('RTLX-CAPTURE-VISIBLE-TAB-REQUIRED');
    expect(onExport).not.toHaveBeenCalled();
    expect(onInvalid).not.toHaveBeenCalled();
  });

  it('continues routing valid export data to the existing download path', () => {
    const onBlocked = vi.fn();
    const onExport = vi.fn();
    const onInvalid = vi.fn();
    const data = { content: '{"ok":true}', report: { schemaVersion: '1.2.0' } };

    const route = routeFailureEvidenceExportResult(data, { onBlocked, onExport, onInvalid });

    expect(route).toBe('exported');
    expect(onExport).toHaveBeenCalledWith(data);
    expect(onBlocked).not.toHaveBeenCalled();
    expect(onInvalid).not.toHaveBeenCalled();
  });

  it('rejects malformed background responses without invoking the download callback', () => {
    const onBlocked = vi.fn();
    const onExport = vi.fn();
    const onInvalid = vi.fn();

    const route = routeFailureEvidenceExportResult(
      { status: 'blocked', reasonCode: 'unexpected' },
      { onBlocked, onExport, onInvalid }
    );

    expect(route).toBe('invalid');
    expect(onInvalid).toHaveBeenCalledOnce();
    expect(onExport).not.toHaveBeenCalled();
    expect(onBlocked).not.toHaveBeenCalled();
  });
});
