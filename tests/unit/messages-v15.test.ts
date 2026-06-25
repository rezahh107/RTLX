import { describe, expect, it } from 'vitest';
import { isRequestMessage } from '../../src/shared/messages';

const requestId = '123e4567-e89b-42d3-a456-426614174000';

describe('v15 hardened message contracts', () => {
  it('accepts runtime snapshot and fixture commands with exact payloads', () => {
    expect(
      isRequestMessage({ type: 'GET_RUNTIME_SNAPSHOT', requestId, payload: { tabId: 1 } })
    ).toBe(true);
    expect(
      isRequestMessage({ type: 'RECORD_FIXTURE_SUMMARY', requestId, payload: { tabId: 1 } })
    ).toBe(true);
    expect(
      isRequestMessage({
        type: 'GET_RUNTIME_SNAPSHOT',
        requestId,
        payload: { tabId: 1, text: 'leak' },
      })
    ).toBe(false);
  });

  it('validates profile history hashes', () => {
    expect(
      isRequestMessage({
        type: 'LIST_PROFILE_HISTORY',
        requestId,
        payload: { hostname: 'example.com' },
      })
    ).toBe(true);
    expect(
      isRequestMessage({
        type: 'RESTORE_PROFILE_HISTORY',
        requestId,
        payload: { hostname: 'example.com', hash: 'a'.repeat(64) },
      })
    ).toBe(true);
    expect(
      isRequestMessage({
        type: 'RESTORE_PROFILE_HISTORY',
        requestId,
        payload: { hostname: 'example.com', hash: 'bad' },
      })
    ).toBe(false);
  });
});
