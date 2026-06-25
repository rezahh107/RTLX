import { describe, expect, it } from 'vitest';
import { matchingProfileRules } from '../../src/content/profile-zone';
import { addSelectionToProfile } from '../../src/shared/profile-builder';
import { installDom } from '../dom-test-setup';

describe('Rule conflict inspector v15', () => {
  it('preserves profile order and explains suppressed matches', () => {
    const document = installDom('<html><body><main class="content">سلام</main></body></html>');
    let profile = addSelectionToProfile(
      'example.com',
      {
        schemaVersion: '2.0.0',
        hostname: 'example.com',
        kind: 'content',
        selector: 'main',
        directionMode: 'auto-safe',
        alignmentMode: 'start',
        typographyMode: 'persian-only',
        initialDelayMs: 0,
      },
      null
    );
    profile = addSelectionToProfile(
      'example.com',
      {
        schemaVersion: '2.0.0',
        hostname: 'example.com',
        kind: 'content',
        selector: '.content',
        directionMode: 'auto-safe',
        alignmentMode: 'start',
        typographyMode: 'persian-only',
        initialDelayMs: 0,
      },
      profile
    );
    const matches = matchingProfileRules(document.querySelector('main')!, profile);
    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({
      accepted: true,
      reason: 'first-enabled-match',
      profileOrder: 0,
    });
    expect(matches[1]).toMatchObject({
      accepted: false,
      reason: 'suppressed-later-match',
      profileOrder: 1,
    });
  });
});
