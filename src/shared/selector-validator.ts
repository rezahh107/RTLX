import { parse } from 'css-tree';
import { LIMITS } from './constants';
import { err, ok, type Result } from './result';

export class SelectorValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'SelectorValidationError';
  }
}

const FORBIDDEN = [/:has\s*\(/iu, /::/u, /^\s*\*\s*$/u, /(?:^|[\s>+~,(])(?:html|body)\b/iu];

export function validateSelectors(
  selectors: readonly string[]
): Result<readonly string[], SelectorValidationError> {
  if (selectors.length > LIMITS.selectorMaxCount)
    return err(new SelectorValidationError('Too many selectors'));
  const normalized: string[] = [];
  for (const selector of selectors) {
    if (selector.length === 0 || selector.length > LIMITS.selectorMaxLength)
      return err(new SelectorValidationError('Selector length out of bounds'));
    if (FORBIDDEN.some((pattern) => pattern.test(selector)))
      return err(new SelectorValidationError(`Forbidden selector: ${selector}`));
    try {
      parse(selector, { context: 'selectorList' });
    } catch {
      return err(new SelectorValidationError(`Invalid selector: ${selector}`));
    }
    normalized.push(selector.trim());
  }
  return ok(Object.freeze([...new Set(normalized)].sort()));
}
