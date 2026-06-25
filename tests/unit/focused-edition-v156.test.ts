import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { planMutations } from '../../src/content/mutation-planner';
import {
  DIRECTION_LTR_CLASS,
  DIRECTION_RTL_CLASS,
  DIRECTION_STYLE_ELEMENT_ID,
} from '../../src/shared/constants';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';
import { installDom } from '../dom-test-setup';

describe('v15.6.0 focused personal edition', () => {
  it('ships only the focused popup and excludes advanced browser surfaces', () => {
    const manifest = JSON.parse(readFileSync('manifest.base.json', 'utf8')) as Record<
      string,
      unknown
    >;
    expect(manifest.action).toEqual(expect.objectContaining({ default_popup: 'popup/index.html' }));
    expect(manifest.options_ui).toBeUndefined();
    expect(manifest.side_panel).toBeUndefined();
    expect(manifest.sidebar_action).toBeUndefined();
    expect(manifest.permissions).toEqual(['activeTab', 'alarms', 'scripting', 'storage']);

    const buildSource = readFileSync('scripts/build.mjs', 'utf8');
    expect(buildSource).toContain("'popup/index': join(root, 'src/ui/popup/index.ts')");
    expect(buildSource).not.toContain("'options/index'");
    expect(buildSource).not.toContain("'sidepanel/index'");
  });

  it('keeps legacy authoring tools in a source-only archive and out of active source', () => {
    const archive = readdirSync('developer-tools-archive/v15.5.5/content').sort();
    expect(archive).toEqual(
      expect.arrayContaining([
        'failure-evidence-picker.ts',
        'picker-controller.ts',
        'selector-generator.ts',
      ])
    );
    expect(() => readFileSync('src/content/picker-controller.ts', 'utf8')).toThrow();
    const packageSource = readFileSync('scripts/package-source.mjs', 'utf8');
    expect(packageSource).not.toContain("excludedDirectories.add('developer-tools-archive')");
  });

  it('ignores legacy user and community profiles in the active runtime resolver', () => {
    const source = readFileSync('src/background/profile-repository.ts', 'utf8');
    const start = source.indexOf('export async function findActiveProfile');
    const end = source.indexOf('export async function findBundledProfile');
    const activeResolver = source.slice(start, end);
    expect(activeResolver).toContain('return findBundledProfile(hostname, pathname)');
    expect(activeResolver).not.toContain('getUserProfile');
    expect(activeResolver).not.toContain('listCommunityProfiles');
  });

  it('plans semantic right alignment for Persian and left alignment for English', () => {
    const document = installDom('<main><p id="fa">متن فارسی</p><p id="en">English text</p></main>');
    const persian = document.querySelector('#fa')!;
    const english = document.querySelector('#en')!;

    const rtl = planMutations({
      candidate: persian,
      directionTarget: persian,
      action: 'set-rtl-on-candidate',
      settings: { ...DEFAULT_SETTINGS, typography: false, bidiIsolation: false },
      tokensByTextNode: new Map(),
      root: document,
      startSequence: 1,
      applyTypography: false,
      remainingWrapperBudget: 0,
    });
    const ltr = planMutations({
      candidate: english,
      directionTarget: english,
      action: 'set-ltr-on-candidate',
      settings: { ...DEFAULT_SETTINGS, typography: false, bidiIsolation: false },
      tokensByTextNode: new Map(),
      root: document,
      startSequence: 1,
      applyTypography: false,
      remainingWrapperBudget: 0,
    });

    expect(rtl.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'add-class', className: DIRECTION_RTL_CLASS }),
        expect.objectContaining({ type: 'add-attribute', name: 'dir', value: 'rtl' }),
        expect.objectContaining({
          type: 'inject-style',
          styleId: DIRECTION_STYLE_ELEMENT_ID,
          cssText: expect.stringContaining('text-align:start!important'),
        }),
      ])
    );
    expect(ltr.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'add-class', className: DIRECTION_LTR_CLASS }),
        expect.objectContaining({ type: 'add-attribute', name: 'dir', value: 'ltr' }),
        expect.objectContaining({
          type: 'inject-style',
          styleId: DIRECTION_STYLE_ELEMENT_ID,
          cssText: expect.stringContaining('text-align:start!important'),
        }),
      ])
    );
  });

  it('does not bundle Amazon font binaries without verified redistribution evidence', () => {
    const names = readdirSync('assets/fonts').map((name) => name.toLowerCase());
    const fontManifest = JSON.parse(readFileSync('assets/fonts/manifest.json', 'utf8')) as {
      files: { file: string }[];
    };
    const declaredNames = fontManifest.files.map((entry) => entry.file.toLowerCase());
    expect(names.some((name) => name.includes('amazon') || name.includes('ember'))).toBe(false);
    expect(declaredNames.some((name) => name.includes('amazon') || name.includes('ember'))).toBe(
      false
    );
    expect(declaredNames).toEqual(
      expect.arrayContaining(['inter-latin-400-normal.woff2', 'vazirmatn-arabic-400-normal.woff2'])
    );
  });
});
