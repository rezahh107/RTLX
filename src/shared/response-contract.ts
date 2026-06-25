import {
  CANONICAL_CYCLE_ERROR_CODE,
  CANONICAL_DEPTH_ERROR_CODE,
  canonicalByteLength,
  toCanonicalJson,
} from './canonical-json';
import { LIMITS } from './constants';
import type { ResponseMessage } from './messages';

export type MessageContractProducer = 'background' | 'content' | 'popup' | 'unknown';

export interface MessageContractProvenance {
  readonly producer: MessageContractProducer;
  readonly handlerId: string;
  readonly messageType: string;
}

export type ResponseContractIssueCategory =
  | 'non_canonical'
  | 'too_large'
  | 'not_object'
  | 'request_id_mismatch'
  | 'invalid_success_envelope'
  | 'invalid_failure_envelope'
  | 'invalid_content_envelope';

export interface ResponseContractIssue {
  readonly category: ResponseContractIssueCategory;
  readonly message: string;
  readonly responseKeys: readonly string[];
  readonly invalidPaths: readonly string[];
  readonly invalidValueKinds: readonly string[];
  readonly provenance: MessageContractProvenance;
}

export type ResponseContractInspection =
  | Readonly<{ ok: true; value: ResponseMessage }>
  | Readonly<{ ok: false; issue: ResponseContractIssue }>;

export const RESPONSE_CONTRACT_ERROR_CODE = 'RTLX-MESSAGE-005' as const;

export function messageContractProvenance(
  producer: MessageContractProducer,
  handlerId: string,
  messageType: string
): MessageContractProvenance {
  return Object.freeze({
    producer,
    handlerId: sanitizeDiagnosticIdentifier(handlerId),
    messageType: sanitizeDiagnosticIdentifier(messageType),
  });
}

export function inspectResponseMessage(
  value: unknown,
  expectedRequestId: string,
  provenance: MessageContractProvenance = messageContractProvenance(
    'unknown',
    'unknown.response-handler',
    'UNKNOWN'
  )
): ResponseContractInspection {
  const responseKeys = objectKeys(value);
  try {
    toCanonicalJson(value);
  } catch (error) {
    return invalid(
      'non_canonical',
      errorMessage(error),
      responseKeys,
      canonicalFailure(error),
      provenance
    );
  }
  if (canonicalByteLength(value) > LIMITS.maxMessageBytes)
    return invalid('too_large', 'Response exceeds size limit', responseKeys, undefined, provenance);
  if (!isRecord(value))
    return invalid(
      'not_object',
      'Response must be a plain object',
      responseKeys,
      undefined,
      provenance
    );
  if (value.requestId !== expectedRequestId)
    return invalid(
      'request_id_mismatch',
      'Response requestId does not match request',
      responseKeys,
      undefined,
      provenance
    );
  if (value.success === true) {
    if (
      !exactKeysOneOf(value, [
        ['requestId', 'success'],
        ['requestId', 'success', 'data'],
      ])
    )
      return invalid(
        'invalid_success_envelope',
        'Success response envelope is invalid',
        responseKeys,
        undefined,
        provenance
      );
    return Object.freeze({ ok: true, value: value as unknown as ResponseMessage });
  }
  if (
    value.success !== false ||
    !exactKeys(value, ['requestId', 'success', 'error']) ||
    !isRecord(value.error) ||
    !exactKeys(value.error, ['code', 'message']) ||
    typeof value.error.code !== 'string' ||
    typeof value.error.message !== 'string'
  )
    return invalid(
      'invalid_failure_envelope',
      'Failure response envelope is invalid',
      responseKeys,
      undefined,
      provenance
    );
  return Object.freeze({ ok: true, value: value as unknown as ResponseMessage });
}

export function enforceResponseMessage(
  value: unknown,
  expectedRequestId: string,
  provenance: MessageContractProvenance = messageContractProvenance(
    'unknown',
    'unknown.response-handler',
    'UNKNOWN'
  )
): ResponseMessage {
  const inspection = inspectResponseMessage(value, expectedRequestId, provenance);
  if (inspection.ok) return inspection.value;
  const path = inspection.issue.invalidPaths[0];
  return Object.freeze({
    requestId: expectedRequestId,
    success: false,
    error: Object.freeze({
      code: RESPONSE_CONTRACT_ERROR_CODE,
      message: path
        ? `Background response contract violation at ${path}`
        : 'Background response contract violation',
    }),
  });
}

export type ContentCommandResponse =
  | Readonly<{ ok: true; data?: unknown }>
  | Readonly<{ ok: false; error: { code: string; message: string } }>;

export const CONTENT_RESPONSE_CONTRACT_ERROR_CODE = 'RTLX-CONTENT-RESPONSE-INVALID' as const;

export type ContentResponseContractInspection =
  | Readonly<{ ok: true; value: ContentCommandResponse }>
  | Readonly<{ ok: false; issue: ResponseContractIssue }>;

