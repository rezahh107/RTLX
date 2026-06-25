import { storageGet, storageSet } from '../shared/api-adapter';
import { OPERATIONAL_BUDGETS_REGISTRY } from '../shared/registry-data';

const KEY = 'rtlx:permission-denials:v1';

interface PermissionDenial {
  permission: string;
  deniedAt: string;
  retryAfter: string;
}

let operation: Promise<void> = Promise.resolve();

export async function canRequestPermission(permission: string, now = Date.now()): Promise<boolean> {
  const records = await readDenials();
  const match = records.find((record) => record.permission === sanitize(permission));
  return !match || Date.parse(match.retryAfter) <= now;
}

export function recordPermissionDecision(permission: string, granted: boolean): Promise<void> {
  const task = operation.then(
    () => persistDecision(permission, granted),
    () => persistDecision(permission, granted)
  );
  operation = task;
  return task;
}

export async function readPermissionDenials(): Promise<readonly PermissionDenial[]> {
  return readDenials();
}

export function resetPermissionPolicyGuardForTests(): void {
  operation = Promise.resolve();
}

async function persistDecision(permission: string, granted: boolean): Promise<void> {
  const normalized = sanitize(permission);
  const current = (await readDenials()).filter((entry) => entry.permission !== normalized);
  if (!granted) {
    const now = Date.now();
    current.push(
      Object.freeze({
        permission: normalized,
        deniedAt: new Date(now).toISOString(),
        retryAfter: new Date(
          now + OPERATIONAL_BUDGETS_REGISTRY.permissionDenialCooldownMs
        ).toISOString(),
      })
    );
  }
  await storageSet('local', {
    [KEY]: current
      .sort(
        (a, b) =>
          a.deniedAt.localeCompare(b.deniedAt, 'en') ||
          a.permission.localeCompare(b.permission, 'en')
      )
      .slice(-OPERATIONAL_BUDGETS_REGISTRY.permissionDenialsMax),
  });
}

async function readDenials(): Promise<PermissionDenial[]> {
  const stored = await storageGet<unknown>('local', KEY);
  if (!Array.isArray(stored)) return [];
  return stored.filter(isDenial).map((entry) => Object.freeze(entry));
}

function isDenial(value: unknown): value is PermissionDenial {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.permission === 'string' &&
    /^[a-zA-Z][a-zA-Z0-9._-]{0,63}$/u.test(record.permission) &&
    typeof record.deniedAt === 'string' &&
    Number.isFinite(Date.parse(record.deniedAt)) &&
    typeof record.retryAfter === 'string' &&
    Number.isFinite(Date.parse(record.retryAfter))
  );
}

function sanitize(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9._-]/gu, '').slice(0, 64);
  if (!/^[a-zA-Z]/u.test(normalized)) throw new Error('Invalid permission name');
  return normalized;
}
