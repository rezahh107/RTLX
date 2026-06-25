import { isHardExcluded, isHiddenOrInert } from './exclusion-registry';
import { matchesAny } from './profile-zone';
import { isIconBoundary, isLayoutSensitiveContainer } from './direction-target-resolver';

const PRIMARY_TEXT_BLOCK_TAGS = new Set([
  'P',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'DD',
  'DT',
  'FIGCAPTION',
  'TD',
  'TH',
]);
const GENERIC_TEXT_BLOCK_TAGS = new Set(['DIV', 'ADDRESS']);
const PRIMARY_TEXT_BLOCK_SELECTOR = 'p,li,h1,h2,h3,h4,h5,h6,blockquote,dd,dt,figcaption,td,th';
const STRUCTURAL_DESCENDANTS = `${PRIMARY_TEXT_BLOCK_SELECTOR},div,address`;
const INLINE_NATURAL_TEXT_LIMIT = 4096;
export const DEFAULT_TEXT_BLOCK_ENUMERATION_LIMIT = 512;

export type TextBlockKind =
  | 'paragraph'
  | 'list-item'
  | 'heading'
  | 'quote'
  | 'definition'
  | 'caption'
  | 'table-cell'
  | 'generic-block'
  | 'fallback-region';

export interface TextBlockResolution {
  element: Element;
  kind: TextBlockKind;
  depth: number;
  strategy: 'structural-block' | 'generic-direct-text' | 'fallback-region';
}

export interface TextBlockEnumerationBatch {
  blocks: readonly TextBlockResolution[];
  inspectedElements: number;
  hasMore: boolean;
  totalInspectedElements: number;
  totalBlocks: number;
}

export interface TextBlockEnumerationSnapshot {
  completed: boolean;
  batches: number;
  totalInspectedElements: number;
  totalBlocks: number;
}

/**
 * Resumable, deterministic DOM-order enumeration for one semantic region.
 * Each batch inspects at most the requested number of descendant elements.
 */
export class TextBlockEnumerationCursor {
  private readonly walker: TreeWalker;
  private regionEvaluated = false;
  private completed = false;
  private fallbackEmitted = false;
  private batches = 0;
  private totalInspectedElements = 0;
  private totalBlocks = 0;
  private pendingNode: Node | null = null;

  public constructor(
    private readonly semanticRegion: Element,
    private readonly protectedSelectors: readonly string[] = []
  ) {
    this.walker = semanticRegion.ownerDocument.createTreeWalker(
      semanticRegion,
      globalThis.NodeFilter?.SHOW_ELEMENT ?? 1
    );
  }

  public nextBatch(
    limit: number = DEFAULT_TEXT_BLOCK_ENUMERATION_LIMIT
  ): TextBlockEnumerationBatch {
    const boundedLimit = Math.max(1, Math.trunc(limit));
    const blocks: TextBlockResolution[] = [];
    let inspectedElements = 0;

    if (!this.regionEvaluated) {
      this.regionEvaluated = true;
      const regionResolution = resolveTextBlock(
        this.semanticRegion,
        this.semanticRegion,
        this.protectedSelectors
      );
      if (regionResolution) {
        blocks.push(regionResolution);
        this.totalBlocks += 1;
      }
    }

    while (!this.completed && inspectedElements < boundedLimit) {
      const node = this.pendingNode ?? this.walker.nextNode();
      this.pendingNode = null;
      if (!node) {
        this.completed = true;
        break;
      }
      inspectedElements += 1;
      if (!(node instanceof Element)) continue;
      const resolution = resolveTextBlock(this.semanticRegion, node, this.protectedSelectors);
      if (!resolution) continue;
      blocks.push(resolution);
      this.totalBlocks += 1;
    }

    if (!this.completed && inspectedElements >= boundedLimit) {
      const nextNode = this.walker.nextNode();
      if (nextNode) this.pendingNode = nextNode;
      else this.completed = true;
    }

    if (
      this.completed &&
      this.totalBlocks === 0 &&
      !this.fallbackEmitted &&
      isUsableFallback(this.semanticRegion, this.protectedSelectors)
    ) {
      this.fallbackEmitted = true;
      blocks.push(
        Object.freeze({
          element: this.semanticRegion,
          kind: 'fallback-region' as const,
          depth: 0,
          strategy: 'fallback-region' as const,
        })
      );
      this.totalBlocks += 1;
    }

    this.batches += 1;
    this.totalInspectedElements += inspectedElements;
    return Object.freeze({
      blocks: Object.freeze(blocks),
      inspectedElements,
      hasMore: !this.completed,
      totalInspectedElements: this.totalInspectedElements,
      totalBlocks: this.totalBlocks,
    });
  }

  public snapshot(): TextBlockEnumerationSnapshot {
    return Object.freeze({
      completed: this.completed,
      batches: this.batches,
      totalInspectedElements: this.totalInspectedElements,
      totalBlocks: this.totalBlocks,
    });
  }
}

