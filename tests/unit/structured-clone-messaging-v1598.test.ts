import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  inspectResponseMessage,
  messageContractProvenance,
} from '../../src/shared/response-contract';

describe('RTLX 15.9.11 structured-clone messaging readiness', () => {
  it('keeps the current manifest on the default JSON messaging mode', () => {
    const manifest = JSON.parse(readFileSync('manifest.base.json', 'utf8')) as Record<
      string,
      unknown
    >;
    expect(manifest.message_serialization).toBeUndefined();
  });

  it('accepts the same canonical response under JSON and structured-clone transport', () => {
    const requestId = crypto.randomUUID();
    const response = {
      requestId,
      success: true as const,
      data: { global: { enabled: true }, site: { siteMode: 'auto-safe' } },
    };
    const provenance = messageContractProvenance(
      'background',
      'background.runtime.onMessage:REQUEST_CONTEXT',
      'REQUEST_CONTEXT'
    );
    expect(
      inspectResponseMessage(JSON.parse(JSON.stringify(response)), requestId, provenance)
    ).toMatchObject({ ok: true });
    expect(inspectResponseMessage(structuredClone(response), requestId, provenance)).toMatchObject({
      ok: true,
    });
  });
});
