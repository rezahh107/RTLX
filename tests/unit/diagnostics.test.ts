import { describe, expect, it } from 'vitest';
import { createDiagnostic } from '../../src/shared/diagnostics';
describe('diagnostic redaction', () => {
  it('removes sensitive detail key names and sorts remaining keys', () => {
    const diagnostic = createDiagnostic(
      'RTLX-DIR-001',
      'warning',
      'DIRECTION-001',
      'frame',
      { pageText: 'secret', url: 'https://x', count: 1, feature: 'dir' },
      { now: () => new Date('2026-06-14T00:00:00Z') }
    );
    expect(diagnostic.details).toEqual({ count: 1, feature: 'dir' });
    expect(diagnostic.timestamp).toBe('2026-06-14T00:00:00.000Z');
  });
});

import { isUntrustedDiagnostic } from '../../src/shared/diagnostics';

describe('untrusted diagnostic validation', () => {
  it('rejects arbitrary string payloads even under a generic key', () => {
    expect(
      isUntrustedDiagnostic({
        schemaVersion: '1.0.0',
        code: 'RTLX-DIR-001',
        severity: 'warning',
        requirementId: 'DIRECTION-001',
        scope: 'frame',
        timestamp: '2026-06-14T00:00:00.000Z',
        details: { message: 'full secret page text' },
      })
    ).toBe(false);
  });
});
