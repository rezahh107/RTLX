import { LIMITS } from '../shared/constants';
import { isHardExcluded, isHiddenOrInert } from './exclusion-registry';

const GENERIC = ['main', 'article', '[role="main"]'] as const;
const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'SECTION',
  'ARTICLE',
  'MAIN',
  'LI',
  'TD',
  'TH',
  'BLOCKQUOTE',
  'DD',
  'DT',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);
const CONTENT_TAGS = new Set([
  'P',
  'ARTICLE',
  'MAIN',
  'SECTION',
  'BLOCKQUOTE',
  'LI',
  'TD',
  'TH',
  'DD',
  'DT',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);
const LOW_PRIORITY_ROLES = new Set([
  'button',
  'menu',
  'menubar',
  'menuitem',
  'navigation',
  'tab',
  'tablist',
  'toolbar',
]);
const LOW_PRIORITY_TAGS = new Set(['BUTTON', 'NAV', 'ASIDE', 'HEADER', 'FOOTER']);

export type DiscoveryStopReason = 'candidate_budget' | 'visit_budget' | null;

export interface DiscoveryResult {
  candidates: readonly Element[];
  limitReached: boolean;
  visitedNodes: number;
}

export interface DiscoveryBatch extends DiscoveryResult {
  hasMore: boolean;
  stopReason: DiscoveryStopReason;
  totalVisitedNodes: number;
  totalCandidates: number;
}

export interface DiscoveryCursorSnapshot {
  batches: number;
  completed: boolean;
  totalVisitedNodes: number;
  totalCandidates: number;
}

export class CandidateDiscoveryCursor {
  private readonly selectors: readonly string[];
  private readonly seen = new Set<Element>();
  private readonly seededCandidates: Element[] = [];
  private phase: 'selectors' | 'text' | 'done' = 'selectors';
  private selectorIndex = 0;
  private selectorMatches: readonly Element[] = Object.freeze([]);
  private selectorMatchIndex = 0;
  private textWalker: TreeWalker | null = null;
  private batches = 0;
  private totalVisitedNodes = 0;
  private totalCandidates = 0;

  public constructor(
    private readonly root: Document | ShadowRoot | Element,
    profileSelectors: readonly string[] = [],
    userSelected?: Element
  ) {
    this.selectors = Object.freeze([...new Set([...profileSelectors, ...GENERIC])]);
    if (userSelected && eligible(userSelected)) {
      this.seen.add(userSelected);
      this.seededCandidates.push(userSelected);
      this.totalCandidates = 1;
    }
  }

  public nextBatch(
    candidateBudget: number = LIMITS.maxInitialRoots,
    visitBudget: number = LIMITS.maxDiscoveryNodes
  ): DiscoveryBatch {
    const candidates: Element[] = [];
    let visitedNodes = 0;
    let stopReason: DiscoveryStopReason = null;
    const boundedCandidateBudget = Math.max(1, Math.trunc(candidateBudget));
    const boundedVisitBudget = Math.max(1, Math.trunc(visitBudget));

    while (this.seededCandidates.length > 0 && candidates.length < boundedCandidateBudget) {
      const seeded = this.seededCandidates.shift();
      if (seeded) candidates.push(seeded);
    }

    while (this.phase !== 'done') {
      if (candidates.length >= boundedCandidateBudget) {
        stopReason = 'candidate_budget';
        break;
      }
      if (visitedNodes >= boundedVisitBudget) {
        stopReason = 'visit_budget';
        break;
      }
      if (this.phase === 'selectors') {
        if (this.selectorIndex >= this.selectors.length) {
          this.phase = 'text';
          continue;
        }
        if (this.selectorMatches.length === 0 && this.selectorMatchIndex === 0)
          this.selectorMatches = selectorMatches(this.root, this.selectors[this.selectorIndex]!);
        const element = this.selectorMatches[this.selectorMatchIndex];
        if (!element) {
          this.selectorIndex += 1;
          this.selectorMatches = Object.freeze([]);
          this.selectorMatchIndex = 0;
          continue;
        }
        this.selectorMatchIndex += 1;
        visitedNodes += 1;
        if (eligible(element) && !this.seen.has(element)) {
          this.seen.add(element);
          candidates.push(element);
          this.totalCandidates += 1;
        }
        continue;
      }

      this.textWalker ??= ownerDocument(this.root).createTreeWalker(
        this.root,
        globalThis.NodeFilter?.SHOW_TEXT ?? 4
      );
      const node = this.textWalker.nextNode();
      if (!node) {
        this.phase = 'done';
        continue;
      }
      visitedNodes += 1;
      const text = node.nodeValue ?? '';
      if (!/\p{Script=Arabic}/u.test(text)) continue;
      const parent = node.parentElement;
      const candidate = parent ? nearestEligibleBlock(parent) : null;
      if (candidate && !this.seen.has(candidate)) {
        this.seen.add(candidate);
        candidates.push(candidate);
        this.totalCandidates += 1;
      }
    }

    this.batches += 1;
    this.totalVisitedNodes += visitedNodes;
    const ranked = rankCandidates(candidates, this.selectors);
    return Object.freeze({
      candidates: Object.freeze(ranked),
      limitReached: stopReason !== null,
      visitedNodes,
      hasMore: this.phase !== 'done',
      stopReason,
      totalVisitedNodes: this.totalVisitedNodes,
      totalCandidates: this.totalCandidates,
    });
  }

  public snapshot(): DiscoveryCursorSnapshot {
    return Object.freeze({
      batches: this.batches,
      completed: this.phase === 'done',
      totalVisitedNodes: this.totalVisitedNodes,
      totalCandidates: this.totalCandidates,
    });
  }
}

export function createCandidateDiscoveryCursor(
  root: Document | ShadowRoot | Element,
  profileSelectors: readonly string[] = [],
  userSelected?: Element
): CandidateDiscoveryCursor {
  return new CandidateDiscoveryCursor(root, profileSelectors, userSelected);
}

export function discoverCandidates(
  root: Document | ShadowRoot | Element,
  profileSelectors: readonly string[] = [],
  userSelected?: Element
): DiscoveryResult {
  const batch = createCandidateDiscoveryCursor(root, profileSelectors, userSelected).nextBatch();
  return Object.freeze({
    candidates: batch.candidates,
    limitReached: batch.hasMore,
    visitedNodes: batch.visitedNodes,
  });
}

export function rankCandidates(
  candidates: readonly Element[],
  profileSelectors: readonly string[] = []
): Element[] {
  return candidates
    .map((element, index) => ({
      element,
      index,
      score: candidatePriority(element, profileSelectors),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.element);
}

function candidatePriority(element: Element, profileSelectors: readonly string[]): number {
  let score = 0;
  if (profileSelectors.some((selector) => safeMatches(element, selector))) score += 1000;
  const role = element.getAttribute('role')?.toLowerCase() ?? null;
  if (role === 'main' || role === 'article') score += 300;
  if (CONTENT_TAGS.has(element.tagName)) score += 200;
  if (hasDirectArabicText(element)) score += 100;
  if (LOW_PRIORITY_ROLES.has(role ?? '')) score -= 400;
  if (LOW_PRIORITY_TAGS.has(element.tagName)) score -= 300;
  return score;
}

function hasDirectArabicText(element: Element): boolean {
  let inspected = 0;
  for (const node of element.childNodes) {
    if (!(node instanceof Text)) continue;
    const text = node.data.slice(0, 512);
    inspected += text.length;
    if (/\p{Script=Arabic}/u.test(text)) return true;
    if (inspected >= 512) break;
  }
  return false;
}

function selectorMatches(
  root: Document | ShadowRoot | Element,
  selector: string
): readonly Element[] {
  const matches: Element[] = [];
  if (root instanceof Element && safeMatches(root, selector)) matches.push(root);
  try {
    matches.push(...root.querySelectorAll(selector));
  } catch {
    return Object.freeze(matches);
  }
  return Object.freeze(matches);
}

function safeMatches(element: Element, selector: string): boolean {
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
}

function ownerDocument(root: Document | ShadowRoot | Element): Document {
  return root instanceof Document ? root : root.ownerDocument;
}

function nearestEligibleBlock(element: Element): Element | null {
  let current: Element | null = element;
  while (current && current.tagName !== 'BODY' && current.tagName !== 'HTML') {
    if (BLOCK_TAGS.has(current.tagName) && eligible(current)) return current;
    current = current.parentElement;
  }
  return null;
}

function eligible(element: Element): boolean {
  return (
    element.tagName !== 'HTML' &&
    element.tagName !== 'BODY' &&
    !isHardExcluded(element) &&
    !isHiddenOrInert(element)
  );
}
