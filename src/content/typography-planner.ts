import {
  DIRECTION_OWNER_ATTRIBUTE,
  LIMITS,
  OWNED_CLASS,
  STYLE_ELEMENT_ID,
  TYPOGRAPHY_CLASS,
} from '../shared/constants';
import { runtimeUrl } from '../shared/api-adapter';
import { GENERATED_FONT_CSS } from '../shared/generated-font-css';
import type { Settings } from '../shared/types';
import { isCodeZone } from './exclusion-registry';
import { isIconProtected } from './accessibility-guard';
import { isIconBoundary, isLayoutSensitiveContainer } from './direction-target-resolver';
import type { AddClassOperation, InjectStyleOperation, MutationOperation } from './mutation-plan';

const PERSIAN_LOCAL_FONTS = [
  'Vazirmatn',
  'Vazirmatn UI',
  'Vazir',
  'Vazir UI',
  'Vazir FD',
  'IRANSans',
  'IranSans',
] as const;

const BASE_PROTECTED_SELECTORS = [
  'code',
  'pre',
  'kbd',
  'samp',
  'var',
  'math',
  '.katex',
  '.MathJax',
  '[contenteditable]',
  '[role="textbox"]',
  '[role="code"]',
  '.CodeMirror',
  '.monaco-editor',
  '.ace_editor',
  '.ProseMirror',
  '.ql-editor',
  '.xterm',
  '[data-editor]',
  'svg',
  'use',
  'img',
  '[aria-hidden="true"]',
  '[class^="fa"]',
  '[class*=" fa"]',
  '.material-icons',
  '[class*="icon"]',
  '[class*="glyph"]',
] as const;

export type TypographySkipReason =
  | 'no-natural-text'
  | 'detached'
  | 'outside-target'
  | 'code-zone'
  | 'icon-boundary'
  | 'layout-sensitive'
  | 'protected-selector';

export interface TypographyBatch {
  targets: readonly Element[];
  fingerprints: ReadonlyMap<Text, string>;
  inspectedNodes: number;
  eligibleNodes: number;
  hasMore: boolean;
  skipped: Readonly<Record<TypographySkipReason, number>>;
}

export interface TypographyProtectionBatch {
  targets: readonly Element[];
  inspectedTargets: number;
  hasMore: boolean;
}

export class TypographyProtectionCursor {
  private readonly candidates: readonly Element[];
  private index = 0;

  public constructor(root: Element, protectedSelectors: readonly string[]) {
    const selector = `.${TYPOGRAPHY_CLASS}`;
    const candidates: Element[] = [];
    const closest = root.closest(selector);
    if (closest) candidates.push(closest);
    if (root.classList.contains(TYPOGRAPHY_CLASS)) candidates.push(root);
    candidates.push(...root.querySelectorAll(selector));
    this.candidates = Object.freeze([...new Set(candidates)]);
    this.protectedSelectors = normalizedProtectedSelectors(protectedSelectors);
  }

  private readonly protectedSelectors: readonly string[];

  public nextBatch(limit: number = LIMITS.maxTextNodesPerSlice): TypographyProtectionBatch {
    const boundedLimit = Math.max(1, Math.trunc(limit));
    const targets: Element[] = [];
    let inspectedTargets = 0;
    while (this.index < this.candidates.length && inspectedTargets < boundedLimit) {
      const candidate = this.candidates[this.index];
      this.index += 1;
      if (!candidate) continue;
      inspectedTargets += 1;
      if (
        candidate.isConnected &&
        candidate.classList.contains(TYPOGRAPHY_CLASS) &&
        typographyProtectionReason(candidate, this.protectedSelectors) !== null
      )
        targets.push(candidate);
    }
    return Object.freeze({
      targets: Object.freeze(targets),
      inspectedTargets,
      hasMore: this.index < this.candidates.length,
    });
  }
}

export function createTypographyProtectionCursor(
  root: Element,
  protectedSelectors: readonly string[] = []
): TypographyProtectionCursor {
  return new TypographyProtectionCursor(root, protectedSelectors);
}

