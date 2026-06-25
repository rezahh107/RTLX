import { afterAll, describe, expect, it, vi } from 'vitest';
import { isRequestMessage } from '../../src/shared/messages';

const originalCrypto = globalThis.crypto;
vi.stubGlobal('crypto', {
  ...originalCrypto,
  subtle: originalCrypto.subtle,
  randomUUID: () => '00000000-0000-4000-8000-000000000000',
});
afterAll(() => vi.stubGlobal('crypto', originalCrypto));
const requestId = '00000000-0000-4000-8000-000000000000';

describe('v14 message schemas', () => {
  it('accepts a valid picker request', () => {
    expect(
      isRequestMessage({ type: 'START_PICKER', requestId, payload: { tabId: 1, kind: 'terminal' } })
    ).toBe(true);
  });
  it('accepts bounded signed-profile imports', () => {
    expect(
      isRequestMessage({
        type: 'IMPORT_SIGNED_PROFILE',
        requestId,
        payload: { content: '{"schemaVersion":"3.0.0"}' },
      })
    ).toBe(true);
  });

  it('rejects unknown fields and manual invalid selectors', () => {
    expect(
      isRequestMessage({
        type: 'START_PICKER',
        requestId,
        payload: { tabId: 1, kind: 'terminal', extra: true },
      })
    ).toBe(false);
    expect(
      isRequestMessage({
        type: 'SAVE_PICKER_SELECTION',
        requestId,
        payload: {
          selection: {
            schemaVersion: '1.0.0',
            hostname: 'example.com',
            kind: 'content',
            selector: 'main:has(script)',
          },
        },
      })
    ).toBe(false);
  });
});