export function inspectContentCommandResponse(
  value: unknown,
  provenance: MessageContractProvenance = messageContractProvenance(
    'content',
    'content.response-handler',
    'CONTENT_COMMAND'
  )
): ContentResponseContractInspection {
  const responseKeys = objectKeys(value);
  try {
    toCanonicalJson(value);
  } catch (error) {
    return invalidContent(
      'non_canonical',
      errorMessage(error),
      responseKeys,
      canonicalFailure(error),
      provenance
    );
  }
  if (canonicalByteLength(value) > LIMITS.maxMessageBytes)
    return invalidContent(
      'too_large',
      'Content response exceeds size limit',
      responseKeys,
      undefined,
      provenance
    );
  if (!isRecord(value))
    return invalidContent(
      'not_object',
      'Content response must be a plain object',
      responseKeys,
      undefined,
      provenance
    );
  if (value.ok === true) {
    if (!exactKeysOneOf(value, [['ok'], ['ok', 'data']]))
      return invalidContent(
        'invalid_content_envelope',
        'Content success response envelope is invalid',
        responseKeys,
        undefined,
        provenance
      );
    return Object.freeze({ ok: true, value: value as unknown as ContentCommandResponse });
  }
  if (
    value.ok !== false ||
    !exactKeys(value, ['ok', 'error']) ||
    !isRecord(value.error) ||
    !exactKeys(value.error, ['code', 'message']) ||
    typeof value.error.code !== 'string' ||
    typeof value.error.message !== 'string'
  )
    return invalidContent(
      'invalid_content_envelope',
      'Content failure response envelope is invalid',
      responseKeys,
      undefined,
      provenance
    );
  return Object.freeze({ ok: true, value: value as unknown as ContentCommandResponse });
}

function invalidContent(
  category: ResponseContractIssueCategory,
  message: string,
  responseKeys: readonly string[],
  canonical:
    | Readonly<{ invalidPaths: readonly string[]; invalidValueKinds: readonly string[] }>
    | undefined,
  provenance: MessageContractProvenance
): ContentResponseContractInspection {
  return invalid(
    category,
    message,
    responseKeys,
    canonical,
    provenance
  ) as ContentResponseContractInspection;
}

export function enforceContentCommandResponse(
  value: unknown,
  provenance: MessageContractProvenance = messageContractProvenance(
    'content',
    'content.response-handler',
    'CONTENT_COMMAND'
  )
): ContentCommandResponse {
  const inspection = inspectContentCommandResponse(value, provenance);
  if (inspection.ok) return inspection.value;
  const path = inspection.issue.invalidPaths[0];
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: CONTENT_RESPONSE_CONTRACT_ERROR_CODE,
      message: path
        ? `Content response contract violation at ${path}`
        : 'Content response contract violation',
    }),
  });
}

export function canonicalFailure(error: unknown): Readonly<{
  invalidPaths: readonly string[];
  invalidValueKinds: readonly string[];
}> {
  const message = errorMessage(error);
  const path = canonicalErrorPath(message);
  const kind = message.includes(CANONICAL_CYCLE_ERROR_CODE)
    ? 'cyclic_reference'
    : message.includes(CANONICAL_DEPTH_ERROR_CODE)
      ? 'maximum_depth_exceeded'
      : message.includes('undefined')
        ? 'undefined'
        : message.includes('non-finite') || message.includes('NaN') || message.includes('infin')
          ? 'non_finite_number'
          : message.includes('plain object')
            ? 'non_plain_object'
            : message.includes('surrogate')
              ? 'invalid_unicode'
              : 'non_json_value';
  return Object.freeze({
    invalidPaths: Object.freeze(path ? [path] : []),
    invalidValueKinds: Object.freeze([kind]),
  });
}

function invalid(
  category: ResponseContractIssueCategory,
  message: string,
  responseKeys: readonly string[],
  canonical: Readonly<{ invalidPaths: readonly string[]; invalidValueKinds: readonly string[] }> = {
    invalidPaths: [],
    invalidValueKinds: [],
  },
  provenance: MessageContractProvenance
): ResponseContractInspection {
  return Object.freeze({
    ok: false,
    issue: Object.freeze({
      category,
      message,
      responseKeys: Object.freeze([...responseKeys]),
      invalidPaths: Object.freeze([...canonical.invalidPaths]),
      invalidValueKinds: Object.freeze([...canonical.invalidValueKinds]),
      provenance,
    }),
  });
}

function canonicalErrorPath(message: string): string | undefined {
  const start = message.indexOf('$');
  if (start < 0) return undefined;
  let end = start;
  while (end < message.length && !isWhitespace(message.charCodeAt(end))) end += 1;
  return message.slice(start, end);
}

function isWhitespace(code: number): boolean {
  return code === 9 || code === 10 || code === 13 || code === 32;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function objectKeys(value: unknown): readonly string[] {
  return isRecord(value) ? Object.freeze(Object.keys(value).sort()) : Object.freeze([]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.join('\u0000') === expected.join('\u0000');
}

function exactKeysOneOf(
  value: Record<string, unknown>,
  options: readonly (readonly string[])[]
): boolean {
  return options.some((keys) => exactKeys(value, keys));
}

function sanitizeDiagnosticIdentifier(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9_.:-]/gu, '_').slice(0, 96);
  return sanitized || 'unknown';
}
