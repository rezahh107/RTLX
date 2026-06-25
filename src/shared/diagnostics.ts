import { DIAGNOSTIC_SCHEMA_VERSION } from './constants';
import type { Diagnostic, DiagnosticScope, DiagnosticSeverity } from './types';

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
const FORBIDDEN_DETAIL_KEY = /(text|url|selector|html|form|clipboard|query|fragment)/iu;
const SAFE_CONTENT_STRING_VALUES = new Set([
  'task_failed',
  'wrapper_limit',
  'queue_limit',
  'rollback_failed',
  'candidate-queue',
  'delay-queue',
  'discovery-queue',
  'streaming-queue',
  'runtime-exception',
  'rollback',
  'wrapper-limit',
  'quiet-period',
  'quiescent',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const OPAQUE_DOCUMENT_ID = /^[A-Za-z0-9_-]{1,128}$/u;

export function createDiagnostic(
  code: string,
  severity: DiagnosticSeverity,
  requirementId: string,
  scope: DiagnosticScope,
  details: Readonly<Record<string, string | number | boolean | null>> = {},
  clock: Clock = systemClock
): Diagnostic {
  const sanitized = sanitizeDetails(details, true);
  return Object.freeze({
    schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
    code,
    severity,
    requirementId,
    scope,
    timestamp: clock.now().toISOString(),
    details: Object.freeze(sanitized),
  });
}

export function sanitizeDiagnostic(
  value: Diagnostic,
  source: 'trusted-background' | 'untrusted-content'
): Diagnostic {
  return Object.freeze({
    ...value,
    details: Object.freeze(sanitizeDetails(value.details, source === 'trusted-background')),
  });
}

export function isDiagnostic(value: unknown): value is Diagnostic {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (
    record.schemaVersion !== DIAGNOSTIC_SCHEMA_VERSION ||
    typeof record.code !== 'string' ||
    !/^RTLX-[A-Z]+-[0-9]{3}$/u.test(record.code) ||
    !['info', 'warning', 'error', 'fatal'].includes(String(record.severity)) ||
    typeof record.requirementId !== 'string' ||
    !['feature', 'candidate', 'frame', 'site', 'extension'].includes(String(record.scope)) ||
    typeof record.timestamp !== 'string' ||
    Number.isNaN(Date.parse(record.timestamp)) ||
    typeof record.details !== 'object' ||
    record.details === null ||
    Array.isArray(record.details)
  )
    return false;
  return Object.entries(record.details as Record<string, unknown>).every(
    ([key, detail]) =>
      !FORBIDDEN_DETAIL_KEY.test(key) &&
      (detail === null ||
        typeof detail === 'string' ||
        typeof detail === 'number' ||
        typeof detail === 'boolean') &&
      (typeof detail !== 'number' || Number.isFinite(detail))
  );
}

export function isUntrustedDiagnostic(value: unknown): value is Diagnostic {
  return (
    isDiagnostic(value) &&
    Object.entries(value.details).every(
      ([key, detail]) => typeof detail !== 'string' || isSafeUntrustedString(key, detail)
    )
  );
}

function sanitizeDetails(
  details: Readonly<Record<string, string | number | boolean | null>>,
  allowTrustedStrings: boolean
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(details)
      .filter(([key, value]) => {
        if (FORBIDDEN_DETAIL_KEY.test(key)) return false;
        if (typeof value === 'number') return Number.isFinite(value);
        if (typeof value === 'string')
          return allowTrustedStrings || isSafeUntrustedString(key, value);
        return value === null || typeof value === 'boolean';
      })
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  );
}

function isSafeUntrustedString(key: string, value: string): boolean {
  if (SAFE_CONTENT_STRING_VALUES.has(value)) return true;
  if (key === 'runtimeInstanceId' || key === 'contentDocumentInstanceId') return UUID.test(value);
  if (key === 'browserDocumentId') return OPAQUE_DOCUMENT_ID.test(value);
  return false;
}
