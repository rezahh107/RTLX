import { describe, expect, it } from 'vitest';
import { classifyLanguage, firstStrongDirection } from '../../src/content/language-classifier';
describe('Persian classifier v1', () => {
  it('uses explicit fa lang only when at least four letters exist', () => {
    expect(classifyLanguage('متن فارسی', 'fa').language).toBe('persian');
    expect(classifyLanguage('متن', 'fa').language).not.toBe('persian');
  });
  it('classifies conservative Persian evidence', () => {
    const result = classifyLanguage('این یک متن فارسی است که برای شما نوشته شده است');
    expect(result.language).toBe('persian');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });
  it('does not label Arabic as Persian without Persian evidence', () => {
    expect(classifyLanguage('هذا نص عربي للاختبار فقط بدون حروف فارسية').language).toBe(
      'arabic-script-non-persian'
    );
  });
  it('does not label Hebrew as Persian', () => {
    expect(classifyLanguage('זהו טקסט עברי לבדיקה').language).toBe('unknown');
  });
  it('finds first strong direction', () => {
    expect(firstStrongDirection('123 فارسی')).toBe('rtl');
    expect(firstStrongDirection('123 English')).toBe('ltr');
    expect(firstStrongDirection('123')).toBe('unknown');
  });
});

describe('classifier regressions', () => {
  it('does not classify Urdu-specific letters as Persian without fa evidence', () => {
    expect(classifyLanguage('یہ ایک اردو عبارت ہے جس میں کچھ الفاظ ہیں').language).toBe(
      'arabic-script-non-persian'
    );
  });
  it('treats non-RTL Unicode letters as LTR for first-strong direction', () => {
    expect(firstStrongDirection('123 Привет')).toBe('ltr');
  });
});
