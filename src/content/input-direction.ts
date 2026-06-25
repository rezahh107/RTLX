import { classifyLanguage } from './language-classifier';
export type EditableDirection = 'rtl' | 'ltr' | 'auto';
export function directionForEditableText(
  text: string,
  lang: string | null = null
): EditableDirection {
  const classification = classifyLanguage(text.slice(0, 4096).normalize('NFKC'), lang);
  if (classification.language === 'persian') return 'rtl';
  if (classification.language === 'latin') return 'ltr';
  return 'auto';
}
