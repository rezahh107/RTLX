import { storageGet, storageSet } from '../shared/api-adapter';
import { OPERATIONAL_BUDGETS_REGISTRY } from '../shared/registry-data';

const SAFE_MODE_KEY = 'rtlx:safe-mode:v1';
const FAILURE_THRESHOLD = OPERATIONAL_BUDGETS_REGISTRY.safeModeFailureThreshold;
const VERIFIED_RECOVERY_THRESHOLD = OPERATIONAL_BUDGETS_REGISTRY.safeModeVerifiedRecoveryThreshold;

export interface SafeModeState {
  schemaVersion: '1.0.0';
  active: boolean;
  consecutiveFailures: number;
  healthyInitializations: number;
  lastFailureCode: string | null;
  lastFailureSource: string | null;
  activatedAt: string | null;
  updatedAt: string;
}

const DEFAULT_STATE: SafeModeState = Object.freeze({
  schemaVersion: '1.0.0',
  active: false,
  consecutiveFailures: 0,
  healthyInitializations: 0,
  lastFailureCode: null,
  lastFailureSource: null,
  activatedAt: null,
  updatedAt: new Date(0).toISOString(),
});

let operation: Promise<SafeModeState> = Promise.resolve(DEFAULT_STATE);

export function readSafeModeState(): Promise<SafeModeState> {
  return operation.then(async () => normalize(await storageGet<unknown>('local', SAFE_MODE_KEY)));
}

export function recordCriticalFailure(source: string, code: string): Promise<SafeModeState> {
  return serialize(async () => {
    const current = normalize(await storageGet<unknown>('local', SAFE_MODE_KEY));
    const failures = Math.min(current.consecutiveFailures + 1, 1_000_000);
    const now = new Date().toISOString();
    const active = current.active || failures >= FAILURE_THRESHOLD;
    const next: SafeModeState = Object.freeze({
      schemaVersion: '1.0.0',
      active,
      consecutiveFailures: failures,
      healthyInitializations: 0,
      lastFailureCode: sanitize(code),
      lastFailureSource: sanitize(source),
      activatedAt: active ? (current.activatedAt ?? now) : null,
      updatedAt: now,
    });
    await storageSet('local', { [SAFE_MODE_KEY]: next });
    return next;
  });
}

export function recordHealthyInitialization(): Promise<SafeModeState> {
  return serialize(async () => {
    const current = normalize(await storageGet<unknown>('local', SAFE_MODE_KEY));
    const healthy = current.active ? current.healthyInitializations + 1 : 0;
    const recovered = current.active && healthy >= VERIFIED_RECOVERY_THRESHOLD;
    const next: SafeModeState = Object.freeze({
      ...current,
      active: recovered ? false : current.active,
      consecutiveFailures: recovered || !current.active ? 0 : current.consecutiveFailures,
      healthyInitializations: recovered ? 0 : healthy,
      activatedAt: recovered ? null : current.activatedAt,
      updatedAt: new Date().toISOString(),
    });
    await storageSet('local', { [SAFE_MODE_KEY]: next });
    return next;
  });
}

export function resetSafeMode(): Promise<SafeModeState> {
  return serialize(async () => {
    const next: SafeModeState = Object.freeze({
      ...DEFAULT_STATE,
      updatedAt: new Date().toISOString(),
    });
    await storageSet('local', { [SAFE_MODE_KEY]: next });
    return next;
  });
}

export function resetSafeModeForTests(): void {
  operation = Promise.resolve(DEFAULT_STATE);
}

function serialize(task: () => Promise<SafeModeState>): Promise<SafeModeState> {
  const next = operation.then(task, task);
  operation = next;
  return next;
}

function normalize(value: unknown): SafeModeState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return DEFAULT_STATE;
  const record = value as Record<string, unknown>;
  if (
    record.schemaVersion !== '1.0.0' ||
    typeof record.active !== 'boolean' ||
    !Number.isInteger(record.consecutiveFailures) ||
    Number(record.consecutiveFailures) < 0 ||
    !Number.isInteger(record.healthyInitializations) ||
    Number(record.healthyInitializations) < 0 ||
    !nullableString(record.lastFailureCode) ||
    !nullableString(record.lastFailureSource) ||
    !nullableDate(record.activatedAt) ||
    typeof record.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(record.updatedAt))
  )
    return DEFAULT_STATE;
  return Object.freeze({
    schemaVersion: '1.0.0',
    active: record.active,
    consecutiveFailures: Number(record.consecutiveFailures),
    healthyInitializations: Number(record.healthyInitializations),
    lastFailureCode: record.lastFailureCode as string | null,
    lastFailureSource: record.lastFailureSource as string | null,
    activatedAt: record.activatedAt as string | null,
    updatedAt: new Date(record.updatedAt).toISOString(),
  });
}

function nullableString(value: unknown): boolean {
  return value === null || (typeof value === 'string' && value.length <= 128);
}

function nullableDate(value: unknown): boolean {
  return value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9:_-]/gu, '_').slice(0, 128);
}
