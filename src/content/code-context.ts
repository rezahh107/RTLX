import { firstStrongDirection } from './language-classifier';

export type CodeContext =
  | 'none'
  | 'block-code'
  | 'block-natural-rtl'
  | 'block-natural-ltr'
  | 'inline-technical'
  | 'inline-natural-rtl'
  | 'inline-natural-ltr';

export interface NaturalLanguagePreEvidence {
  kind: 'block-code' | 'block-natural-rtl' | 'block-natural-ltr';
  arabicCount: number;
  latinCount: number;
  punctuationDensity: number;
  lineCount: number;
  positiveSignals: readonly string[];
  vetoSignals: readonly string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface CodeContextOptions {
  allowNaturalLanguagePre?: boolean;
}

const CODE_TAGS = new Set(['CODE', 'KBD', 'SAMP', 'VAR', 'PRE']);
const TECHNICAL_PUNCTUATION = /[{}()[\];:=<>/\\|&$#]/gu;
const HIGHLIGHT_CLASS =
  /(?:^|\s)(?:(?:language-\S*)|highlight|hljs|prettyprint|codehilite)(?:\s|$)/u;
const PROGRAMMING_KEYWORD =
  /\b(?:import|export|from|def|class|function|const|let|var|return|if|else|for|while|try|catch|throw|interface|type)\b/u;
const COMMAND_TOKEN = /\b(?:npm|pnpm|yarn|git|docker|python|node|npx|pip|curl)\b/u;
const TECHNICAL_TOKEN =
  /(?:https?:\/\/|(?:^|\s)\/(?:src|app|lib|tests?)\/|C:\\|\.(?:ts|js|json|py|css|html)\b|@[a-z0-9_.-]+\/[a-z0-9_.-]+|\b[a-z0-9_.-]+@[a-z0-9_.-]+\b)/iu;
const STACK_TRACE =
  /(?:^|\n)\s*(?:at\s+[A-Za-z_$][\w$]*(?:\.|\s|\()|File\s+"[^"]+",\s+line\s+\d+|Traceback\b|Error:)/u;
const SQL = /\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/u;
const MARKUP = /<\/?[A-Za-z][^>]*>|\b(?:class|id|href)=/u;
const CLI_PREFIX = /^\s*(?:[$>#]|PS>|C:\\>|~\/)/mu;
const SHEBANG = /^\s*#!\//u;
const PROSE_BULLET = /^\s*(?:[-*•]|\d+[.)])\s+\S+/u;

export function classifyCodeContext(
  element: Element,
  profileSelectors: readonly string[] = [],
  options: CodeContextOptions = {}
): CodeContext {
  const codeRoot = nearestCodeRoot(element, profileSelectors);
  if (!codeRoot) return 'none';
  if (isBlockCode(codeRoot)) {
    if (options.allowNaturalLanguagePre) return classifyNaturalLanguagePre(codeRoot).kind;
    return 'block-code';
  }

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

export function classifyNaturalLanguagePre(element: Element): NaturalLanguagePreEvidence {
  const text = (element.textContent ?? '').normalize('NFKC').slice(0, 8192);
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const lineCount = Math.max(1, lines.length);
  const arabicCount = count(text, /\p{Script=Arabic}/u);
  const latinCount = count(text, /\p{Script=Latin}/u);
  const punctuation = (text.match(TECHNICAL_PUNCTUATION) ?? []).length;
  const nonWhitespace = (text.match(/\S/gu) ?? []).length;
  const punctuationDensity = nonWhitespace === 0 ? 0 : punctuation / nonWhitespace;
  const positiveSignals: string[] = [];
  const vetoSignals: string[] = [];
  const classText = [element.className, element.closest('pre')?.className]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  if (!(element.tagName === 'PRE' || element.closest('pre'))) vetoSignals.push('not-block-pre');
  if (HIGHLIGHT_CLASS.test(classText)) vetoSignals.push('syntax-highlight-class');
  if (CLI_PREFIX.test(text)) vetoSignals.push('cli-prompt');
  if (SHEBANG.test(text)) vetoSignals.push('shebang');
  if (PROGRAMMING_KEYWORD.test(text)) vetoSignals.push('programming-keyword');
  if (COMMAND_TOKEN.test(text)) vetoSignals.push('command-token');
  if (TECHNICAL_TOKEN.test(text)) vetoSignals.push('technical-token');
  if (STACK_TRACE.test(text)) vetoSignals.push('stack-trace');
  if (SQL.test(text)) vetoSignals.push('sql-keyword');
  if (MARKUP.test(text)) vetoSignals.push('markup');
  if (punctuationDensity >= 0.1) vetoSignals.push('technical-punctuation-density');
  if (/=>|===|!==|::/u.test(text)) vetoSignals.push('operator-token');
  if (/^\s*[{[]/.test(text) && /[}\]]\s*$/.test(text)) vetoSignals.push('balanced-object-array');
  if (lines.filter(isConfigLine).length >= Math.max(2, lineCount / 2))
    vetoSignals.push('config-shape');
  if (lines.filter((line) => /[,;{}()[\]]/u.test(line)).length >= Math.max(2, lineCount / 2))
    vetoSignals.push('code-punctuation-lines');

  if (arabicCount >= 20 && arabicCount >= latinCount) positiveSignals.push('arabic-dominant');
  if (punctuationDensity <= 0.06) positiveSignals.push('low-technical-punctuation');
  if (lines.some((line) => PROSE_BULLET.test(line))) positiveSignals.push('prose-list-shape');
  if (lines.some((line) => /[.؟!]$/u.test(line))) positiveSignals.push('sentence-ending');
  if (firstStrongDirection(text) === 'rtl') positiveSignals.push('first-strong-rtl');
  if (/Acceptance Criteria|موارد لازم|باید|نباید|تست|گزارش/u.test(text))
    positiveSignals.push('instructional-prose');

  const high =
    vetoSignals.length === 0 &&
    arabicCount >= 20 &&
    arabicCount >= latinCount &&
    positiveSignals.length >= 4 &&
    punctuationDensity <= 0.06;
  const medium = vetoSignals.length === 0 && arabicCount > 0 && positiveSignals.length >= 3;
  return Object.freeze({
    kind: high ? 'block-natural-rtl' : 'block-code',
    arabicCount,
    latinCount,
    punctuationDensity,
    lineCount,
    positiveSignals: Object.freeze(positiveSignals),
    vetoSignals: Object.freeze(vetoSignals),
    confidence: high ? 'high' : medium ? 'medium' : 'low',
  });
}

export function isBlockCodeContext(
  element: Element,
  profileSelectors: readonly string[] = [],
  options: CodeContextOptions = {}
): boolean {
  return classifyCodeContext(element, profileSelectors, options) === 'block-code';
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
  if (typeof className === 'string' && HIGHLIGHT_CLASS.test(className)) return true;
  try {
    const display = getComputedStyle(element).display;
    return display === 'block' || display === 'flex' || display === 'grid' || display === 'table';
  } catch {
    return false;
  }
}

function isConfigLine(line: string): boolean {
  const trimmed = line.replace(/^[-\s]+/u, '');
  const separator = trimmed.indexOf(':');
  if (separator <= 0 || separator === trimmed.length - 1) return false;
  const key = trimmed.slice(0, separator);
  return /^[A-Za-z0-9_.-]+$/u.test(key) && /\S/u.test(trimmed.slice(separator + 1));
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