export function typographyOperations(
  target: Element,
  root: Document | ShadowRoot,
  sequence: number,
  settings: Settings,
  alignmentMode: 'start' | 'preserve',
  protectedSelectors: readonly string[] = [],
  explicitTargets?: readonly Element[]
): readonly MutationOperation[] {
  if (isCodeZone(target) || isIconBoundary(target) || GENERATED_FONT_CSS.length === 0)
    return Object.freeze([]);
  const base = runtimeUrl('fonts/');
  const protectedList = normalizedProtectedSelectors(protectedSelectors);
  const fontFaces = selectedFontFaces(settings, base);
  const listCss = settings.listRepair
    ? `.${OWNED_CLASS} :where(ul,ol){padding-inline-start:1.5em;padding-inline-end:0}.${OWNED_CLASS} :where(li)::marker{unicode-bidi:isolate}li[${DIRECTION_OWNER_ATTRIBUTE}][dir="rtl"]::marker{direction:rtl;unicode-bidi:isolate}li[${DIRECTION_OWNER_ATTRIBUTE}][dir="ltr"]::marker{direction:ltr;unicode-bidi:isolate}`
    : '';
  const alignment = alignmentMode === 'start' ? 'text-align:inherit' : '';
  const cssText = `${fontFaces}\n.${OWNED_CLASS}{${alignment}}\n.${TYPOGRAPHY_CLASS}{font-family:"RTLX Selected Text",system-ui,sans-serif!important}\n${listCss}`;
  const operations: MutationOperation[] = [];
  const style: InjectStyleOperation = {
    type: 'inject-style',
    sequence: sequence++,
    target: root,
    owner: 'RTLX-15.9.11',
    requirementId: 'TYPOGRAPHY-001',
    styleId: STYLE_ELEMENT_ID,
    cssText,
  };
  operations.push(style);
  if (!target.classList.contains(OWNED_CLASS)) {
    const classOperation: AddClassOperation = {
      type: 'add-class',
      sequence: sequence++,
      target,
      owner: 'RTLX-15.9.11',
      requirementId: 'TYPOGRAPHY-001',
      className: OWNED_CLASS,
      expectedAbsent: true,
    };
    operations.push(classOperation);
  }
  const targets = explicitTargets ?? collectTypographyTargets(target, protectedList);
  for (const typographyTarget of targets) {
    if (typographyTarget.classList.contains(TYPOGRAPHY_CLASS)) continue;
    operations.push({
      type: 'add-class',
      sequence: sequence++,
      target: typographyTarget,
      owner: 'RTLX-15.9.11',
      requirementId: 'TYPOGRAPHY-CASCADE-001',
      className: TYPOGRAPHY_CLASS,
      expectedAbsent: true,
    });
  }
  return Object.freeze(operations);
}

export function collectTypographyBatch(
  target: Element,
  protectedSelectors: readonly string[],
  processed: WeakMap<Text, string>,
  contextKey: string,
  limit = LIMITS.maxTextNodesPerSlice
): TypographyBatch {
  const found = new Set<Element>();
  const fingerprints = new Map<Text, string>();
  const skipped: Record<TypographySkipReason, number> = {
    'no-natural-text': 0,
    detached: 0,
    'outside-target': 0,
    'code-zone': 0,
    'icon-boundary': 0,
    'layout-sensitive': 0,
    'protected-selector': 0,
  };
  const owner = target.ownerDocument;
  const protectedList = normalizedProtectedSelectors(protectedSelectors);
  const walker = owner.createTreeWalker(target, globalThis.NodeFilter?.SHOW_TEXT ?? 4);
  let inspectedNodes = 0;
  let eligibleNodes = 0;
  let hasMore = false;
  let node = walker.nextNode();
  while (node) {
    if (!(node instanceof Text)) {
      node = walker.nextNode();
      continue;
    }
    const parent = node.parentElement;
    const state = typographyNodeState(node, parent, target, protectedList);
    const fingerprint = typographyFingerprint(node, parent, target, contextKey, state);
    if (processed.get(node) === fingerprint) {
      node = walker.nextNode();
      continue;
    }
    if (inspectedNodes >= Math.max(1, limit)) {
      hasMore = true;
      break;
    }
    inspectedNodes += 1;
    fingerprints.set(node, fingerprint);
    if (state !== null) {
      incrementSkipped(skipped, state);
      node = walker.nextNode();
      continue;
    }
    if (!parent) {
      skipped.detached += 1;
      node = walker.nextNode();
      continue;
    }
    eligibleNodes += 1;
    found.add(parent);
    node = walker.nextNode();
  }
  return Object.freeze({
    targets: Object.freeze([...found]),
    fingerprints,
    inspectedNodes,
    eligibleNodes,
    hasMore,
    skipped: Object.freeze({ ...skipped }),
  });
}

