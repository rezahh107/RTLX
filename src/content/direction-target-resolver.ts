import { isIconProtected } from './accessibility-guard';
import { isHardExcluded, isHiddenOrInert } from './exclusion-registry';
import { matchesAny } from './profile-zone';

const LAYOUT_DISPLAYS = new Set(['flex', 'inline-flex', 'grid', 'inline-grid']);
const LAYOUT_ROLES = new Set(['toolbar', 'navigation', 'menu', 'menubar', 'tablist', 'group']);
const BLOCK_CAPABLE_DISPLAYS = new Set(['block', 'list-item', 'table-cell', 'flow-root']);
const BLOCK_CAPABLE_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DD',
  'DIV',
  'DT',
  'FIGCAPTION',
  'FOOTER',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'LI',
  'MAIN',
  'P',
  'SECTION',
  'TD',
  'TH',
]);
const DESCENDANT_BLOCK_SELECTOR =
  'p,li,h1,h2,h3,h4,h5,h6,blockquote,dd,dt,figcaption,td,th,div,address';
const ICON_DESCENDANTS =
  'svg,use,img,[role="img"],[aria-hidden="true"],[class*="icon" i],[class*="glyph" i],[class*="symbol" i],[class*="logo" i]';
const INTERACTIVE_DESCENDANTS =
  'button,a,input,textarea,select,[role="button"],[role="link"],[role="menuitem"],[role="tab"]';

export type DirectionTargetStrategy =
  | 'semantic-block'
  | 'source-block-owner'
  | 'descendant-block-owner'
  | 'inline-isolation-only'
  | 'unavailable-layout-sensitive';

export interface LayoutSafetyAssessment {
  display: string;
  flexDirection: string;
  overflowX: string;
  overflowY: string;
  role: string | null;
  containsIcons: boolean;
  containsControls: boolean;
  directNaturalText: boolean;
  layoutSensitive: boolean;
  reason: string | null;
}

export interface DirectionTargetResolution {
  element: Element | null;
  alignmentElement: Element | null;
  listMarkerElement: Element | null;
  strategy: DirectionTargetStrategy;
  depth: number;
  semanticLayout: LayoutSafetyAssessment;
}

export function resolveDirectionTarget(
  sourceCandidate: Element,
  textBlock: Element,
  protectedSelectors: readonly string[] = []
): DirectionTargetResolution {
  const semanticLayout = assessLayoutSafety(textBlock);
  const listMarkerElement = resolveListMarkerElement(textBlock, protectedSelectors);
  if (isSafeDirectionTarget(textBlock, protectedSelectors))
    return Object.freeze({
      element: textBlock,
      alignmentElement: isAlignmentCapable(textBlock) ? textBlock : null,
      listMarkerElement,
      strategy: 'semantic-block',
      depth: 0,
      semanticLayout,
    });

  let current: Element | null = sourceCandidate;
  let depth = 0;
  while (current && textBlock.contains(current)) {
    if (isSafeDirectionTarget(current, protectedSelectors))
      return Object.freeze({
        element: current,
        alignmentElement: isAlignmentCapable(current) ? current : null,
        listMarkerElement,
        strategy: isAlignmentCapable(current) ? 'source-block-owner' : 'inline-isolation-only',
        depth,
        semanticLayout,
      });
    if (current === textBlock) break;
    current = current.parentElement;
    depth += 1;
  }

  const descendants = [...textBlock.querySelectorAll(DESCENDANT_BLOCK_SELECTOR)];
  for (const candidate of descendants) {
    if (!isSafeDirectionTarget(candidate, protectedSelectors)) continue;
    const candidateDepth = descendantDepth(textBlock, candidate);
    return Object.freeze({
      element: candidate,
      alignmentElement: isAlignmentCapable(candidate) ? candidate : null,
      listMarkerElement,
      strategy: isAlignmentCapable(candidate) ? 'descendant-block-owner' : 'inline-isolation-only',
      depth: candidateDepth,
      semanticLayout,
    });
  }

  const inlineOwner = firstSafeInlineTextOwner(textBlock, protectedSelectors);
  if (inlineOwner)
    return Object.freeze({
      element: inlineOwner,
      alignmentElement: null,
      listMarkerElement,
      strategy: 'inline-isolation-only',
      depth: descendantDepth(textBlock, inlineOwner),
      semanticLayout,
    });

  return Object.freeze({
    element: null,
    alignmentElement: null,
    listMarkerElement,
    strategy: 'unavailable-layout-sensitive',
    depth: 0,
    semanticLayout,
  });
}

function resolveListMarkerElement(
  textBlock: Element,
  protectedSelectors: readonly string[]
): Element | null {
  const item = textBlock.closest('li');
  if (!item || !item.isConnected) return null;
  if (isHardExcluded(item) || isHiddenOrInert(item)) return null;
  if (matchesAny(item, protectedSelectors)) return null;
  if (isIconProtected(item) || isIconBoundary(item)) return null;
  return item;
}

