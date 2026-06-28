import { beforeEach, describe, expect, it } from 'vitest';
import { classifyCodeContext, classifyNaturalLanguagePre } from '../../src/content/code-context';
import { planCodeZones } from '../../src/content/code-zone-planner';
import { installDom } from '../dom-test-setup';

const proseCases = [
  `Acceptance Criteria برای Patch G

- مسیر کنترل باید evidence کافی داشته باشد.
- گزارش نهایی باید نسخه فعلی را نشان دهد.
- اگر تست مرورگر اجرا نشد، نباید pass اعلام شود.`,
  `موارد لازم برای تست:

- پیام فارسی باید راست‌چین شود.
- کد واقعی نباید تغییر کند.
- گزارش خطا باید دلیل را نشان دهد.`,
  `راهنمای بررسی PR برای reviewer

- فایل profile schema باید فقط flag جدید را قبول کند.
- command های انگلیسی در این جمله فقط به عنوان متن توضیحی آمده‌اند.
- نتیجه نهایی باید محافظه‌کارانه باقی بماند.`,
  `موارد لازم برای تست:

1. پیام فارسی باید راست‌چین شود.
2. کد واقعی نباید تغییر کند.
3. گزارش خطا باید دلیل را نشان دهد.`,
];

const codeCases = [
  `{
  "title": "سلام دنیا",
  "direction": "rtl",
  "enabled": true
}`,
  `# این یک کامنت فارسی است
def greet():
    print("سلام")`,
  `echo "سلام"
npm run build`,
  `const message = "گزارش نهایی باید نسخه فعلی را نشان دهد";
if (status !== "passed") throw new Error(message);`,
  `<div class="card">
  <p>سلام دنیا</p>
</div>`,
  `title: "سلام"
enabled: true
steps:
  - name: build`,
  `SELECT title FROM messages WHERE body = 'سلام دنیا';`,
  `Traceback (most recent call last):
  File "app.py", line 10, in <module>
    print("سلام")`,
  `$ echo "سلام"
> npm run build`,
];

function renderPreCode(text: string, id = 'case'): HTMLElement {
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.id = id;
  code.textContent = text;
  pre.append(code);
  document.body.replaceChildren(pre);
  return code;
}

describe('conservative natural-language-pre classifier', () => {
  beforeEach(() => installDom());

  it('promotes only high-confidence Persian prose when the explicit gate is enabled', () => {
    for (const [index, text] of proseCases.entries()) {
      const code = renderPreCode(text, `case-${index}`);
      const evidence = classifyNaturalLanguagePre(code);
      expect(evidence.kind).toBe('block-natural-rtl');
      expect(evidence.confidence).toBe('high');
      expect(evidence.vetoSignals).toEqual([]);
      expect(classifyCodeContext(code, [], { allowNaturalLanguagePre: true })).toBe(
        'block-natural-rtl'
      );
    }
  });

  it('preserves the same prose as block code when the gate is disabled', () => {
    renderPreCode(proseCases[0]!, 'prose');
    expect(classifyCodeContext(document.querySelector('#prose')!)).toBe('block-code');
  });

  it('vetoes real code even when Persian comments or strings are present', () => {
    for (const [index, text] of codeCases.entries()) {
      const code = renderPreCode(text, `case-${index}`);
      expect(classifyNaturalLanguagePre(code).kind).toBe('block-code');
      expect(classifyCodeContext(code, [], { allowNaturalLanguagePre: true })).toBe('block-code');
    }
  });

  it('vetoes syntax-highlighted prose-shaped blocks', () => {
    const highlighted = renderPreCode(proseCases[0]!, 'highlight');
    highlighted.className = 'language-js';
    const evidence = classifyNaturalLanguagePre(document.querySelector('#highlight')!);
    expect(evidence.kind).toBe('block-code');
    expect(evidence.vetoSignals).toContain('syntax-highlight-class');
  });

  it('plans scoped dir auto only for gated natural-language pre blocks', () => {
    renderPreCode(proseCases[0]!, 'prose');
    expect(planCodeZones(document.body, 1, []).operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: document.querySelector('pre'),
          name: 'dir',
          value: 'ltr',
        }),
        expect.objectContaining({
          target: document.querySelector('code'),
          name: 'dir',
          value: 'ltr',
        }),
      ])
    );
    const gated = planCodeZones(document.body, 1, [], undefined, { allowNaturalLanguagePre: true });
    expect(gated.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: document.querySelector('pre'),
          name: 'dir',
          value: 'auto',
        }),
        expect.objectContaining({
          target: document.querySelector('code'),
          name: 'dir',
          value: 'auto',
        }),
      ])
    );
  });

  it('leaves existing inline-code behavior unchanged', () => {
    document.body.innerHTML = '<p><code id="inline">متن فارسی طبیعی</code></p>';
    expect(classifyCodeContext(document.querySelector('#inline')!)).toBe('inline-natural-rtl');
  });
});
