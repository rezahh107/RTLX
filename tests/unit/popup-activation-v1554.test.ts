import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('v15.6.0 focused popup activation and recovery controls', () => {
  it('exposes the site activation switch and only the focused user controls', () => {
    const html = readFileSync('src/ui/popup/index.html', 'utf8');
    expect(html).toContain('id="active-toggle"');
    expect(html).toContain('role="switch"');
    expect(html).toContain('data-i18n="activateForSite"');
    expect(html).toContain('id="apply-current"');
    expect(html).toContain('id="persian-font"');
    expect(html).toContain('id="latin-font"');
    expect(html).toContain('id="download-page-debug-report"');
    expect(html).toContain('id="reset-site"');
    expect(html).not.toContain('element-picker');
    expect(html).not.toContain('profile-inspector');
    expect(html).not.toContain('sidepanel');
    expect(html).not.toContain('id="site-mode"');
  });

  it('requests site permission before enabling or applying the current site', () => {
    const source = readFileSync('src/ui/popup/index.ts', 'utf8');
    const activationStart = source.indexOf('async function setActivation');
    const activationPermission = source.indexOf(
      'await ensurePermission(context.url, context.hostname)',
      activationStart
    );
    const activationApply = source.indexOf('await applyCurrent(context, false)', activationStart);
    const applyStart = source.indexOf('async function applyCurrent');
    const applyPermission = source.indexOf(
      'await ensurePermission(context.url, context.hostname)',
      applyStart
    );
    const applyMessage = source.indexOf("message('APPLY_CURRENT_TAB'", applyStart);
    expect(activationPermission).toBeGreaterThan(activationStart);
    expect(activationApply).toBeGreaterThan(activationPermission);
    expect(applyPermission).toBeGreaterThan(applyStart);
    expect(applyMessage).toBeGreaterThan(applyPermission);
    expect(source).toContain('chrome.permissions.request({ origins }, resolve)');
  });

  it('waits for runtime work before exporting a privacy-safe page report', () => {
    const source = readFileSync('src/ui/popup/index.ts', 'utf8');
    const functionStart = source.indexOf('async function downloadReport');
    const permissionCall = source.indexOf(
      'await ensurePermission(context.url, context.hostname)',
      functionStart
    );
    const applyCall = source.indexOf("message('APPLY_CURRENT_TAB'", functionStart);
    const settleCall = source.indexOf(
      'await waitForSettledRuntime(context.tabId, 5000)',
      functionStart
    );
    const missingSnapshotGuard = source.indexOf(
      "if (!snapshot) return setToast(i18n('statusStarting'))",
      functionStart
    );
    const exportCall = source.indexOf("message('EXPORT_FAILURE_EVIDENCE'", functionStart);
    expect(functionStart).toBeGreaterThanOrEqual(0);
    expect(permissionCall).toBeGreaterThan(functionStart);
    expect(applyCall).toBeGreaterThan(permissionCall);
    expect(settleCall).toBeGreaterThan(applyCall);
    expect(missingSnapshotGuard).toBeGreaterThan(settleCall);
    expect(exportCall).toBeGreaterThan(missingSnapshotGuard);
  });

  it('offers one-click removal of stale user rules and site settings', () => {
    const source = readFileSync('src/ui/popup/index.ts', 'utf8');
    const resetStart = source.indexOf('async function resetSite');
    expect(resetStart).toBeGreaterThanOrEqual(0);
    expect(source.indexOf("message('DELETE_USER_PROFILE'", resetStart)).toBeGreaterThan(resetStart);
    expect(source.indexOf("message('UPDATE_SITE_SETTINGS'", resetStart)).toBeGreaterThan(
      resetStart
    );
    expect(source.indexOf("message('ROLLBACK'", resetStart)).toBeGreaterThan(resetStart);
  });

  it('keeps Persian and English localization complete for focused controls', () => {
    const fa = JSON.parse(readFileSync('_locales/fa/messages.json', 'utf8')) as Record<
      string,
      { message: string }
    >;
    const en = JSON.parse(readFileSync('_locales/en/messages.json', 'utf8')) as Record<
      string,
      { message: string }
    >;
    for (const key of [
      'activateForSite',
      'smartFixPage',
      'persianFontLabel',
      'englishFontLabel',
      'downloadPageDebugReport',
      'resetSite',
      'directionPolicyNote',
      'amazonLocalOnlyNote',
    ]) {
      expect(fa[key]?.message, `missing fa ${key}`).toBeTypeOf('string');
      expect(en[key]?.message, `missing en ${key}`).toBeTypeOf('string');
    }
  });
});
