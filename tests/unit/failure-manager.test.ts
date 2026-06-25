import { describe, expect, it } from 'vitest';
import { FailureManager } from '../../src/content/failure-manager';

describe('failure manager', () => {
  it('trips only once per scope and key', () => {
    const manager = new FailureManager();
    expect(manager.trip('feature', 'bidi', 'hard_limit')).toBe(true);
    expect(manager.trip('feature', 'bidi', 'hard_limit')).toBe(false);
    expect(manager.isDisabled('feature', 'bidi')).toBe(true);
    expect(manager.diagnostics).toHaveLength(1);
  });
});
