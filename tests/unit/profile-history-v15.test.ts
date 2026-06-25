import { describe, expect, it } from 'vitest';
import { createProfileHistoryEntry } from '../../src/background/profile-history-repository';
import { createEmptyUserProfile } from '../../src/shared/profile-builder';

describe('Last known good profile history v15', () => {
  it('hashes canonical profile content deterministically', async () => {
    const profile = createEmptyUserProfile('example.com');
    const first = await createProfileHistoryEntry(profile, new Date(0));
    const second = await createProfileHistoryEntry(profile, new Date(0));
    expect(first).toEqual(second);
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.savedAt).toBe('1970-01-01T00:00:00.000Z');
  });
});
