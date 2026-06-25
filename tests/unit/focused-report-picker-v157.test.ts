import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';

describe('v15.7 focused report-only issue selector', () => {
  it('uses local-first defaults for Persian and Amazon Ember', () => {
    expect(DEFAULT_SETTINGS.persianFont).toBe('local-first');
    expect(DEFAULT_SETTINGS.latinFont).toBe('amazon-ember-local');
  });

  it('exposes a report-only issue selector without restoring profile authoring', () => {
    const html = readFileSync('src/ui/popup/index.html', 'utf8');
    const popup = readFileSync('src/ui/popup/index.ts', 'utf8');
    const picker = readFileSync('src/content/failure-evidence-picker.ts', 'utf8');
    expect(html).toContain('select-problem-area');
    expect(popup).toContain('START_FAILURE_PICKER');
    expect(popup).not.toContain('SAVE_PICKER_SELECTION');
    expect(picker).toContain('SAVE_FAILURE_ELEMENT_EVIDENCE');
    expect(picker).not.toContain('SAVE_PICKER_SELECTION');
    expect(picker).not.toContain('addSelectionToProfile');
  });

  it('clears stale selections into no-data instead of carrying stale-document state forward', () => {
    const source = readFileSync('src/background/failure-evidence.ts', 'utf8');
    expect(source).toContain('RTLX-FEC-SELECTION-LOCATION-MISMATCH-CLEARED');
    expect(source).toContain('RTLX-FEC-SELECTION-STALE-DOCUMENT-CLEARED');
    expect(source).not.toContain("'stale_document',\n      locationMatches");
  });
});
