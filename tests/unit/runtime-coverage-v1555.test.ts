import { describe, expect, it, vi } from 'vitest';
import {
  createCandidateDiscoveryCursor,
  rankCandidates,
} from '../../src/content/candidate-discovery';
import {
  collectTypographyTargets,
  typographyOperations,
} from '../../src/content/typography-planner';
import { TYPOGRAPHY_CLASS } from '../../src/shared/constants';
import type { Settings } from '../../src/shared/types';
import { installDom } from '../dom-test-setup';

const settings: Settings = Object.freeze({
  schemaVersion: '2.1.0',
  enabled: true,
  siteMode: 'auto-safe',
  directionCorrection: true,
  bidiIsolation: true,
  typography: true,
  interactiveTextMutation: true,
  formFieldDirection: true,
  inputDirectionAssistant: true,
  listRepair: true,
  latinFont: 'inter',
  persianFont: 'vazirmatn-bundled',
  settingsScope: 'site',
  aggressiveNaturalLanguageWrapping: false,
  closedShadowDom: false,
  remoteProfiles: false,
  telemetry: false,
  diagnosticsPersistence: true,
});

describe('v15.6.0 complete-page runtime coverage', () => {
  it('resumes discovery deterministically beyond the legacy 100-candidate boundary', () => {
    const body = Array.from(
      { length: 175 },
      (_, index) => `<p id="p-${index}">متن فارسی ${index}</p>`
    ).join('');
    const document = installDom(`<main>${body}</main>`);
    const cursor = createCandidateDiscoveryCursor(document);
    const collected = new Set<Element>();
    let batches = 0;
    while (true) {
      const batch = cursor.nextBatch(25, 60);
      batches += 1;
      for (const candidate of batch.candidates) collected.add(candidate);
      if (!batch.hasMore) break;
      expect(batches).toBeLessThan(50);
    }
    expect(collected.size).toBeGreaterThan(100);
    expect([...collected].filter((element) => element.tagName === 'P')).toHaveLength(175);
    expect(cursor.snapshot()).toMatchObject({ completed: true, batches });
  });

  it('preserves a user-selected seed as the first discovery result', () => {
    const document = installDom('<div id="selected">متن انتخابی</div><main>متن دیگر</main>');
    const selected = document.querySelector('#selected')!;
    const batch = createCandidateDiscoveryCursor(document, [], selected).nextBatch(1, 10);
    expect(batch.candidates).toEqual([selected]);
    expect(batch.hasMore).toBe(true);
  });

  it('prioritizes semantic text content ahead of interface chrome', () => {
    const document = installDom(
      '<div role="button">دکمه</div><article id="message">متن اصلی فارسی</article>'
    );
    const button = document.querySelector('[role="button"]')!;
    const article = document.querySelector('article')!;
    expect(rankCandidates([button, article])[0]).toBe(article);
  });

  it('targets safe Persian text leaves without broad descendant font forcing', () => {
    const document = installDom(
      '<main>متن مستقیم <span>متن فارسی</span><code>کد فارسی</code><span aria-hidden="true">نماد</span></main>'
    );
    vi.stubGlobal('chrome', {
      runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
    });
    const main = document.querySelector('main')!;
    const targets = collectTypographyTargets(main);
    expect(targets.map((element) => element.tagName)).toEqual(['MAIN', 'SPAN']);
    const operations = typographyOperations(main, document, 1, settings, 'start');
    const typographyClasses = operations.filter(
      (operation) => operation.type === 'add-class' && operation.className === TYPOGRAPHY_CLASS
    );
    expect(typographyClasses).toHaveLength(2);
    const css = operations[0]?.type === 'inject-style' ? operations[0].cssText : '';
    expect(css).toContain(`.${TYPOGRAPHY_CLASS}{font-family:`);
    expect(css).toContain('!important');
    expect(css).not.toContain(`.${TYPOGRAPHY_CLASS} *`);
  });
});
