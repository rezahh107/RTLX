import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import {
  DIRECTION_LTR_CLASS,
  DIRECTION_OWNER_ATTRIBUTE,
  DIRECTION_RTL_CLASS,
  DIRECTION_STYLE_ELEMENT_ID,
  OWNED_CLASS,
  OWNED_WRAPPER_CLASS,
  RUNTIME_OWNER_ATTRIBUTE,
  STYLE_ELEMENT_ID,
  TYPOGRAPHY_CLASS,
} from '../../src/shared/constants';
import { reconcilePreexistingRuntimeOwnership } from '../../src/content/startup-reconciliation';

describe('RTLX 15.9.1 startup ownership reconciliation', () => {
  beforeEach(() => installDom('<html><head></head><body></body></html>'));

  it('cleans extension-owned classes, styles, wrappers, and explicitly owned dir attributes', () => {
    document.documentElement.setAttribute(RUNTIME_OWNER_ATTRIBUTE, '15.9.0:old-runtime');
    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    document.head.append(style);
    const directionStyle = document.createElement('style');
    directionStyle.id = DIRECTION_STYLE_ELEMENT_ID;
    document.head.append(directionStyle);

    const candidate = document.createElement('div');
    candidate.classList.add(OWNED_CLASS, DIRECTION_RTL_CLASS);
    candidate.setAttribute('dir', 'rtl');
    candidate.setAttribute(DIRECTION_OWNER_ATTRIBUTE, '15.9.0:old-runtime');
    const typography = document.createElement('span');
    typography.classList.add(TYPOGRAPHY_CLASS);
    const before = document.createTextNode('before ');
    const wrapper = document.createElement('bdi');
    wrapper.classList.add(OWNED_WRAPPER_CLASS);
    wrapper.setAttribute('dir', 'ltr');
    wrapper.append(document.createTextNode('ABC'));
    const after = document.createTextNode(' after');
    candidate.append(before, wrapper, after, typography);
    document.body.append(candidate);

    const result = reconcilePreexistingRuntimeOwnership(document);

    expect(result).toMatchObject({
      previousRuntimeMarker: '15.9.0:old-runtime',
      preexistingOwnedCandidates: 1,
      preexistingTypographyTargets: 1,
      preexistingDirectionTargets: 1,
      preexistingWrappers: 1,
      preexistingStyleElements: 2,
      ownedDirectionAttributesRemoved: 1,
      wrappersUnwrapped: 1,
      stylesRemoved: 2,
      cleanupFailures: 0,
      cleanupPerformed: true,
    });
    expect(candidate.hasAttribute('dir')).toBe(false);
    expect(candidate.hasAttribute(DIRECTION_OWNER_ATTRIBUTE)).toBe(false);
    expect(candidate.classList.contains(OWNED_CLASS)).toBe(false);
    expect(candidate.classList.contains(DIRECTION_RTL_CLASS)).toBe(false);
    expect(typography.classList.contains(TYPOGRAPHY_CLASS)).toBe(false);
    expect(document.querySelector(`.${OWNED_WRAPPER_CLASS}`)).toBeNull();
    expect(candidate.textContent).toBe('before ABC after');
    expect(document.getElementById(STYLE_ELEMENT_ID)).toBeNull();
    expect(document.getElementById(DIRECTION_STYLE_ELEMENT_ID)).toBeNull();
    expect(document.documentElement.hasAttribute(RUNTIME_OWNER_ATTRIBUTE)).toBe(false);
  });

  it('preserves ambiguous legacy dir attributes while removing stale visual ownership classes', () => {
    const candidate = document.createElement('div');
    candidate.classList.add(OWNED_CLASS, DIRECTION_LTR_CLASS);
    candidate.setAttribute('dir', 'ltr');
    document.body.append(candidate);

    const result = reconcilePreexistingRuntimeOwnership(document);

    expect(result.ambiguousLegacyDirectionAttributes).toBe(1);
    expect(candidate.getAttribute('dir')).toBe('ltr');
    expect(candidate.classList.contains(OWNED_CLASS)).toBe(false);
    expect(candidate.classList.contains(DIRECTION_LTR_CLASS)).toBe(false);
  });
});
