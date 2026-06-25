import { isHardExcluded, isHiddenOrInert } from './exclusion-registry';
import { matchesAny } from './profile-zone';

const BLOCK_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DD',
  'DIV',
  'DL',
  'DT',
  'FIGCAPTION',
  'FIGURE',
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

const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'LABEL', 'SUMMARY']);
const COMPLEX_DESCENDANTS =
  'svg,img,canvas,video,audio,input,textarea,select,[contenteditable="true"],[role="textbox"],[aria-live]';

export type SemanticBlockStrategy =
  | 'candidate-block'
  | 'simple-interactive'
  | 'nearest-block'
  | 'fallback-candidate';

export interface SemanticBlockResolution {
  element: Element;
  strategy: SemanticBlockStrategy;
  depth: number;
}

export function resolveSemanticBlock(
  candidate: Element,
  protectedSelectors: readonly string[] = []
): SemanticBlockResolution {
  const interactiveOwner = simpleInteractiveOwner(candidate);
  if (interactiveOwner)
    return Object.freeze({ element: interactiveOwner, strategy: 'simple-interactive', depth: 0 });

  if (isUsableBlock(candidate, protectedSelectors) && hasDirectNaturalText(candidate))
    return Object.freeze({ element: candidate, strategy: 'candidate-block', depth: 0 });

  let current = candidate.parentElement;
  let depth = 1;
  while (current && current.tagName !== 'BODY' && current.tagName !== 'HTML' && depth <= 5) {
    if (isUsableBlock(current, protectedSelectors) && hasMeaningfulText(current))
      return Object.freeze({ element: current, strategy: 'nearest-block', depth });
    current = current.parentElement;
    depth += 1;
  }

  return Object.freeze({ element: candidate, strategy: 'fallback-candidate', depth: 0 });
}

export function simpleInteractiveOwner(element: Element): Element | null {
  const owner = element.closest(
    'a,button,label,summary,[role=button],[role=link],[role=menuitem],[role=tab]'
  );
  return owner && isSimpleInteractiveText(owner) ? owner : null;
}

export function isSimpleInteractiveText(element: Element): boolean {
  const role = element.getAttribute('role')?.toLowerCase() ?? null;
  const interactive =
    INTERACTIVE_TAGS.has(element.tagName) ||
    role === 'button' ||
    role === 'link' ||
    role === 'menuitem' ||
    role === 'tab';
  if (!interactive) return false;
  if (element.matches('input,textarea,select,[contenteditable="true"],[role="textbox"]'))
    return false;
  if (element.querySelector(COMPLEX_DESCENDANTS)) return false;
  const text = normalizedText(element);
  return text.length > 0 && text.length <= 1000 && /\p{L}/u.test(text);
}

export function semanticAncestorKinds(element: Element, maxDepth = 5): readonly string[] {
  const kinds: string[] = [];
  let current: Element | null = element;
  let depth = 0;
  while (current && current.tagName !== 'HTML' && depth < maxDepth) {
    const role = current.getAttribute('role');
    kinds.push(
      role ? `${current.tagName.toLowerCase()}[role=${role}]` : current.tagName.toLowerCase()
    );
    current = current.parentElement;
    depth += 1;
  }
  return Object.freeze(kinds);
}

function isUsableBlock(element: Element, protectedSelectors: readonly string[]): boolean {
  return (
    BLOCK_TAGS.has(element.tagName) &&
    !isHardExcluded(element) &&
    !isHiddenOrInert(element) &&
    !matchesAny(element, protectedSelectors)
  );
}

function hasDirectNaturalText(element: Element): boolean {
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

function hasMeaningfulText(element: Element): boolean {
  const text = normalizedText(element);
  return text.length > 0 && text.length <= 20000 && /\p{L}/u.test(text);
}

function normalizedText(element: Element): string {
  return (element.textContent ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
}
