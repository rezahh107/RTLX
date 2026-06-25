import { describe, expect, it } from 'vitest';
import {
  enforceResponseMessage,
  inspectResponseMessage,
  RESPONSE_CONTRACT_ERROR_CODE,
} from '../../src/shared/response-contract';

describe('RTLX 15.9.11 cross-browser response contract', () => {
  it('accepts the same canonical response after direct, JSON, and structured-clone transport', () => {
    const requestId = crypto.randomUUID();
    const response = {
      requestId,
      success: true as const,
      data: { global: { enabled: true }, profile: null },
    };
    const transports = [
      response,
      JSON.parse(JSON.stringify(response)) as unknown,
      structuredClone(response),
    ];
    for (const transported of transports)
      expect(inspectResponseMessage(transported, requestId)).toMatchObject({ ok: true });
  });

  it('identifies the precise non-canonical path without retaining the invalid value', () => {
    const requestId = crypto.randomUUID();
    const inspection = inspectResponseMessage(
      { requestId, success: true, data: { site: undefined } },
      requestId
    );
    expect(inspection).toEqual({
      ok: false,
      issue: {
        category: 'non_canonical',
        message: '$.data.site contains undefined',
        responseKeys: ['data', 'requestId', 'success'],
        invalidPaths: ['$.data.site'],
        invalidValueKinds: ['undefined'],
        provenance: {
          producer: 'unknown',
          handlerId: 'unknown.response-handler',
          messageType: 'UNKNOWN',
        },
      },
    });
  });

  it('converts a producer violation into a canonical typed failure response', () => {
    const requestId = crypto.randomUUID();
    const response = enforceResponseMessage(
      { requestId, success: true, data: { site: undefined } },
      requestId
    );
    expect(response).toEqual({
      requestId,
      success: false,
      error: {
        code: RESPONSE_CONTRACT_ERROR_CODE,
        message: 'Background response contract violation at $.data.site',
      },
    });
    expect(inspectResponseMessage(response, requestId)).toMatchObject({ ok: true });
  });

  it('rejects mismatched request IDs and malformed failure envelopes', () => {
    const requestId = crypto.randomUUID();
    expect(
      inspectResponseMessage(
        { requestId: crypto.randomUUID(), success: true, data: null },
        requestId
      )
    ).toMatchObject({ ok: false, issue: { category: 'request_id_mismatch' } });
    expect(
      inspectResponseMessage(
        { requestId, success: false, error: { code: 'E', message: 'x', extra: true } },
        requestId
      )
    ).toMatchObject({ ok: false, issue: { category: 'invalid_failure_envelope' } });
  });

  it('keeps optional fields omitted under Firefox and Chromium transport models', () => {
    const requestId = crypto.randomUUID();
    const response = {
      requestId,
      success: true as const,
      data: { global: { enabled: true } },
    };
    const firefox = structuredClone(response);
    const chromium = JSON.parse(JSON.stringify(response)) as typeof response;
    expect(Object.hasOwn(firefox.data, 'site')).toBe(false);
    expect(Object.hasOwn(chromium.data, 'site')).toBe(false);
    expect(inspectResponseMessage(firefox, requestId)).toMatchObject({ ok: true });
    expect(inspectResponseMessage(chromium, requestId)).toMatchObject({ ok: true });
  });
});
