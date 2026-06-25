import { LIMITS } from '../shared/constants';
import { BIDI_TOKEN_REGISTRY } from '../shared/registry-data';
import type { BidiToken, TokenType } from '../shared/types';

const PRIORITY: Readonly<Record<TokenType, number>> = Object.freeze(
  Object.fromEntries(
    Object.entries(BIDI_TOKEN_REGISTRY).map(([type, entry]) => [type, entry.priority])
  ) as Record<TokenType, number>
);

type Detector = (text: string) => BidiToken[];
const detectors: readonly Detector[] = [
  detectUrls,
  detectEmails,
  detectPaths,
  detectPackages,
  detectApiSignatures,
  detectCli,
  detectIdentifiers,
  detectVersions,
  detectNetworkValues,
];

export function tokenizeBidi(text: string, includeNaturalPhrases = false): readonly BidiToken[] {
  if (text.length === 0 || text.length > LIMITS.maxTextNodeUtf16Length) return Object.freeze([]);
  const tokens = detectors.flatMap((detector) => detector(text));
  if (includeNaturalPhrases) tokens.push(...detectNaturalPhrases(text));
  return Object.freeze(
    tokens
      .filter((token) => validBounds(token, text.length))
      .slice(0, LIMITS.maxTokensPerTextNode * 4)
  );
}

function fromRegex(
  text: string,
  regex: RegExp,
  type: TokenType,
  validate: (value: string) => boolean = () => true
): BidiToken[] {
  return Array.from(text.matchAll(regex), (match) => {
    const value = match[0];
    const start = match.index ?? -1;
    return {
      start,
      end: start + value.length,
      type,
      priority: PRIORITY[type],
      direction: 'ltr' as const,
      value,
    };
  })
    .filter((entry) => entry.start >= 0 && validate(entry.value))
    .map((entry) =>
      Object.freeze({
        start: entry.start,
        end: entry.end,
        type: entry.type,
        priority: entry.priority,
        direction: entry.direction,
      })
    );
}

function detectUrls(text: string): BidiToken[] {
  return fromRegex(text, /\bhttps?:\/\/[^\s<>"'،؛]+/giu, 'url', (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  });
}
function detectEmails(text: string): BidiToken[] {
  return fromRegex(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, 'email');
}
function detectPaths(text: string): BidiToken[] {
  return fromRegex(
    text,
    /(?:\b[A-Za-z]:\\(?:[^\s\\/:*?"<>|]+\\)*[^\s\\/:*?"<>|]+|(?:\.\.?\/|\/)(?:[^\s/]+\/)*[^\s/]+)/gu,
    'file_path'
  );
}
function detectPackages(text: string): BidiToken[] {
  return fromRegex(
    text,
    /(?:@[a-z0-9._-]+\/[a-z0-9._-]+|\b[a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+){2,})\b/giu,
    'package_identifier'
  );
}
function detectApiSignatures(text: string): BidiToken[] {
  return fromRegex(
    text,
    /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+\s*\([^\n()]{0,120}\)/gu,
    'api_signature'
  );
}
function detectCli(text: string): BidiToken[] {
  return fromRegex(
    text,
    /(?:^|\s)(?:--?[a-z][a-z0-9-]*|(?:npm|pnpm|yarn|git|docker|python|node)\s+[a-z][^\n،؛]{0,100})/gimu,
    'cli_flag_or_command',
    (value) => value.trim().length >= 3
  );
}
function detectIdentifiers(text: string): BidiToken[] {
  return fromRegex(
    text,
    /\b(?:[A-Za-z_$][\w$]*[._:/-]){1,}[A-Za-z0-9_$-]+\b/gu,
    'technical_identifier'
  );
}
function detectVersions(text: string): BidiToken[] {
  return fromRegex(text, /\bv?\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?\b/gu, 'version');
}
function detectNetworkValues(text: string): BidiToken[] {
  return [
    ...fromRegex(text, /\b(?:\d{1,3}\.){3}\d{1,3}\b/gu, 'ip_mac_phone', isValidIpv4),
    ...fromRegex(text, /\b(?:[0-9A-F]{2}:){5}[0-9A-F]{2}\b/giu, 'ip_mac_phone', isValidMac),
    ...fromRegex(text, /(?:^|\s)\+?\d[\d ()-]{7,}\d(?=$|\s|[،؛,.!?])/gmu, 'ip_mac_phone', (value) =>
      isValidPhone(value.trim())
    ),
  ];
}
function isValidIpv4(value: string): boolean {
  const parts = value.split('.');
  return (
    parts.length === 4 &&
    parts.every((part) => /^(?:0|[1-9]\d{0,2})$/u.test(part) && Number(part) <= 255)
  );
}
function isValidMac(value: string): boolean {
  return /^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/iu.test(value);
}
function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/gu, '');
  return digits.length >= 8 && digits.length <= 15;
}
function detectNaturalPhrases(text: string): BidiToken[] {
  return fromRegex(text, /\b[A-Za-z][A-Za-z ]{8,}[A-Za-z]\b/gu, 'natural_ltr_phrase');
}
function validBounds(token: BidiToken, length: number): boolean {
  return (
    Number.isInteger(token.start) &&
    Number.isInteger(token.end) &&
    token.start >= 0 &&
    token.end > token.start &&
    token.end <= length
  );
}
