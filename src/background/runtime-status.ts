export type BackgroundFailureClass =
  | 'expected_transient'
  | 'expected_unsupported'
  | 'unexpected_internal';

export interface BackgroundOperationStatus {
  operation: string;
  state: 'healthy' | 'degraded' | 'circuit_open';
  failures: number;
  lastFailureClass: BackgroundFailureClass | null;
  lastError: string | null;
  lastAttemptAt: string;
  lastSuccessAt: string | null;
  circuitOpenUntil: string | null;
}

const statuses = new Map<string, BackgroundOperationStatus>();
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 30_000;

export async function runBackgroundTask<T>(
  operation: string,
  task: () => Promise<T>,
  options: Readonly<{ attempts?: number; retryDelayMs?: number }> = {}
): Promise<T> {
  const current = statuses.get(operation);
  if (current?.circuitOpenUntil && Date.parse(current.circuitOpenUntil) > Date.now()) {
    setStatus(operation, {
      ...current,
      state: 'circuit_open',
      lastAttemptAt: new Date().toISOString(),
    });
    throw new Error(`Background circuit open: ${operation}`);
  }
  const attempts = Math.max(1, Math.min(options.attempts ?? 1, 3));
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await task();
      const now = new Date().toISOString();
      setStatus(operation, {
        operation,
        state: 'healthy',
        failures: 0,
        lastFailureClass: null,
        lastError: null,
        lastAttemptAt: now,
        lastSuccessAt: now,
        circuitOpenUntil: null,
      });
      return result;
    } catch (error) {
      lastError = error;
      const classification = classifyBackgroundFailure(error);
      const previous = statuses.get(operation);
      const failures = (previous?.failures ?? 0) + 1;
      const circuitOpenUntil =
        classification === 'unexpected_internal' && failures >= CIRCUIT_THRESHOLD
          ? new Date(Date.now() + CIRCUIT_COOLDOWN_MS).toISOString()
          : null;
      setStatus(operation, {
        operation,
        state: circuitOpenUntil ? 'circuit_open' : 'degraded',
        failures,
        lastFailureClass: classification,
        lastError: safeErrorMessage(error),
        lastAttemptAt: new Date().toISOString(),
        lastSuccessAt: previous?.lastSuccessAt ?? null,
        circuitOpenUntil,
      });
      if (attempt < attempts && classification === 'expected_transient')
        await delay(Math.max(0, options.retryDelayMs ?? 25) * attempt);
      else break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(safeErrorMessage(lastError));
}

export function backgroundRuntimeSnapshot(): readonly BackgroundOperationStatus[] {
  return Object.freeze(
    [...statuses.values()]
      .sort((a, b) => a.operation.localeCompare(b.operation, 'en'))
      .map((entry) => Object.freeze({ ...entry }))
  );
}

export function classifyBackgroundFailure(error: unknown): BackgroundFailureClass {
  const message = safeErrorMessage(error).toLowerCase();
  if (
    message.includes('receiving end does not exist') ||
    message.includes('message port closed') ||
    message.includes('no tab with id') ||
    message.includes('frame was removed') ||
    message.includes('timed out')
  )
    return 'expected_transient';
  if (
    message.includes('not supported') ||
    message.includes('not implemented') ||
    message.includes('unknown property')
  )
    return 'expected_unsupported';
  return 'unexpected_internal';
}

export function resetBackgroundRuntimeStatusForTests(): void {
  statuses.clear();
}

function setStatus(operation: string, status: BackgroundOperationStatus): void {
  statuses.set(operation, Object.freeze({ ...status }));
}

function safeErrorMessage(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  return value.slice(0, 512);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
