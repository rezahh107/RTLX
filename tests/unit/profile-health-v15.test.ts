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
  it('does not make excessive protective selectors fatal when semantic rules are healthy', () => {
    const items = Array.from({ length: 251 }, () => '<code class="token">x</code>').join('');
    const document = installDom(`<html><body><main>سلام</main>${items}</body></html>`);
    const base = profileWith('main');
    const report = evaluateProfileHealth(
      document,
      {
        ...base,
        rules: [
          base.rules[0]!,
          {
            ...base.rules[0]!,
            ruleId: 'code:.token',
            category: 'code' as const,
            selector: '.token',
            directionMode: 'force-ltr' as const,
            alignmentMode: 'preserve' as const,
            typographyMode: 'preserve' as const,
          },
        ],
      },
      () => new Date(0)
    );
    expect(report.status).toBe('healthy');
    expect(report.rules[1]).toMatchObject({
      impact: 'protective',
      status: 'excessive-match',
      matchCount: 251,
    });
  });

  it('does not make protective-only excessive selectors profile-fatal', () => {
    const items = Array.from({ length: 251 }, () => '<code class="token">x</code>').join('');
    const document = installDom(`<html><body>${items}</body></html>`);
    const base = profileWith('main');
    const profile = {
      ...base,
      rules: [
        {
          ...base.rules[0]!,
          ruleId: 'code:.token',
          category: 'code' as const,
          selector: '.token',
          directionMode: 'force-ltr' as const,
          alignmentMode: 'preserve' as const,
          typographyMode: 'preserve' as const,
        },
      ],
    };
    const report = evaluateProfileHealth(document, profile, () => new Date(0));
    expect(report.profileMode).toBe('protective-only');
    expect(report.status).toBe('healthy');
    expect(report.rules[0]).toMatchObject({
      impact: 'protective',
      status: 'excessive-match',
      matchCount: 251,
    });
  });

  it('keeps invalid selectors fatal even for protective rules', () => {
    const document = installDom('<html><body><main>سلام</main></body></html>');
    const base = profileWith('main');
    const report = evaluateProfileHealth(
      document,
      {
        ...base,
        rules: [
          {
            ...base.rules[0]!,
            ruleId: 'code:invalid',
            category: 'code' as const,
            selector: '[',
            directionMode: 'force-ltr' as const,
            alignmentMode: 'preserve' as const,
            typographyMode: 'preserve' as const,
          },
        ],
      },
      () => new Date(0)
    );
    expect(report.status).toBe('invalid-selector');
    expect(report.rules[0]).toMatchObject({ impact: 'protective', status: 'invalid-selector' });
  });

  it('keeps semantic degraded semantics unchanged for required content rules', () => {
    const document = installDom('<html><body><main>سلام</main></body></html>');
    const base = profileWith('main');
    const report = evaluateProfileHealth(
      document,
      {
        ...base,
        rules: [
          base.rules[0]!,
          {
            ...base.rules[0]!,
            ruleId: 'content:.missing-required',
            selector: '.missing-required',
          },
        ],
      },
      () => new Date(0)
    );
    expect(report.status).toBe('degraded');
  });
});
