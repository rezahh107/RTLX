import { canonicalize, sha256Hex, toCanonicalJson } from '../shared/canonical-json';
import {
  DIAGNOSTIC_SCHEMA_VERSION,
  PRODUCT_VERSION,
  PROFILE_SCHEMA_VERSION,
  SETTINGS_SCHEMA_VERSION,
} from '../shared/constants';
import { storageGetBytesInUse } from '../shared/api-adapter';
import { backgroundInitializationSnapshot, reinitializeBackground } from './lifecycle';
import { clearDiagnostics, exportDiagnostics } from './diagnostics-store';
import { verifyCriticalPackageFiles, type PackageIntegrityResult } from './package-integrity';
import { listUserProfiles } from './user-profile-repository';
import { readSafeModeState } from './safe-mode';
import { getSettings } from './settings-repository';
import { pendingStorageTransactionCount, recoverStorageTransactions } from './storage-transaction';
import { readUpdateState } from './update-coordinator';

export type PersonalHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'safe_mode'
  | 'recovery_required'
  | 'insufficient_evidence';

export interface PersonalHealthReport {
  schemaVersion: '1.0.0';
  status: PersonalHealthStatus;
  checkedAt: string;
  productVersion: string;
  extensionId: string;
  manifestVersion: string;
  schemas: {
    settings: string;
    profile: string;
    diagnostic: string;
  };
  initialization: ReturnType<typeof backgroundInitializationSnapshot>;
  safeMode: Awaited<ReturnType<typeof readSafeModeState>>;
  update: Awaited<ReturnType<typeof readUpdateState>>;
  pendingTransactions: number;
  diagnosticsCount: number;
  userProfilesCount: number;
  storageBytes: { local: number | null; sync: number | null };
  permissions: { permissions: readonly string[]; origins: readonly string[] };
  packageIntegrity: PackageIntegrityResult;
  findings: readonly string[];
}

export async function runPersonalHealthCheck(
  options: Readonly<{ forceIntegrity?: boolean }> = {}
): Promise<PersonalHealthReport> {
  const settings = await getSettings();
  const [
    safeMode,
    update,
    pendingTransactions,
    diagnostics,
    profiles,
    permissions,
    packageIntegrity,
  ] = await Promise.all([
    readSafeModeState(),
    readUpdateState(),
    pendingStorageTransactionCount(),
    exportDiagnostics(settings.diagnosticsPersistence),
    listUserProfiles(),
    getAllPermissions(),
    verifyCriticalPackageFiles(
      options.forceIntegrity === undefined ? {} : { force: options.forceIntegrity }
    ),
  ]);
  const manifestVersion = chrome.runtime.getManifest().version;
  const findings: string[] = [];
  if (manifestVersion !== PRODUCT_VERSION) findings.push('manifest_product_version_mismatch');
  if (safeMode.active) findings.push('safe_mode_active');
  if (pendingTransactions > 0) findings.push('pending_storage_transactions');
  if (update !== null) findings.push('update_pending');
  if (packageIntegrity.status !== 'verified')
    findings.push(`package_integrity_${packageIntegrity.status}`);
  const initialization = backgroundInitializationSnapshot();
  if (!initialization) findings.push('initialization_snapshot_unavailable');
  const status = determineStatus({
    safeMode: safeMode.active,
    pendingTransactions,
    updatePending: update !== null,
    packageIntegrity: packageIntegrity.status,
    versionMismatch: manifestVersion !== PRODUCT_VERSION,
    initializationMissing: initialization === null,
  });
  return Object.freeze({
    schemaVersion: '1.0.0',
    status,
    checkedAt: new Date().toISOString(),
    productVersion: PRODUCT_VERSION,
    extensionId: chrome.runtime.id,
    manifestVersion,
    schemas: Object.freeze({
      settings: SETTINGS_SCHEMA_VERSION,
      profile: PROFILE_SCHEMA_VERSION,
      diagnostic: DIAGNOSTIC_SCHEMA_VERSION,
    }),
    initialization,
    safeMode,
    update,
    pendingTransactions,
    diagnosticsCount: diagnostics.length,
    userProfilesCount: profiles.length,
    storageBytes: Object.freeze({
      local: await storageGetBytesInUse('local'),
      sync: await storageGetBytesInUse('sync'),
    }),
    permissions: Object.freeze({
      permissions: Object.freeze([...(permissions.permissions ?? [])].sort()),
      origins: Object.freeze([...(permissions.origins ?? [])].sort()),
    }),
    packageIntegrity,
    findings: Object.freeze(findings.sort()),
  });
}

export async function exportPersonalSupportBundle(): Promise<string> {
  const settings = await getSettings();
  const health = await runPersonalHealthCheck({ forceIntegrity: true });
  const diagnostics = await exportDiagnostics(settings.diagnosticsPersistence);
  const base = {
    schemaVersion: '1.0.0',
    productVersion: PRODUCT_VERSION,
    createdAt: new Date().toISOString(),
    health,
    diagnostics,
  };
  const hash = await sha256Hex(canonicalize(toCanonicalJson(base)));
  return `${JSON.stringify({ ...base, integrity: { algorithm: 'sha256', canonicalHash: hash } }, null, 2)}\n`;
}

export async function attemptPersonalRecovery(): Promise<
  Readonly<{
    recovery: { recovered: number; discarded: number };
    health: PersonalHealthReport;
  }>
> {
  const recovery = await recoverStorageTransactions();
  await reinitializeBackground('personal-recovery');
  return Object.freeze({
    recovery,
    health: await runPersonalHealthCheck({ forceIntegrity: true }),
  });
}

export async function clearPersonalDiagnostics(): Promise<PersonalHealthReport> {
  await clearDiagnostics();
  return runPersonalHealthCheck();
}

function determineStatus(
  input: Readonly<{
    safeMode: boolean;
    pendingTransactions: number;
    updatePending: boolean;
    packageIntegrity: PackageIntegrityResult['status'];
    versionMismatch: boolean;
    initializationMissing: boolean;
  }>
): PersonalHealthStatus {
  if (input.safeMode) return 'safe_mode';
  if (input.pendingTransactions > 0 || input.updatePending) return 'recovery_required';
  if (
    input.versionMismatch ||
    input.packageIntegrity === 'mismatch' ||
    input.packageIntegrity === 'manifest_missing'
  )
    return 'degraded';
  if (input.initializationMissing || input.packageIntegrity === 'insufficient_evidence')
    return 'insufficient_evidence';
  return 'healthy';
}

function getAllPermissions(): Promise<chrome.permissions.Permissions> {
  return new Promise((resolve) => chrome.permissions.getAll(resolve));
}
