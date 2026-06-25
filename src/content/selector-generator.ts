import { LIMITS } from '../shared/constants';
import { validateSelectors } from '../shared/selector-validator';
export interface GeneratedSelector {
  selector: string;
  strategy: 'id' | 'attribute' | 'class' | 'semantic-parent' | 'repeated-item' | 'structural';
  uniqueness: number;
  target: 'exact' | 'ancestor';
}
const STABLE_ATTRIBUTES = Object.freeze([
  'data-testid',
  'data-test-id',
  'data-test',
  'data-qa',
  'data-message-author-role',
  'data-block-id',
  'role',
]);
const SEMANTIC_TAGS = new Set(['article', 'main', 'section', 'aside', 'nav', 'form']);
const RANDOM_TOKEN = /(?:^|[-_])(?:[a-f0-9]{8,}|\d{5,})(?:$|[-_])/iu;
const HASHLIKE_TOKEN = /^[A-Za-z_-]*[A-Za-z][A-Za-z0-9_-]*\d[A-Za-z0-9_-]{5,}$/u;
export function generateStableSelector(
  element: Element,
  root: Document | ShadowRoot = document
): GeneratedSelector {
  return (
    generateStableSelectorCandidates(element, root)[0] ??
    (() => {
      throw new Error('Unable to generate a bounded selector');
    })()
  );
}
export function generateStableSelectorCandidates(
  element: Element,
  root: Document | ShadowRoot = document
): readonly GeneratedSelector[] {
  if (element.tagName === 'HTML' || element.tagName === 'BODY')
    throw new Error('Document roots cannot be selected');
  const candidates: GeneratedSelector[] = [];
  const seen = new Set<string>();
  addForElement(element, 'exact');
  let ancestor = element.parentElement;
  let depth = 0;
  while (ancestor && ancestor.tagName !== 'HTML' && ancestor.tagName !== 'BODY' && depth < 3) {
    const semantic =
      SEMANTIC_TAGS.has(ancestor.tagName.toLowerCase()) ||
      ancestor.hasAttribute('role') ||
      ancestor.hasAttribute('data-testid');
    if (semantic) addForElement(ancestor, 'ancestor', 'semantic-parent');
    const parent = ancestor.parentElement;
    if (
      parent &&
      [...parent.children].filter((child) => child.tagName === ancestor?.tagName).length > 1
    )
      addForElement(ancestor, 'ancestor', 'repeated-item');
    ancestor = ancestor.parentElement;
    depth += 1;
  }
  const exactStructural = boundedStructural(element, root);
  if (exactStructural) add(exactStructural, 'structural', 'exact');
  return Object.freeze(
    candidates
      .sort(
        (a, b) =>
          score(a) - score(b) ||
          a.selector.length - b.selector.length ||
          a.selector.localeCompare(b.selector, 'en')
      )
      .slice(0, 8)
  );
  function addForElement(
    target: Element,
    targetKind: 'exact' | 'ancestor',
    forced?: GeneratedSelector['strategy']
  ): void {
    const tag = target.tagName.toLowerCase();
    const id = target.getAttribute('id');
    if (id && isStableToken(id)) add(`#${escapeIdentifier(id)}`, forced ?? 'id', targetKind);
    for (const attribute of STABLE_ATTRIBUTES) {
      const value = target.getAttribute(attribute);
      if (!value || value.length > 100 || !isStableAttributeValue(value)) continue;
      add(`${tag}[${attribute}="${escapeAttribute(value)}"]`, forced ?? 'attribute', targetKind);
      add(`[${attribute}="${escapeAttribute(value)}"]`, forced ?? 'attribute', targetKind);
    }
    const classes = [...target.classList].filter(isStableToken).sort().slice(0, 3);
    for (let count = 1; count <= classes.length; count += 1)
      add(
        `${tag}${classes
          .slice(0, count)
          .map((value) => `.${escapeIdentifier(value)}`)
          .join('')}`,
        forced ?? 'class',
        targetKind
      );
  }
  function add(
    selector: string,
    strategy: GeneratedSelector['strategy'],
    target: 'exact' | 'ancestor'
  ): void {
    if (seen.has(selector) || selector.length > LIMITS.selectorMaxLength) return;
    const validated = validateSelectors([selector]);
    if (!validated.ok) return;
    try {
      const matches = root.querySelectorAll(selector);
      if (matches.length < 1 || matches.length > 50) return;
      const expected =
        target === 'exact'
          ? element
          : [element, ...ancestors(element)].find((candidate) => candidate.matches(selector));
      if (!expected || ![...matches].includes(expected)) return;
      seen.add(selector);
      candidates.push(Object.freeze({ selector, strategy, uniqueness: matches.length, target }));
    } catch {
      return;
    }
  }
}
function boundedStructural(element: Element, root: Document | ShadowRoot): string | null {
  const segments: string[] = [];
  let current: Element | null = element;
  while (
    current &&
    current.tagName !== 'HTML' &&
    current.tagName !== 'BODY' &&
    segments.length < 5
  ) {
    segments.unshift(structuralSegment(current));
    const selector = segments.join(' > ');
    try {
      const matches = root.querySelectorAll(selector);
      if (matches.length === 1 && matches[0] === element && validateSelectors([selector]).ok)
        return selector;
    } catch {
      return null;
    }
    current = current.parentElement;
  }
  return null;
}
function structuralSegment(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const parent = element.parentElement;
  if (!parent) return tag;
  const siblings = [...parent.children].filter(
    (candidate) => candidate.tagName === element.tagName
  );
  return siblings.length <= 1 ? tag : `${tag}:nth-of-type(${siblings.indexOf(element) + 1})`;
}
function ancestors(element: Element): Element[] {
  const values: Element[] = [];
  let current = element.parentElement;
  while (current && current.tagName !== 'HTML') {
    values.push(current);
    current = current.parentElement;
  }
  return values;
}
function score(value: GeneratedSelector): number {
  return (
    {
      id: 0,
      attribute: 10,
      'semantic-parent': 20,
      'repeated-item': 30,
      class: 40,
      structural: 100,
    }[value.strategy] +
    (value.strategy === 'attribute' && value.selector.startsWith('[') ? 1 : 0) +
    (value.target === 'ancestor' ? 5 : 0) +
    value.uniqueness
  );
}
function isStableToken(value: string): boolean {
  return (
    value.length >= 1 &&
    value.length <= 80 &&
    !RANDOM_TOKEN.test(value) &&
    !HASHLIKE_TOKEN.test(value) &&
    !/^css-[A-Za-z0-9]+$/u.test(value)
  );
}
function isStableAttributeValue(value: string): boolean {
  return isStableToken(value) && !/[\n\r\t]/u.test(value);
}
function escapeIdentifier(value: string): string {
  const css = globalThis.CSS;
  if (css && typeof css.escape === 'function') return css.escape(value);
  return value.replace(
    /(^-?\d)|[^A-Za-z0-9_-]/gu,
    (match) => `\\${match.codePointAt(0)?.toString(16)} `
  );
}
function escapeAttribute(value: string): string {
  return value.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"');
}
