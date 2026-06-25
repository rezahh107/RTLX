import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendDiagnostics,
  clearMemoryDiagnostics,
  correlateDiagnostics,
  exportDiagnostics,
} from '../../src/background/diagnostics-store';
import { createDiagnostic } from '../../src/shared/diagnostics';

const first = {
  tabId: 7,
  frameId: 0,
  browserDocumentId: 'DOCUMENT_A',
  contentDocumentInstanceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  documentGeneration: 1,
} as const;
const second = {
  tabId: 8,
  frameId: 0,
  browserDocumentId: 'DOCUMENT_B',
  contentDocumentInstanceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  documentGeneration: 1,
} as const;

beforeEach(() => clearMemoryDiagnostics());

describe('v15.6.0 diagnostic provenance', () => {
  it('does not merge identical diagnostics from different documents and correlates exactly', async () => {
    const runtimeA = '11111111-1111-4111-8111-111111111111';
    const runtimeB = '22222222-2222-4222-8222-222222222222';
    const clock = { now: () => new Date('2026-06-17T00:00:00.000Z') };
    await appendDiagnostics(
      [
        createDiagnostic(
          'RTLX-LIMIT-001',
          'warning',
          'CANDIDATE-LIMIT-001',
          'frame',
          { runtimeInstanceId: runtimeA },
          clock
        ),
      ],
      false,
      'untrusted-content',
      first
    );
    await appendDiagnostics(
      [
        createDiagnostic(
          'RTLX-LIMIT-001',
          'warning',
          'CANDIDATE-LIMIT-001',
          'frame',
          { runtimeInstanceId: runtimeB },
          clock
        ),
      ],
      false,
      'untrusted-content',
      second
    );
    const exported = await exportDiagnostics(false);
    expect(exported).toHaveLength(2);
    expect(correlateDiagnostics(exported, { ...first, runtimeInstanceId: runtimeA })).toHaveLength(
      1
    );
    expect(correlateDiagnostics(exported, { ...second, runtimeInstanceId: runtimeB })).toHaveLength(
      1
    );
    expect(correlateDiagnostics(exported, { ...first, runtimeInstanceId: runtimeB })).toHaveLength(
      0
    );
  });
});
