import { beforeEach, describe, expect, it } from 'vitest';
import { matchedProfileRule, matchingProfileRules } from '../../src/content/profile-zone';
import type { SiteProfile } from '../../src/shared/types';
import { installDom } from '../dom-test-setup';

beforeEach(() => installDom());

function profile(): SiteProfile {
  return {
    schemaVersion: '3.0.0',
    profileId: 'fixture:precedence',
    profileVersion: 1,
    profileKind: 'bundled',
    displayName: 'Precedence fixture',
    match: { hosts: ['example.com'], pathPrefixes: ['/'] },
    selectors: {
      content: ['[role="main"]'],
      exclude: [],
      code: [],
      math: [],
      editor: ['[role="textbox"]'],
      terminal: [],
      mutationSensitive: [],
    },
    rules: [
      {
        ruleId: 'content-first-in-json',
        selector: '[role="main"]',
        category: 'content',
        enabled: true,
        directionMode: 'auto-safe',
        alignmentMode: 'start',
        typographyMode: 'persian-only',
        initialDelayMs: 0,
      },
      {
        ruleId: 'editor-second-in-json',
        selector: '[role="textbox"]',
        category: 'editor',
        enabled: true,
        directionMode: 'preserve',
        alignmentMode: 'preserve',
        typographyMode: 'preserve',
        initialDelayMs: 0,
      },
    ],
    scopePolicy: { mode: 'site', pathDepth: 1 },
    features: { direction: true, bidi: true, typography: true, shadowOpen: true },
    thresholds: {},
    metadata: {
      source: 'official',
      verification: 'synthetic-fixture',
      product: 'RTLX',
    },
  };
}

describe('v15.9.1 profile category precedence', () => {
  it('prioritizes editor protection over a broad content ancestor regardless of JSON order', () => {
    document.body.innerHTML = '<main role="main"><div role="textbox">سلام</div></main>';
    const textbox = document.querySelector('[role="textbox"]')!;
    const matches = matchingProfileRules(textbox, profile());
    expect(matches.map((entry) => [entry.ruleId, entry.accepted])).toEqual([
      ['editor-second-in-json', true],
      ['content-first-in-json', false],
    ]);
    expect(matchedProfileRule(textbox, profile())?.ruleId).toBe('editor-second-in-json');
  });
});

import { readFileSync, readdirSync } from 'node:fs';

describe('v15.9.1 bundled conversational editor policy', () => {
  it('preserves direction and typography for every bundled editor rule', () => {
    const names = readdirSync('profiles/bundled')
      .filter((name) => name.endsWith('.json') && name !== 'index.json')
      .sort();
    for (const name of names) {
      const value = JSON.parse(readFileSync(`profiles/bundled/${name}`, 'utf8')) as SiteProfile;
      for (const rule of value.rules.filter((entry) => entry.category === 'editor')) {
        expect(rule.directionMode, `${name}:${rule.ruleId}`).toBe('preserve');
        expect(rule.alignmentMode, `${name}:${rule.ruleId}`).toBe('preserve');
        expect(rule.typographyMode, `${name}:${rule.ruleId}`).toBe('preserve');
      }
    }
  });
});
