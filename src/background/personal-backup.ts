import {
  canonicalByteLength,
  canonicalize,
  sha256Hex,
  toCanonicalJson,
  type CanonicalJson,
} from '../shared/canonical-json';
import {
  DIAGNOSTIC_SCHEMA_VERSION,
  LIMITS,
  PRODUCT_VERSION,
  PROFILE_SCHEMA_VERSION,
  SETTINGS_SCHEMA_VERSION,
} from '../shared/constants';
import { validatePerSiteSettings } from '../shared/messages';
import { normalizeProfile, validateProfile } from '../shared/profile-schema';
import { isRecord, validateSettings } from '../shared/settings';
import { parseStrictJson } from '../shared/strict-json';
import type { Diagnostic } from '../shared/types';
import { storageGetAll, storageGetBytesInUse } from '../shared/api-adapter';
import { exportDiagnostics } from './diagnostics-store';
import { verifyCriticalPackageFiles } from './package-integrity';
import { readSafeModeState } from './safe-mode';
import { getSettings } from './settings-repository';
import { pendingStorageTransactionCount, runStorageTransaction } from './storage-transaction';
import { readUpdateState } from './update-coordinator';

const BACKUP_SCHEMA_VERSION = '1.0.0' as const;
const SYNC_KEYS = ['rtlx:settings'] as const;
const SYNC_PREFIXES = ['rtlx:site:', 'rtlx:conversation:'] as const;
const LOCAL_PREFIXES = ['rtlx:user-profile:', 'rtlx:profile-history:'] as const;

export interface PersonalBackupImportResult {
  dryRun: boolean;
  applied: boolean;
  syncItems: number;
  localItems: number;
  removedSyncItems: number;
  removedLocalItems: number;
  permissionHints: number;
  warnings: readonly string[];
}

interface PersonalBackupPayload {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  extensionVersion: string;
  createdAt: string;
  sourceExtensionId: string;
  schemas: {
    settings: string;
    profile: string;
    diagnostic: string;
  };
  data: {
    sync: Readonly<Record<string, CanonicalJson>>;
    local: Readonly<Record<string, CanonicalJson>>;
  };
  permissionHints: {
    permissions: readonly string[];
    origins: readonly string[];
  };
  operationalState: {
    safeModeActive: boolean;
    pendingTransactions: number;
    updatePending: boolean;
    packageIntegrityStatus: string;
    storageBytes: { local: number | null; sync: number | null };
  };
  diagnostics?: readonly Diagnostic[];
  integrity: {
    algorithm: 'sha256';
    canonicalHash: string;
  };
}

