import { describe, expect, it } from 'vitest';
import {
  CONTENT_RESPONSE_CONTRACT_ERROR_CODE,
  enforceContentCommandResponse,
  inspectContentCommandResponse,
} from '../../src/shared/response-contract';

describe('RTLX 15.9.11 executable content response contract', () => {
  it('accepts canonical content success and failure envelopes', () => {
    expect(inspectContentCommandResponse({ ok: true, data: { delivered: true } })).toMatchObject({
      ok: true,
    });
    expect(
      inspectContentCommandResponse({
        ok: false,
        error: { code: 'RTLX-CONTENT-RUNTIME-UNAVAILABLE', message: 'Runtime unavailable' },
      })
    ).toMatchObject({ ok: true });
  });

  it('rejects malformed content response envelopes without grepping source text', () => {
    const malformed = [
      { ok: true, data: null, extra: true },
      { ok: false },
      { ok: false, error: 'ambiguous' },
      { ok: false, error: { code: 'E' } },
      { ok: 'true', data: null },
    ];
    for (const response of malformed) {
      expect(inspectContentCommandResponse(response)).toMatchObject({
        ok: false,
        issue: { category: 'invalid_content_envelope' },
      });
    }
  });

  it('canonicalizes producer violations into actionable content errors', () => {
    const response = enforceContentCommandResponse({ ok: true, data: { site: undefined } });
    expect(response).toEqual({
      ok: false,
      error: {
        code: CONTENT_RESPONSE_CONTRACT_ERROR_CODE,
        message: 'Content response contract violation at $.data.site',
      },
    });
    expect(inspectContentCommandResponse(response)).toMatchObject({ ok: true });
  });
});
