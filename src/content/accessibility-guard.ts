import { isCodeZone, isHardExcluded, isMutationSensitive } from './exclusion-registry';

export type AccessibilityDecision =
  | 'hard-exclude'
  | 'mutation-sensitive'
  | 'conditionally-safe'
  | 'safe';

const ICON_SELF_SELECTOR =
  'svg,use,img,[role="img"],[aria-hidden="true"],[class*="icon" i],[class*="glyph" i],[class*="symbol" i],[class*="logo" i]';
const ICON_DESCENDANT_SELECTOR =
  'svg,use,img,[role="img"],[aria-hidden="true"],[class*="icon" i],[class*="glyph" i],[class*="symbol" i],[class*="logo" i]';
const INTERACTIVE_SELECTOR =
  'button,a,label,summary,[role="button"],[role="link"],[role="menuitem"],[role="tab"]';

export function assessAccessibility(element: Element): AccessibilityDecision {
  if (isHardExcluded(element) || isCodeZone(element)) return 'hard-exclude';
  if (
    element.closest(
      '[aria-live]:not([aria-live="off"]),[aria-atomic="true"],[contenteditable],[role="textbox"]'
    )
  )
    return 'hard-exclude';
  if (isMutationSensitive(element)) return 'mutation-sensitive';
  if (element.matches('h1,h2,h3,h4,h5,h6,[role],[tabindex="-1"]')) return 'conditionally-safe';
  return 'safe';
}

export function isIconProtected(element: Element): boolean {
  if (element.matches(ICON_SELF_SELECTOR) || element.closest('svg,use,[role="img"]')) return true;
  const className = element.getAttribute('class') ?? '';
  if (/\b(?:fa[srlb]?|material-icons|icon|glyph|symbol|logo)\b/iu.test(className)) return true;
  const text = (element.textContent ?? '').trim();
  if (containsPrivateUse(text)) return true;
  if (text.length === 0 && element.getAttribute('aria-label')) return true;
  if (element.matches(INTERACTIVE_SELECTOR) && element.querySelector(ICON_DESCENDANT_SELECTOR))
    return true;
  try {
    const style = getComputedStyle(element);
    if (/fontawesome|material icons|icomoon|glyphicons?|iconfont/iu.test(style.fontFamily))
      return true;
    if (generatedIconEvidence(element, style, '::before')) return true;
    if (generatedIconEvidence(element, style, '::after')) return true;
  } catch {
    return true;
  }
  return false;
}

export function hasIconDescendant(element: Element): boolean {
  return element.querySelector(ICON_DESCENDANT_SELECTOR) !== null;
}

export function generatedIconSnapshot(element: Element): Readonly<{
  beforeContentPresent: boolean;
  afterContentPresent: boolean;
  beforePrivateUse: boolean;
  afterPrivateUse: boolean;
  beforeFontFamily: string | null;
  afterFontFamily: string | null;
}> {
  try {
    const before = getComputedStyle(element, '::before');
    const after = getComputedStyle(element, '::after');
    const beforeContent = normalizeGeneratedContent(before.content);
    const afterContent = normalizeGeneratedContent(after.content);
    return Object.freeze({
      beforeContentPresent: beforeContent.length > 0,
      afterContentPresent: afterContent.length > 0,
      beforePrivateUse: containsPrivateUse(beforeContent),
      afterPrivateUse: containsPrivateUse(afterContent),
      beforeFontFamily: before.fontFamily || null,
      afterFontFamily: after.fontFamily || null,
    });
  } catch {
    return Object.freeze({
      beforeContentPresent: false,
      afterContentPresent: false,
      beforePrivateUse: false,
      afterPrivateUse: false,
      beforeFontFamily: null,
      afterFontFamily: null,
    });
  }
}

function generatedIconEvidence(
  element: Element,
  elementStyle: CSSStyleDeclaration,
  pseudo: '::before' | '::after'
): boolean {
  const style = getComputedStyle(element, pseudo);
  const content = normalizeGeneratedContent(style.content);
  if (content.length === 0) return false;
  if (containsPrivateUse(content)) return true;
  if (/fontawesome|material icons|icomoon|glyphicons?|iconfont/iu.test(style.fontFamily))
    return true;
  return style.fontFamily !== elementStyle.fontFamily;
}

function normalizeGeneratedContent(value: string): string {
  if (!value || value === 'none' || value === 'normal' || value === '""' || value === "''")
    return '';
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  )
    return value.slice(1, -1);
  return value;
}

function containsPrivateUse(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    if (
      (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
      (codePoint >= 0xf0000 && codePoint <= 0xffffd) ||
      (codePoint >= 0x100000 && codePoint <= 0x10fffd)
    )
      return true;
  }
  return false;
}
