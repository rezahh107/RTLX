import type { BidiToken } from '../shared/types';

export function resolveOverlaps(
  tokens: readonly BidiToken[],
  textLength: number
): readonly BidiToken[] {
  const valid = tokens.filter(
    (token) =>
      Number.isInteger(token.start) &&
      Number.isInteger(token.end) &&
      token.start >= 0 &&
      token.end > token.start &&
      token.end <= textLength
  );
  const sorted = [...valid].sort(
    (a, b) =>
      a.priority - b.priority ||
      b.end - b.start - (a.end - a.start) ||
      a.start - b.start ||
      compareAscii(a.type, b.type)
  );
  const accepted: BidiToken[] = [];
  for (const token of sorted) {
    if (!accepted.some((other) => overlaps(token, other))) accepted.push(token);
  }
  accepted.sort((a, b) => a.start - b.start || a.end - b.end || compareAscii(a.type, b.type));
  return Object.freeze(accepted.map((token) => Object.freeze({ ...token })));
}

export function reconstructText(text: string, tokens: readonly BidiToken[]): string {
  let cursor = 0;
  let result = '';
  for (const token of tokens) {
    result += text.slice(cursor, token.start) + text.slice(token.start, token.end);
    cursor = token.end;
  }
  return result + text.slice(cursor);
}
function overlaps(a: BidiToken, b: BidiToken): boolean {
  return a.start < b.end && b.start < a.end;
}
function compareAscii(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
