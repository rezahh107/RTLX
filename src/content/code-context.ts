import { firstStrongDirection } from './language-classifier';

export type CodeContext =
  | 'none'
  | 'block-code'
  | 'inline-technical'
  | 'inline-natural-rtl'
  | 'inline-natural-ltr';

const CODE_TAGS = new Set(['CODE', 'KBD', 'SAMP', 'VAR', 'PRE']);
const TECHNICAL_PUNCTUATION = /[{}()[\];:=<>/\\|&$#]/gu;

export function classifyCodeContext(
  element: Element,
  profileSelectors: readonly string[] = []
): CodeContext {
  const codeRoot = nearestCodeRoot(element, profileSelectors);
  if (!codeRoot) return 'none';
  if (isBlockCode(codeRoot)) return 'block-code';

  const text = (codeRoot.textContent ?? '').normalize('NFKC').slice(0, 4096);
  const arabic = count(text, /\p{Script=Arabic}/u);
  const latin = count(text, /\p{Script=Latin}/u);
  const punctuation = (text.match(TECHNICAL_PUNCTUATION) ?? []).length;
  const nonWhitespace = (text.match(/\S/gu) ?? []).length;
  const punctuationDense = nonWhitespace >= 8 && punctuation / nonWhitespace >= 0.12;
  const technicalToken =
    /(?:https?:\/\/|\b(?:npm|pnpm|yarn|git|docker|python|node)\b|[A-Za-z_$][\w$]*[._:/-][A-Za-z0-9_$-]+)/u.test(
      text
    );

  if (arabic > 0 && arabic >= latin && !punctuationDense && !technicalToken)
    return firstStrongDirection(text) === 'rtl' ? 'inline-natural-rtl' : 'inline-natural-ltr';
  return 'inline-technical';
}

export function isBlockCodeContext(
  element: Element,
  profileSelectors: readonly string[] = []
): boolean {
  return classifyCodeContext(element, profileSelectors) === 'block-code';
}

function nearestCodeRoot(element: Element, profileSelectors: readonly string[]): Element | null {
  let current: Element | null = element;
  while (current && current.tagName !== 'BODY' && current.tagName !== 'HTML') {
    if (CODE_TAGS.has(current.tagName) || safeMatchesAny(current, profileSelectors)) return current;
    current = current.parentElement;
  }
  return null;
}

function isBlockCode(element: Element): boolean {
  if (element.tagName === 'PRE' || element.closest('pre')) return true;
  if (element.getAttribute('role') === 'code') return true;
  const className = element.className;
  if (
    typeof className === 'string' &&
    /(?:language-|highlight|hljs|prettyprint|codehilite)/u.test(className)
  )
    return true;
  try {
    const display = getComputedStyle(element).display;
    return display === 'block' || display === 'flex' || display === 'grid' || display === 'table';
  } catch {
    return false;
  }
}

function safeMatchesAny(element: Element, selectors: readonly string[]): boolean {
  for (const selector of selectors) {
    try {
      if (element.matches(selector)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

function count(text: string, pattern: RegExp): number {
  let total = 0;
  for (const char of text) if (pattern.test(char)) total += 1;
  return total;
}
