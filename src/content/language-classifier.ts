import { PERSIAN_SIGNALS_REGISTRY } from '../shared/registry-data';
import type { BaseDirection, LanguageResult, PersianSignals } from '../shared/types';

const PERSIAN_DISTINCT = new Set(
  PERSIAN_SIGNALS_REGISTRY.distinctCodePoints.map((value) => String.fromCodePoint(value))
);
const NON_PERSIAN_DISTINCT = new Set(
  PERSIAN_SIGNALS_REGISTRY.nonPersianDistinctCodePoints.map((value) => String.fromCodePoint(value))
);
const PERSIAN_LEXICON = new Set(PERSIAN_SIGNALS_REGISTRY.lexicalSignals);
const LETTER = /\p{L}/u;
const ARABIC_SCRIPT = /\p{Script=Arabic}/u;
const LATIN_SCRIPT = /\p{Script=Latin}/u;
const HEBREW_SCRIPT = /\p{Script=Hebrew}/u;
const RTL_SCRIPT =
  /\p{Script=Arabic}|\p{Script=Hebrew}|\p{Script=Syriac}|\p{Script=Thaana}|\p{Script=Nko}|\p{Script=Samaritan}|\p{Script=Mandaic}|\p{Script=Adlam}/u;

export function firstStrongDirection(text: string): BaseDirection {
  for (const char of text.normalize('NFKC')) {
    if (char === '\u200f' || char === '\u061c' || RTL_SCRIPT.test(char)) return 'rtl';
    if (char === '\u200e' || LETTER.test(char)) return 'ltr';
  }
  return 'unknown';
}

export function classifyLanguage(text: string, lang: string | null = null): LanguageResult {
  const normalized = text.normalize('NFKC');
  const words = normalized
    .toLocaleLowerCase('fa-IR')
    .split(/[^\p{L}\p{M}]+/u)
    .filter(Boolean);
  let totalLetters = 0;
  let arabicScriptLetters = 0;
  let persianDistinctLetters = 0;
  let nonPersianDistinctLetters = 0;
  let latinLetters = 0;
  let hebrewLetters = 0;
  for (const char of normalized) {
    if (!LETTER.test(char)) continue;
    totalLetters += 1;
    if (ARABIC_SCRIPT.test(char)) arabicScriptLetters += 1;
    if (LATIN_SCRIPT.test(char)) latinLetters += 1;
    if (HEBREW_SCRIPT.test(char)) hebrewLetters += 1;
    if (PERSIAN_DISTINCT.has(char)) persianDistinctLetters += 1;
    if (NON_PERSIAN_DISTINCT.has(char)) nonPersianDistinctLetters += 1;
  }
  const lexicalHits = words.reduce((count, word) => count + (PERSIAN_LEXICON.has(word) ? 1 : 0), 0);
  const normalizedLang = lang?.toLocaleLowerCase('en-US') ?? null;
  const explicitLangFa = normalizedLang === 'fa' || normalizedLang?.startsWith('fa-') === true;
  const explicitNonPersianArabic =
    normalizedLang === 'ar' ||
    normalizedLang?.startsWith('ar-') === true ||
    normalizedLang === 'ur' ||
    normalizedLang?.startsWith('ur-') === true;
  const signals: PersianSignals = Object.freeze({
    totalLetters,
    arabicScriptLetters,
    persianDistinctLetters,
    latinLetters,
    lexicalHits,
    explicitLangFa,
  });
  const detectedDirection = firstStrongDirection(normalized);
  if (explicitLangFa && totalLetters >= 4) return result('persian', 1, detectedDirection, signals);
  if ((explicitNonPersianArabic || nonPersianDistinctLetters > 0) && arabicScriptLetters > 0)
    return result('arabic-script-non-persian', 1, detectedDirection, signals);
  if (totalLetters === 0) return result('unknown', 0, detectedDirection, signals);

  const thresholds = PERSIAN_SIGNALS_REGISTRY.thresholds;
  const arabicDominance = arabicScriptLetters / Math.max(totalLetters, 1);
  const distinctSignal = Math.min(
    persianDistinctLetters / Math.max(arabicScriptLetters, 1) / thresholds.distinctRatioScale,
    1
  );
  const lexicalSignal = Math.min(lexicalHits / 3, 1);
  const confidence = round6(0.5 * arabicDominance + 0.3 * distinctSignal + 0.2 * lexicalSignal);

  if (
    arabicScriptLetters >= thresholds.minimumArabicScriptLetters &&
    (persianDistinctLetters >= thresholds.minimumDistinctLetters ||
      lexicalHits >= thresholds.minimumLexicalHitsAlternative) &&
    confidence >= thresholds.minimumConfidence
  ) {
    return result(latinLetters > 0 ? 'mixed' : 'persian', confidence, detectedDirection, signals);
  }
  if (arabicScriptLetters > latinLetters && arabicScriptLetters > hebrewLetters) {
    return result('arabic-script-non-persian', confidence, detectedDirection, signals);
  }
  if (latinLetters > 0 && arabicScriptLetters > 0)
    return result('mixed', confidence, detectedDirection, signals);
  if (latinLetters > 0) return result('latin', 1, detectedDirection, signals);
  return result('unknown', confidence, detectedDirection, signals);
}

function result(
  language: LanguageResult['language'],
  confidence: number,
  detectedDirection: BaseDirection,
  signals: PersianSignals
): LanguageResult {
  return Object.freeze({ language, confidence, detectedDirection, signals });
}
function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
