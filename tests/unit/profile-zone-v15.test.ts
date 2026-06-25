import { beforeEach, describe, expect, it } from 'vitest';
import {
  codeLikeSelectors,
  exclusionReason,
  isProfileExcluded,
  matchedProfileGroup,
  matchedProfileRule,
  matchesAny,
  matchingProfileRules,
  protectedTextSelectors,
  typographyDecision,
} from '../../src/content/profile-zone';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';
import { addSelectionToProfile } from '../../src/shared/profile-builder';
import type { PickerSelection, SiteProfile } from '../../src/shared/types';
import { installDom } from '../dom-test-setup';

function profileWith(
  selections: readonly Pick<PickerSelection, 'kind' | 'selector'>[]
): SiteProfile {
  let profile: SiteProfile | null = null;
  for (const selection of selections) {
    profile = addSelectionToProfile(
      'example.com',
      {
        schemaVersion: '2.0.0',
        hostname: 'example.com',
        kind: selection.kind,
        selector: selection.selector,
        directionMode: 'auto-safe',
        alignmentMode: 'start',
        typographyMode: 'persian-only',
        initialDelayMs: 0,
      },
      profile
    );
  }
  if (!profile) throw new Error('profile fixture unavailable');
  return profile;
}

describe('profile-zone hardening', () => {
  beforeEach(() => installDom());

  it('resolves groups and selectors deterministically', () => {
    document.body.innerHTML = '<main class="content"><code class="code">x</code></main>';
    const profile = profileWith([
      { kind: 'content', selector: '.content' },
      { kind: 'code', selector: '.code' },
    ]);
    const code = document.querySelector('code')!;
    expect(matchingProfileRules(code, null)).toEqual([]);
    expect(matchedProfileRule(code, profile)?.category).toBe('code');
    expect(matchedProfileGroup(code, profile)).toBe('code');
    expect(matchesAny(code, ['.missing', '.code'])).toBe(true);
    expect(matchesAny(code, ['[invalid'])).toBe(false);
    expect(codeLikeSelectors(profile)).toEqual(['.code']);
    expect(protectedTextSelectors(profile)).toEqual(['.code']);
  });

  it('reports safety exclusion reasons without mutating the element', () => {
    document.body.innerHTML = `
      <script id="hard"></script>
      <div id="ignored" class="ignore"></div>
      <div id="editor" class="editor"></div>
      <div id="terminal" class="terminal"></div>
      <div id="math" class="math"></div>
      <div id="code" class="code"></div>
      <button id="button">Control</button>
      <p id="safe">سلام</p>`;
    const profile = profileWith([
      { kind: 'ignore', selector: '.ignore' },
      { kind: 'editor', selector: '.editor' },
      { kind: 'terminal', selector: '.terminal' },
      { kind: 'math', selector: '.math' },
      { kind: 'code', selector: '.code' },
    ]);
    expect(exclusionReason(document.querySelector('#hard')!, profile)).toBe('hard-exclusion');
    expect(exclusionReason(document.querySelector('#ignored')!, profile)).toBe('profile-ignore');
    expect(exclusionReason(document.querySelector('#editor')!, profile)).toBe('profile-editor');
    expect(exclusionReason(document.querySelector('#terminal')!, profile)).toBe('profile-terminal');
    expect(exclusionReason(document.querySelector('#math')!, profile)).toBe('profile-math');
    expect(exclusionReason(document.querySelector('#code')!, profile)).toBe('profile-code');
    expect(exclusionReason(document.querySelector('#button')!, profile)).toBe('mutation-sensitive');
    expect(exclusionReason(document.querySelector('#safe')!, profile)).toBeNull();
    expect(isProfileExcluded(document.querySelector('#ignored')!, profile)).toBe(true);
    expect(isProfileExcluded(document.querySelector('#safe')!, profile)).toBe(false);
  });

  it('explains typography decisions for protected and eligible zones', () => {
    document.body.innerHTML = `
      <script id="hard"></script>
      <code id="code">x</code>
      <div id="math" class="math"></div>
      <div id="editor" class="editor"></div>
      <div id="terminal" class="terminal"></div>
      <span id="icon" class="icon"></span>
      <p id="text">سلام</p>`;
    const profile = profileWith([
      { kind: 'math', selector: '.math' },
      { kind: 'editor', selector: '.editor' },
      { kind: 'terminal', selector: '.terminal' },
    ]);
    const disabled = { ...DEFAULT_SETTINGS, typography: false };
    expect(typographyDecision(document.querySelector('#text')!, disabled, profile, 'persian')).toBe(
      'disabled'
    );
    expect(
      typographyDecision(document.querySelector('#hard')!, DEFAULT_SETTINGS, profile, 'persian')
    ).toBe('hard-excluded');
    expect(
      typographyDecision(document.querySelector('#code')!, DEFAULT_SETTINGS, profile, 'persian')
    ).toBe('code-zone');
    expect(
      typographyDecision(document.querySelector('#math')!, DEFAULT_SETTINGS, profile, 'persian')
    ).toBe('math-zone');
    expect(
      typographyDecision(document.querySelector('#editor')!, DEFAULT_SETTINGS, profile, 'persian')
    ).toBe('editor-zone');
    expect(
      typographyDecision(document.querySelector('#terminal')!, DEFAULT_SETTINGS, profile, 'persian')
    ).toBe('terminal-zone');
    expect(
      typographyDecision(document.querySelector('#icon')!, DEFAULT_SETTINGS, profile, 'persian')
    ).toBe('icon-protected');
    const text = document.querySelector('#text')!;
    expect(typographyDecision(text, DEFAULT_SETTINGS, profile, 'latin')).toBe('not-persian');
    expect(typographyDecision(text, DEFAULT_SETTINGS, profile, 'persian')).toBe('eligible');
    text.classList.add('rtlx-owned-candidate');
    expect(typographyDecision(text, DEFAULT_SETTINGS, profile, 'persian')).toBe('applied');
  });
});
