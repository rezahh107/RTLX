import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fa = JSON.parse(readFileSync('_locales/fa/messages.json', 'utf8')) as Record<
  string,
  { message: string }
>;
const en = JSON.parse(readFileSync('_locales/en/messages.json', 'utf8')) as Record<
  string,
  { message: string }
>;

describe('v15.6.0 focused Persian UI/UX', () => {
  it('keeps every focused popup localization key complete', () => {
    const content = readFileSync('src/ui/popup/index.html', 'utf8');
    const keys = new Set<string>();
    for (const match of content.matchAll(/data-i18n="([A-Za-z0-9]+)"/gu)) {
      const key = match[1];
      if (key) keys.add(key);
    }
    for (const key of [...keys].sort()) {
      expect(fa[key]?.message, `missing fa ${key}`).toBeTypeOf('string');
      expect(en[key]?.message, `missing en ${key}`).toBeTypeOf('string');
    }
  });

  it('uses the bundled Persian UI font, locale-aware direction, and semantic status colors', () => {
    const css = readFileSync('src/ui/popup/styles.css', 'utf8');
    expect(css).toContain("font-family: 'RTLX UI Persian'");
    expect(css).toContain("local('Vazirmatn')");
    expect(css).toContain("url('../fonts/vazirmatn-arabic-400-normal.woff2')");
    expect(css).toContain('direction: inherit');
    expect(css).toContain(":root[dir='rtl']");
    expect(css).toContain(":root[dir='ltr']");
    expect(css).toContain('--success:');
    expect(css).toContain('--warning:');
    expect(css).toContain('--danger:');
    expect(css).toContain('--neutral:');
    expect(css).toContain(':focus-visible');
  });

  it('exposes only user-facing typography controls without local-font or advanced UI permissions', () => {
    const popupHtml = readFileSync('src/ui/popup/index.html', 'utf8');
    const manifest = JSON.parse(readFileSync('manifest.base.json', 'utf8')) as {
      permissions: string[];
      optional_permissions?: string[];
      options_ui?: unknown;
    };
    expect(popupHtml).toContain('id="persian-font"');
    expect(popupHtml).toContain('value="vazirmatn-bundled"');
    expect(popupHtml).toContain('value="local-first"');
    expect(popupHtml).toContain('id="latin-font"');
    expect(popupHtml).toContain('value="amazon-ember-local"');
    expect(popupHtml).toContain('value="inter"');
    expect([
      ...(manifest.permissions ?? []),
      ...(manifest.optional_permissions ?? []),
    ]).not.toContain('local-fonts');
    expect(manifest.options_ui).toBeUndefined();
  });
});