export async function exportPersonalBackup(includeDiagnostics = false): Promise<string> {
  const [syncAll, localAll, permissions, safeMode, pendingTransactions, update, packageIntegrity] =
    await Promise.all([
      storageGetAll('sync'),
      storageGetAll('local'),
      getAllPermissions(),
      readSafeModeState(),
      pendingStorageTransactionCount(),
      readUpdateState(),
      verifyCriticalPackageFiles(),
    ]);
  const base = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    extensionVersion: PRODUCT_VERSION,
    createdAt: new Date().toISOString(),
    sourceExtensionId: chrome.runtime.id,
    schemas: {
      settings: SETTINGS_SCHEMA_VERSION,
      profile: PROFILE_SCHEMA_VERSION,
      diagnostic: DIAGNOSTIC_SCHEMA_VERSION,
    },
    data: {
      sync: select(syncAll, isManagedSyncKey),
      local: select(localAll, isManagedLocalKey),
    },
    permissionHints: {
      permissions: Object.freeze([...(permissions.permissions ?? [])].sort()),
      origins: Object.freeze([...(permissions.origins ?? [])].sort()),
    },
    operationalState: {
      safeModeActive: safeMode.active,
      pendingTransactions,
      updatePending: update !== null,
      packageIntegrityStatus: packageIntegrity.status,
      storageBytes: {
        local: await storageGetBytesInUse('local'),
        sync: await storageGetBytesInUse('sync'),
      },
    },
    ...(includeDiagnostics
      ? { diagnostics: await exportDiagnostics((await getSettings()).diagnosticsPersistence) }
      : {}),
  };
  const canonicalBase = toCanonicalJson(base);
  const canonicalHash = await sha256Hex(canonicalize(canonicalBase));
  const backup: PersonalBackupPayload = Object.freeze({
    ...(base as Omit<PersonalBackupPayload, 'integrity'>),
    integrity: Object.freeze({ algorithm: 'sha256', canonicalHash }),
  });
  if (canonicalByteLength(backup) > LIMITS.maxPersonalBackupBytes)
    throw new Error('Personal backup exceeds byte-size limit');
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export async function importPersonalBackup(
  raw: string,
  dryRun: boolean
): Promise<PersonalBackupImportResult> {
  if (new TextEncoder().encode(raw).byteLength > LIMITS.maxPersonalBackupBytes)
    throw new Error('Personal backup exceeds byte-size limit');
  const backup = await normalizeBackup(parseStrictJson(raw));
  const currentSync = await storageGetAll('sync');
  const currentLocal = await storageGetAll('local');
  const removeSync = managedKeys(currentSync, isManagedSyncKey).filter(
    (key) => !(key in backup.data.sync)
  );
  const removeLocal = managedKeys(currentLocal, isManagedLocalKey).filter(
    (key) => !(key in backup.data.local)
  );
  const warnings = Object.freeze([
    'permissions_require_explicit_regrant',
    'safe_mode_state_not_restored',
    'operational_journal_not_restored',
    ...(backup.diagnostics ? ['diagnostics_not_restored'] : []),
  ]);
  if (!dryRun) {
    await runStorageTransaction({
      kind: 'personal-backup-sync',
      area: 'sync',
      setItems: backup.data.sync,
      removeKeys: removeSync,
    });
    await runStorageTransaction({
      kind: 'personal-backup-local',
      area: 'local',
      setItems: backup.data.local,
      removeKeys: removeLocal,
    });
  }
  return Object.freeze({
    dryRun,
    applied: !dryRun,
    syncItems: Object.keys(backup.data.sync).length,
    localItems: Object.keys(backup.data.local).length,
    removedSyncItems: removeSync.length,
    removedLocalItems: removeLocal.length,
    permissionHints:
      backup.permissionHints.origins.length + backup.permissionHints.permissions.length,
    warnings,
  });
}

async function normalizeBackup(value: unknown): Promise<PersonalBackupPayload> {
  if (!isRecord(value)) throw new Error('Personal backup invalid');
  const allowed = [
    'schemaVersion',
    'extensionVersion',
    'createdAt',
    'sourceExtensionId',
    'schemas',
    'data',
    'permissionHints',
    'operationalState',
    'diagnostics',
    'integrity',
  ];
  if (!Object.keys(value).every((key) => allowed.includes(key)))
    throw new Error('Personal backup has unknown fields');
  if (
    value.schemaVersion !== BACKUP_SCHEMA_VERSION ||
    typeof value.extensionVersion !== 'string' ||
    isNewerVersion(value.extensionVersion, PRODUCT_VERSION) ||
    typeof value.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    typeof value.sourceExtensionId !== 'string' ||
    !/^(?:[a-p]{32}|\{[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\})$/iu.test(
      value.sourceExtensionId
    ) ||
    !isRecord(value.schemas) ||
    value.schemas.settings !== SETTINGS_SCHEMA_VERSION ||
    value.schemas.profile !== PROFILE_SCHEMA_VERSION ||
    value.schemas.diagnostic !== DIAGNOSTIC_SCHEMA_VERSION ||
    !isRecord(value.data) ||
    !isRecord(value.data.sync) ||
    !isRecord(value.data.local) ||
    !isRecord(value.permissionHints) ||
    !Array.isArray(value.permissionHints.permissions) ||
    !value.permissionHints.permissions.every(
      (item) => typeof item === 'string' && item.length <= 128
    ) ||
    !Array.isArray(value.permissionHints.origins) ||
    !value.permissionHints.origins.every(
      (item) => typeof item === 'string' && item.length <= 512
    ) ||
    !isRecord(value.operationalState) ||
    !isRecord(value.integrity) ||
    value.integrity.algorithm !== 'sha256' ||
    typeof value.integrity.canonicalHash !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(value.integrity.canonicalHash)
  )
    throw new Error('Personal backup invalid');
  validateSyncData(value.data.sync);
  await validateLocalData(value.data.local);
  if (value.diagnostics !== undefined && !Array.isArray(value.diagnostics))
    throw new Error('Personal backup diagnostics invalid');
  const withoutIntegrity = { ...value };
  delete withoutIntegrity.integrity;
  const actualHash = await sha256Hex(canonicalize(toCanonicalJson(withoutIntegrity)));
  if (actualHash !== value.integrity.canonicalHash)
    throw new Error('Personal backup checksum mismatch');
  return value as unknown as PersonalBackupPayload;
}

function validateSyncData(data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    if (!isManagedSyncKey(key)) throw new Error('Personal backup sync key invalid');
    if (key === 'rtlx:settings') {
      if (!validateSettings(value)) throw new Error('Personal backup settings invalid');
    } else if (!validatePerSiteSettings(value)) {
      throw new Error('Personal backup site settings invalid');
    }
  }
  if (!('rtlx:settings' in data)) throw new Error('Personal backup settings missing');
}

