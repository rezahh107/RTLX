import { describe, expect, it } from 'vitest';
import { sendMessage } from '../../src/shared/api-adapter';
import type { RequestMessage } from '../../src/shared/messages';

describe('RTLX 15.9.11 request-side diagnostic parity', () => {
  it('rejects a non-canonical request before transport while preserving requestId', async () => {
    const requestId = crypto.randomUUID();
    const request = {
      type: 'REQUEST_CONTEXT',
      requestId,
      payload: { hostname: 'chatgpt.com', pathname: '/', invalid: undefined },
    } as unknown as RequestMessage;

    await expect(sendMessage(request)).rejects.toMatchObject({
      name: 'ExtensionRequestContractError',
      requestId,
      failureBoundary: 'request_validation',
      responseReceived: false,
      issue: {
        category: 'non_canonical',
        message: '$.payload.invalid contains undefined',
        invalidPaths: ['$.payload.invalid'],
        invalidValueKinds: ['undefined'],
        provenance: {
          producer: expect.any(String),
          handlerId: expect.stringContaining('sendMessage:REQUEST_CONTEXT'),
          messageType: 'REQUEST_CONTEXT',
        },
      },
    });
  });
});