export function createTextBlockEnumerationCursor(
  semanticRegion: Element,
  protectedSelectors: readonly string[] = []
): TextBlockEnumerationCursor {
  return new TextBlockEnumerationCursor(semanticRegion, protectedSelectors);
}

/**
 * Compatibility helper for inspection and tests that require the complete result synchronously.
 * Runtime processing uses createTextBlockEnumerationCursor() to preserve per-slice bounds.
 */
export function enumerateTextBlocks(
  semanticRegion: Element,
  protectedSelectors: readonly string[] = []
): readonly TextBlockResolution[] {
  const cursor = createTextBlockEnumerationCursor(semanticRegion, protectedSelectors);
  const blocks: TextBlockResolution[] = [];
  let batch = cursor.nextBatch();
  blocks.push(...batch.blocks);
  while (batch.hasMore) {
    batch = cursor.nextBatch();
    blocks.push(...batch.blocks);
  }
  return Object.freeze(blocks);
}

export function hasOwnNaturalText(element: Element): boolean {
  let inspected = 0;
  const stack: Node[] = [...element.childNodes].reverse();
  while (stack.length > 0 && inspected < INLINE_NATURAL_TEXT_LIMIT) {
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
    if (node !== element && node.matches(STRUCTURAL_DESCENDANTS)) continue;
    stack.push(...[...node.childNodes].reverse());
  }
  return false;
}

export function hasDirectNaturalText(element: Element): boolean {
  let inspected = 0;
  for (const node of element.childNodes) {
    if (!(node instanceof Text)) continue;
    const text = node.data.normalize('NFKC');
    inspected += text.length;
    if (/\p{L}/u.test(text)) return true;
    if (inspected >= 512) break;
  }
  return false;
}

function resolveTextBlock(
  semanticRegion: Element,
  element: Element,
  protectedSelectors: readonly string[]
): TextBlockResolution | null {
  if (!isEligibleTextBlock(element, protectedSelectors)) return null;
  if (!semanticRegion.contains(element) && element !== semanticRegion) return null;
  const primary = PRIMARY_TEXT_BLOCK_TAGS.has(element.tagName);
  const generic = GENERIC_TEXT_BLOCK_TAGS.has(element.tagName);
  if (!primary && !generic) return null;

  const nestedPrimary = element.querySelector(PRIMARY_TEXT_BLOCK_SELECTOR) !== null;
  if (generic && nestedPrimary && !hasOwnNaturalText(element)) return null;
  if (primary && nestedPrimary && !hasDirectNaturalText(element)) return null;

  return Object.freeze({
    element,
    kind: blockKind(element),
    depth: depthFrom(semanticRegion, element),
    strategy: primary ? 'structural-block' : 'generic-direct-text',
  });
}

function isEligibleTextBlock(element: Element, protectedSelectors: readonly string[]): boolean {
  if (
    !PRIMARY_TEXT_BLOCK_TAGS.has(element.tagName) &&
    !GENERIC_TEXT_BLOCK_TAGS.has(element.tagName)
  )
    return false;
  if (isHardExcluded(element) || isHiddenOrInert(element) || isIconBoundary(element)) return false;
  if (matchesAny(element, protectedSelectors)) return false;
  if (isLayoutSensitiveContainer(element) && !hasOwnNaturalText(element)) return false;
  if (PRIMARY_TEXT_BLOCK_TAGS.has(element.tagName)) return hasMeaningfulText(element);
  if (!hasOwnNaturalText(element)) return false;
  const nested = element.querySelector(STRUCTURAL_DESCENDANTS);
  return nested === null || hasDirectNaturalText(element);
}

function isUsableFallback(element: Element, protectedSelectors: readonly string[]): boolean {
  return (
    !isHardExcluded(element) &&
    !isHiddenOrInert(element) &&
    !matchesAny(element, protectedSelectors) &&
    !isIconBoundary(element) &&
    hasMeaningfulText(element)
  );
}

function hasMeaningfulText(element: Element): boolean {
  const text = (element.textContent ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
  return text.length > 0 && text.length <= 20000 && /\p{L}/u.test(text);
}

function blockKind(element: Element): TextBlockKind {
  if (element.tagName === 'P') return 'paragraph';
  if (element.tagName === 'LI') return 'list-item';
  if (/^H[1-6]$/u.test(element.tagName)) return 'heading';
  if (element.tagName === 'BLOCKQUOTE') return 'quote';
  if (element.tagName === 'DD' || element.tagName === 'DT') return 'definition';
  if (element.tagName === 'FIGCAPTION') return 'caption';
  if (element.tagName === 'TD' || element.tagName === 'TH') return 'table-cell';
  return 'generic-block';
}

function depthFrom(region: Element, element: Element): number {
  let depth = 0;
  let current: Element | null = element;
  while (current && current !== region) {
    current = current.parentElement;
    depth += 1;
  }
  return current === region ? depth : 0;
}
