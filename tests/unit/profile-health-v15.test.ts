import { describe, expect, it } from 'vitest';
import { evaluateProfileHealth } from '../../src/content/profile-health';
import { createEmptyUserProfile, addSelectionToProfile } from '../../src/shared/profile-builder';
import { installDom } from '../dom-test-setup';

function profileWith(selector: string) {
  return addSelectionToProfile(
    'example.com',
    {
      schemaVersion: '2.0.0',
      hostname: 'example.com',
      kind: 'content',
      selector,
      directionMode: 'auto-safe',
      alignmentMode: 'start',
      typographyMode: 'persian-only',
      initialDelayMs: 0,
    },
    createEmptyUserProfile('example.com')
  );
}

describe('Profile Health Engine v15', () => {
  it('reports healthy and no-match deterministically', () => {
    const document = installDom('<html><body><main>سلام</main></body></html>');
    const healthy = evaluateProfileHealth(document, profileWith('main'), () => new Date(0));
    const missing = evaluateProfileHealth(document, profileWith('.missing'), () => new Date(0));
    expect(healthy.schemaVersion).toBe('1.1.0');
    expect(healthy.profileMode).toBe('semantic-assisted');
    expect(healthy.status).toBe('healthy');
    expect(healthy.rules[0]).toMatchObject({ matchCount: 1, status: 'healthy' });
    expect(missing.status).toBe('no-match');
    expect(missing.checkedAt).toBe('1970-01-01T00:00:00.000Z');
  });

  it('reports excessive matches using the versioned hard limit', () => {
    const items = Array.from({ length: 251 }, () => '<p class="item">x</p>').join('');
    const document = installDom(`<html><body>${items}</body></html>`);
    const report = evaluateProfileHealth(document, profileWith('.item'), () => new Date(0));
    expect(report.status).toBe('excessive-match');
    expect(report.rules[0]?.matchCount).toBe(251);
  });

  it('is not applicable without a profile', () => {
    const document = installDom();
    const report = evaluateProfileHealth(document, null, () => new Date(0));
    expect(report.profileMode).toBe('none');
    expect(report.status).toBe('not-applicable');
  });

  it('does not degrade a protective-only profile when safety selectors do not match', () => {
    const document = installDom('<html><body><p>سلام</p></body></html>');
    const profile = {
      ...profileWith('main'),
      rules: [
        {
          ...profileWith('main').rules[0]!,
          category: 'editor' as const,
          selector: '[contenteditable=true]',
          directionMode: 'force-ltr' as const,
          alignmentMode: 'preserve' as const,
          typographyMode: 'preserve' as const,
        },
      ],
      selectors: {
        content: [],
        exclude: [],
        code: [],
        math: [],
        editor: ['[contenteditable=true]'],
        terminal: [],
        mutationSensitive: [],
      },
    };
    const report = evaluateProfileHealth(document, profile, () => new Date(0));
    expect(report.profileMode).toBe('protective-only');
    expect(report.status).toBe('healthy');
    expect(report.rules[0]).toMatchObject({
      impact: 'protective',
      status: 'no-match',
    });
  });
});
