import { describe, expect, it } from 'vitest';
import { isRequestMessage } from '../../src/shared/messages';

const requestId = '11111111-1111-4111-8111-111111111111';

describe('OU-007/OU-010 operational message contracts', () => {
  it('accepts exact operational status and safe-mode reset messages', () => {
    expect(isRequestMessage({ type: 'GET_OPERATIONAL_STATUS', requestId, payload: {} })).toBe(true);
    expect(isRequestMessage({ type: 'RESET_SAFE_MODE', requestId, payload: {} })).toBe(true);
  });

  it('rejects extra fields', () => {
    expect(isRequestMessage({ type: 'RESET_SAFE_MODE', requestId, payload: { force: true } })).toBe(
      false
    );
  });
});
