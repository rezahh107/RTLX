import { describe, expect, it, vi } from 'vitest';
import { typographyDecision } from '../../src/content/profile-zone';
import { selectedFontFaces, typographyOperations } from '../../src/content/typography-planner';
import { installDom } from '../dom-test-setup';
import type { Settings } from '../../src/shared/types';

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
  latinFont: 'amazon-ember-local',
  persianFont: 'vazirmatn-bundled',
  settingsScope: 'site',
  aggressiveNaturalLanguageWrapping: false,
  closedShadowDom: false,
  remoteProfiles: false,
  telemetry: false,
  diagnosticsPersistence: true,
});

describe('v15.6.0 mixed Persian/English typography', () => {
  it('treats mixed Persian/English technical content as typography eligible', () => {
    const document = installDom('<main>بازبینی CSS و Best Practices برای PersianNew.css</main>');
    const element = document.querySelector('main');
    expect(element).not.toBeNull();
    expect(typographyDecision(element!, settings, null, 'mixed')).toBe('eligible');
  });

  it('builds one composite family with bundled Persian and local Amazon Ember before Inter fallback', () => {
    const faces = selectedFontFaces(settings, 'chrome-extension://test/fonts/');
    expect(faces).toContain('"RTLX Selected Text"');
    expect(faces).toContain('vazirmatn-arabic');
    expect(faces).toContain('local("Amazon Ember Display"),local("Amazon Ember"),url(');
    expect(faces.indexOf('local("Amazon Ember Display")')).toBeLessThan(
      faces.indexOf('inter-latin')
    );
    expect(faces).not.toContain('local("Segoe UI")');
    expect(faces).not.toContain('local("Tahoma")');
  });

  it('supports local-first Persian fonts while keeping the bundled Vazirmatn fallback', () => {
    const faces = selectedFontFaces(
      { ...settings, persianFont: 'local-first' },
      'chrome-extension://test/fonts/'
    );
    expect(faces).toContain('local("Vazirmatn")');
    expect(faces).toContain('vazirmatn-arabic');
    expect(faces.indexOf('local("Vazirmatn")')).toBeLessThan(faces.indexOf('vazirmatn-arabic'));
  });

  it('applies the selected family only to safe text-bearing descendants', () => {
    const document = installDom(
      '<main><p>متن فارسی and English</p><code>const value = 1;</code></main>'
    );
    vi.stubGlobal('chrome', {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
      },
    });
    const element = document.querySelector('main');
    const paragraph = document.querySelector('p');
    const code = document.querySelector('code');
    const operations = typographyOperations(element!, document, 1, settings, 'start');
    const css = operations[0]?.type === 'inject-style' ? operations[0].cssText : '';
    const classTargets = operations
      .filter((operation) => operation.type === 'add-class')
      .map((operation) => operation.target);
    expect(css).toContain('font-family:"RTLX Selected Text",system-ui,sans-serif!important');
    expect(classTargets).toContain(paragraph);
    expect(classTargets).not.toContain(code);
  });
});
