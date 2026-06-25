export interface PopupLocale {
  lang: string;
  dir: 'rtl' | 'ltr';
}

export function resolvePopupLocale(uiLanguage: string): PopupLocale {
  const normalized = uiLanguage.trim().toLowerCase().replace(/_/gu, '-');
  const lang = normalized.split('-')[0] || 'en';
  return Object.freeze({ lang, dir: lang === 'fa' ? 'rtl' : 'ltr' });
}

export function applyPopupLocale(documentElement: HTMLElement, uiLanguage: string): PopupLocale {
  const locale = resolvePopupLocale(uiLanguage);
  documentElement.lang = locale.lang;
  documentElement.dir = locale.dir;
  return locale;
}