async function validateLocalData(data: Record<string, unknown>): Promise<void> {
  for (const [key, value] of Object.entries(data)) {
    if (!isManagedLocalKey(key)) throw new Error('Personal backup local key invalid');
    if (key.startsWith('rtlx:user-profile:')) {
      const profile = normalizeProfile(value);
      validateProfile(profile);
      if (profile.profileKind !== 'user') throw new Error('Personal backup profile kind invalid');
      const host = key.slice('rtlx:user-profile:'.length);
      if (profile.match.hosts[0]?.toLowerCase() !== host)
        throw new Error('Personal backup profile host mismatch');
    } else {
      await validateHistory(value);
    }
  }
}

async function validateHistory(value: unknown): Promise<void> {
  if (!Array.isArray(value) || value.length > LIMITS.profileHistoryMaxSnapshots)
    throw new Error('Personal backup history invalid');
  for (const raw of value) {
    if (
      !isRecord(raw) ||
      raw.schemaVersion !== '1.0.0' ||
      typeof raw.hash !== 'string' ||
      !/^[a-f0-9]{64}$/u.test(raw.hash) ||
      typeof raw.savedAt !== 'string' ||
      !Number.isFinite(Date.parse(raw.savedAt)) ||
      !Number.isInteger(raw.profileVersion) ||
      !('profile' in raw)
    )
      throw new Error('Personal backup history invalid');
    const profile = normalizeProfile(raw.profile);
    validateProfile(profile);
    if (profile.profileVersion !== raw.profileVersion)
      throw new Error('Personal backup history version mismatch');
    const calculated = await sha256Hex(canonicalize(profile as unknown as CanonicalJson));
    if (calculated !== raw.hash) throw new Error('Personal backup history checksum mismatch');
  }
}

function select(
  source: Record<string, unknown>,
  predicate: (key: string) => boolean
): Readonly<Record<string, CanonicalJson>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(source)
        .filter(([key]) => predicate(key))
        .sort(([a], [b]) => a.localeCompare(b, 'en'))
        .map(([key, value]) => [key, toCanonicalJson(value)])
    )
  );
}

function managedKeys(
  source: Record<string, unknown>,
  predicate: (key: string) => boolean
): string[] {
  return Object.keys(source)
    .filter(predicate)
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function isManagedSyncKey(key: string): boolean {
  return (
    SYNC_KEYS.includes(key as (typeof SYNC_KEYS)[number]) ||
    SYNC_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

function isManagedLocalKey(key: string): boolean {
  return LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function isNewerVersion(candidate: string, current: string): boolean {
  const left = parseVersion(candidate);
  const right = parseVersion(current);
  for (let index = 0; index < 3; index += 1) {
    if (left[index]! > right[index]!) return true;
    if (left[index]! < right[index]!) return false;
  }
  return false;
}

function parseVersion(value: string): readonly [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(value);
  if (!match) throw new Error('Personal backup version invalid');
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function getAllPermissions(): Promise<chrome.permissions.Permissions> {
  return new Promise((resolve) => chrome.permissions.getAll(resolve));
}
