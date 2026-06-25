import { describe, expect, it } from 'vitest';
import {
  amazonLocalFontFace,
  fontFamilyForLatinPolicy,
  localPersianFontFace,
} from '../../src/content/typography-planner';
describe('Latin font policy', () => {
  it('uses the bundled mixed family before local Persian fallback fonts by default', () => {
    const family = fontFamilyForLatinPolicy('inter');
    expect(family.indexOf('RTLX Mixed Text')).toBeLessThan(family.indexOf('RTLX Local Persian'));
  });
  it('declares only Persian local font sources without Windows system fallback or new permission dependency', () => {
    const face = localPersianFontFace();
    expect(face).toContain('local("Vazirmatn")');
    expect(face).toContain('local("Vazir")');
    expect(face).not.toContain('local("Segoe UI")');
    expect(face).not.toContain('local("Tahoma")');
    expect(face).not.toContain('queryLocalFonts');
  });
  it('supports Amazon Ember only through local() and never a remote or bundled URL', () => {
    const face = amazonLocalFontFace('amazon-ember-local');
    expect(face).toContain('local("Amazon Ember Display")');
    expect(face).not.toContain('url(');
    expect(face).not.toContain('http');
  });
  it('does not declare Amazon when preservation is selected', () =>
    expect(amazonLocalFontFace('preserve')).toBe(''));
});
