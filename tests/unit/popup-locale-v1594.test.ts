import { describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import { applyPopupLocale, resolvePopupLocale } from '../../src/ui/popup/locale';

describe('RTLX 15.9.11 popup locale direction', () => {
  it('uses RTL only for the shipped Persian locale', () => {
    expect(resolvePopupLocale('fa-IR')).toEqual({ lang: 'fa', dir: 'rtl' });
    expect(resolvePopupLocale('fa_IR')).toEqual({ lang: 'fa', dir: 'rtl' });
    expect(resolvePopupLocale('en-US')).toEqual({ lang: 'en', dir: 'ltr' });
  });

  it('updates the document language and direction before localized strings render', () => {
    const document = installDom('<html lang="fa" dir="rtl"><body></body></html>');
    applyPopupLocale(document.documentElement, 'en-US');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    applyPopupLocale(document.documentElement, 'fa');
    expect(document.documentElement.lang).toBe('fa');
    expect(document.documentElement.dir).toBe('rtl');
  });
});
