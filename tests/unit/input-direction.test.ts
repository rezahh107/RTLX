import { describe, expect, it } from 'vitest';
import { directionForEditableText } from '../../src/content/input-direction';
describe('Persian/English input direction assistant', () => {
  it('uses RTL only for Persian evidence', () =>
    expect(directionForEditableText('این یک متن فارسی برای آزمایش است')).toBe('rtl'));
  it('uses LTR for English', () =>
    expect(directionForEditableText('This is an English message')).toBe('ltr'));
  it('does not relabel Urdu or Arabic as Persian', () => {
    expect(directionForEditableText('یہ ایک اردو جملہ ہے')).toBe('auto');
    expect(directionForEditableText('هذا نص عربي للاختبار')).toBe('auto');
  });
});