export function assessLayoutSafety(element: Element): LayoutSafetyAssessment {
  const style = safeComputedStyle(element);
  const inlineStyle = 'style' in element ? (element as HTMLElement).style : null;
  const display = style?.display || inlineStyle?.display || '';
  const flexDirection = style?.flexDirection || inlineStyle?.flexDirection || '';
  const inlineOverflow = inlineStyle?.overflow || '';
  const overflowX = style?.overflowX || inlineStyle?.overflowX || inlineOverflow || '';
  const overflowY = style?.overflowY || inlineStyle?.overflowY || inlineOverflow || '';
  const role = element.getAttribute('role')?.toLowerCase() ?? null;
  const containsIcons = Boolean(element.querySelector(ICON_DESCENDANTS));
  const containsControls = Boolean(element.querySelector(INTERACTIVE_DESCENDANTS));
  const directNaturalText = hasDirectNaturalText(element);
  const layoutDisplay = LAYOUT_DISPLAYS.has(display);
  const roleSensitive = role !== null && LAYOUT_ROLES.has(role);
  const clips = ['hidden', 'clip'].includes(overflowX) || ['hidden', 'clip'].includes(overflowY);
  const mixedLayout = containsIcons || containsControls || roleSensitive;
  const layoutSensitive =
    isIconBoundary(element) || roleSensitive || (layoutDisplay && (mixedLayout || clips));
  let reason: string | null = null;
  if (isIconBoundary(element)) reason = 'icon-boundary';
  else if (roleSensitive) reason = 'layout-role';
  else if (layoutDisplay && containsIcons) reason = 'layout-with-icons';
  else if (layoutDisplay && containsControls) reason = 'layout-with-controls';
  else if (layoutDisplay && clips) reason = 'clipped-layout-container';

  return Object.freeze({
    display,
    flexDirection,
    overflowX,
    overflowY,
    role,
    containsIcons,
    containsControls,
    directNaturalText,
    layoutSensitive,
    reason,
  });
}

export function isLayoutSensitiveContainer(element: Element): boolean {
  return assessLayoutSafety(element).layoutSensitive;
}

export function isIconBoundary(element: Element): boolean {
  return (
    element.matches('svg,use,img,[role="img"],[aria-hidden="true"]') ||
    element.closest('svg,use,[role="img"]') !== null
  );
}

export function hasDirectNaturalText(element: Element): boolean {
  let inspected = 0;
  for (const node of element.childNodes) {
    if (!(node instanceof Text)) continue;
    const text = node.data.normalize('NFKC').trim();
    inspected += text.length;
    if (/\p{L}/u.test(text)) return true;
    if (inspected >= 512) break;
  }
  return false;
}

export function isAlignmentCapable(element: Element): boolean {
  const display =
    safeComputedStyle(element)?.display || (element as HTMLElement).style?.display || '';
  if (BLOCK_CAPABLE_DISPLAYS.has(display)) return true;
  if (display.length > 0) return false;
  return BLOCK_CAPABLE_TAGS.has(element.tagName);
}

function isSafeDirectionTarget(element: Element, protectedSelectors: readonly string[]): boolean {
  if (!hasOwnedNaturalText(element)) return false;
  if (isHardExcluded(element) || isHiddenOrInert(element)) return false;
  if (matchesAny(element, protectedSelectors)) return false;
  if (isIconProtected(element) || isIconBoundary(element)) return false;
  if (assessLayoutSafety(element).layoutSensitive) return false;
  return true;
}

function hasOwnedNaturalText(element: Element): boolean {
  const stack: Node[] = [...element.childNodes].reverse();
  let inspected = 0;
  while (stack.length > 0 && inspected < 4096) {
    const node = stack.pop();
    if (!node) break;
    if (node instanceof Text) {
      const text = node.data.normalize('NFKC');
      inspected += text.length;
      if (/\p{L}/u.test(text)) return true;
      continue;
    }
    if (!(node instanceof Element)) continue;
    if (
      isIconBoundary(node) ||
      node.matches('code,pre,kbd,samp,var,math,[contenteditable],[role="textbox"]')
    )
      continue;
    if (node !== element && isAlignmentCapable(node)) continue;
    stack.push(...[...node.childNodes].reverse());
  }
  return false;
}

function firstSafeInlineTextOwner(
  textBlock: Element,
  protectedSelectors: readonly string[]
): Element | null {
  const walker = textBlock.ownerDocument.createTreeWalker(
    textBlock,
    globalThis.NodeFilter?.SHOW_TEXT ?? 4
  );
  let node = walker.nextNode();
  while (node) {
    if (node instanceof Text && /\p{L}/u.test(node.data)) {
      const parent = node.parentElement;
      if (
        parent &&
        parent !== textBlock &&
        !parent.closest(INTERACTIVE_DESCENDANTS) &&
        isSafeDirectionTarget(parent, protectedSelectors)
      )
        return parent;
    }
    node = walker.nextNode();
  }
  return null;
}

function descendantDepth(root: Element, candidate: Element): number {
  let depth = 0;
  let current: Element | null = candidate;
  while (current && current !== root) {
    current = current.parentElement;
    depth += 1;
  }
  return current === root ? depth : 0;
}

function safeComputedStyle(element: Element): CSSStyleDeclaration | null {
  try {
    return getComputedStyle(element);
  } catch {
    return null;
  }
}