export function collectTypographyTargets(
  target: Element,
  protectedSelectors: readonly string[] = [],
  limit = LIMITS.maxTextNodesPerSlice
): readonly Element[] {
  const batch = collectTypographyBatch(
    target,
    normalizedProtectedSelectors(protectedSelectors),
    new WeakMap<Text, string>(),
    'legacy-one-shot',
    limit
  );
  return batch.targets;
}

export function selectedFontFaces(settings: Settings, base: string): string {
  const rawFaces = GENERATED_FONT_CSS.replaceAll('__EXTENSION_FONT_ROOT__', base)
    .split('\n')
    .filter(Boolean);
  return rawFaces
    .map((face) => {
      const isPersian = face.includes('vazirmatn-arabic');
      const isLatin = face.includes('inter-latin');
      let next = face.replaceAll('"RTLX Mixed Text"', '"RTLX Selected Text"');
      if (isPersian && settings.persianFont === 'local-first')
        next = next.replace('src:url(', `src:${localFontSources(PERSIAN_LOCAL_FONTS)},url(`);
      if (isLatin && settings.latinFont === 'amazon-ember-local')
        next = next.replace(
          'src:url(',
          'src:local("Amazon Ember Display"),local("Amazon Ember"),url('
        );
      if (isLatin && settings.latinFont === 'preserve') return '';
      return next;
    })
    .filter(Boolean)
    .join('\n');
}

export function typographyProtectionReason(
  element: Element,
  protectedSelectors: readonly string[]
): TypographySkipReason | null {
  if (isCodeZone(element)) return 'code-zone';
  if (isIconProtected(element) || isIconBoundary(element)) return 'icon-boundary';
  if (isLayoutSensitiveContainer(element)) return 'layout-sensitive';
  for (const selector of protectedSelectors) {
    try {
      if (element.matches(selector) || element.closest(selector)) return 'protected-selector';
    } catch {
      continue;
    }
  }
  return null;
}

function typographyNodeState(
  node: Text,
  parent: Element | null,
  target: Element,
  protectedSelectors: readonly string[]
): TypographySkipReason | null {
  const value = node.nodeValue ?? '';
  if (!/[\p{Script=Arabic}A-Za-z]/u.test(value.slice(0, LIMITS.maxSampleCodepointsPerCandidate)))
    return 'no-natural-text';
  if (!parent || !parent.isConnected) return 'detached';
  if (!target.contains(parent)) return 'outside-target';
  return typographyProtectionReason(parent, protectedSelectors);
}

function incrementSkipped(
  skipped: Record<TypographySkipReason, number>,
  reason: TypographySkipReason
): void {
  switch (reason) {
    case 'no-natural-text':
      skipped['no-natural-text'] += 1;
      return;
    case 'detached':
      skipped.detached += 1;
      return;
    case 'outside-target':
      skipped['outside-target'] += 1;
      return;
    case 'code-zone':
      skipped['code-zone'] += 1;
      return;
    case 'icon-boundary':
      skipped['icon-boundary'] += 1;
      return;
    case 'layout-sensitive':
      skipped['layout-sensitive'] += 1;
      return;
    case 'protected-selector':
      skipped['protected-selector'] += 1;
  }
}

function normalizedProtectedSelectors(protectedSelectors: readonly string[]): readonly string[] {
  return Object.freeze([...new Set([...BASE_PROTECTED_SELECTORS, ...protectedSelectors])].sort());
}

function typographyFingerprint(
  node: Text,
  parent: Element | null,
  target: Element,
  contextKey: string,
  state: TypographySkipReason | null
): string {
  return [
    node.data,
    parent?.tagName ?? 'none',
    parent?.getAttribute('role') ?? 'none',
    parent?.getAttribute('dir') ?? 'none',
    parent?.classList.contains(TYPOGRAPHY_CLASS) === true ? 'owned' : 'unowned',
    parent ? structuralPath(target, parent) : 'none',
    state ?? 'eligible',
    contextKey,
  ].join('\u0000');
}

function structuralPath(target: Element, element: Element): string {
  if (target === element) return 'self';
  const segments: string[] = [];
  let current: Element | null = element;
  let depth = 0;
  while (current && current !== target && depth < 64) {
    const parent: Element | null = current.parentElement;
    if (!parent) return `outside/${segments.reverse().join('/')}`;
    const index = [...parent.children].indexOf(current);
    segments.push(`${current.tagName}:${index}`);
    current = parent;
    depth += 1;
  }
  if (current !== target) segments.push('depth-limit');
  return segments.reverse().join('/');
}

function localFontSources(fonts: readonly string[]): string {
  return fonts.map((font) => `local("${font}")`).join(',');
}
