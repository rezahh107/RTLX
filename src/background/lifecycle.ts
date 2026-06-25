import { ensureProfileAlarm } from './alarm-manager';
import {
  synchronizeRegisteredContentScript,
  type ContentScriptReconciliation,
} from './permission-manager';
import { getSettings } from './settings-repository';
import { restrictStorageToTrustedContexts, type StorageAccessResult } from './storage-access';
import { recoverStorageTransactions } from './storage-transaction';
import { reconcileRuntimeContexts, type RuntimeContextCensus } from './runtime-context-reconciler';
import {
  readSafeModeState,
  recordCriticalFailure,
  recordHealthyInitialization,
  type SafeModeState,
} from './safe-mode';
import { recoverPendingUpdate } from './update-coordinator';
import { verifyCriticalPackageFiles, type PackageIntegrityResult } from './package-integrity';
import { PRODUCT_VERSION } from '../shared/constants';
import type { Settings } from '../shared/types';

const MAINTENANCE_STAGE_TIMEOUT_MS = 3_000;

export interface BackgroundMaintenanceFailure {
  stage:
    | 'storage-access'
    | 'profile-alarm'
    | 'content-script-reconciliation'
    | 'runtime-context-census'
    | 'package-integrity'
    | 'safe-mode-health';
  error: string;
}

export interface BackgroundInitializationResult {
  generation: number;
  reason: string;
  recoveredTransactions: number;
  discardedTransactions: number;
  storageAccess: readonly StorageAccessResult[];
  contentScript: ContentScriptReconciliation;
  runtimeContexts: RuntimeContextCensus;
  safeMode: SafeModeState;
  recoveredUpdate: boolean;
  packageIntegrity: PackageIntegrityResult;
  maintenanceFailures: readonly BackgroundMaintenanceFailure[];
  completedAt: string;
}

interface BackgroundContextInitializationResult {
  generation: number;
  reason: string;
  recoveredTransactions: number;
  discardedTransactions: number;
  recoveredUpdate: boolean;
  settings: Settings;
  safeMode: SafeModeState;
}

let initialization: Promise<BackgroundInitializationResult> | null = null;
let contextInitialization: Promise<BackgroundContextInitializationResult> | null = null;
let generation = 0;
let lastResult: BackgroundInitializationResult | null = null;

export function ensureBackgroundInitialized(
  reason = 'event-entry'
): Promise<BackgroundInitializationResult> {
  return initialization ?? startInitialization(reason, null);
}

export function ensureBackgroundContextInitialized(reason = 'context-entry'): Promise<void> {
  if (!contextInitialization) void startInitialization(reason, null);
  return contextInitialization!.then(() => undefined);
}

export function reinitializeBackground(reason: string): Promise<BackgroundInitializationResult> {
  return startInitialization(reason, initialization);
}

function startInitialization(
  reason: string,
  previous: Promise<BackgroundInitializationResult> | null
): Promise<BackgroundInitializationResult> {
  const currentGeneration = ++generation;
  const barrier = previous
    ? previous.then(
        () => undefined,
        () => undefined
      )
    : Promise.resolve();
  const critical = barrier.then(() => initializeContext(currentGeneration, reason));
  const started = critical.then((result) => initializeMaintenance(result));
  contextInitialization = critical;
  initialization = started;
  void started.then(
    (result) => {
      lastResult = result;
    },
    () => {
      if (initialization === started) initialization = null;
      if (contextInitialization === critical) contextInitialization = null;
    }
  );
  return started;
}

export function backgroundInitializationSnapshot(): BackgroundInitializationResult | null {
  return lastResult ? Object.freeze({ ...lastResult }) : null;
}

export function resetBackgroundInitializationForTests(): void {
  initialization = null;
  contextInitialization = null;
  generation = 0;
  lastResult = null;
}

async function initializeContext(
  currentGeneration: number,
  reason: string
): Promise<BackgroundContextInitializationResult> {
  try {
    const recovery = await recoverStorageTransactions();
    const update = await recoverPendingUpdate();
    const settings = await getSettings();
    const safeMode = await readSafeModeState();
    return Object.freeze({
      generation: currentGeneration,
      reason,
      recoveredTransactions: recovery.recovered,
      discardedTransactions: recovery.discarded,
      recoveredUpdate: update.recovered,
      settings,
      safeMode,
    });
  } catch (error) {
    await recordCriticalFailure(
      'background-context-initialization',
      error instanceof Error ? error.name || 'Error' : 'UnknownError'
    ).catch(() => undefined);
    throw error;
  }
}

async function initializeMaintenance(
  context: BackgroundContextInitializationResult
): Promise<BackgroundInitializationResult> {
  const failures: BackgroundMaintenanceFailure[] = [];
  const storageAccess = await maintenanceStage(
    'storage-access',
    () => restrictStorageToTrustedContexts(),
    Object.freeze([] as StorageAccessResult[]),
    failures
  );
  await maintenanceStage(
    'profile-alarm',
    () => ensureProfileAlarm(context.settings.remoteProfiles),
    undefined,
    failures
  );
  const contentScript = await maintenanceStage(
    'content-script-reconciliation',
    () => synchronizeRegisteredContentScript(),
    Object.freeze({
      status: 'unchanged' as const,
      generation: context.generation,
      origins: Object.freeze([] as string[]),
      fallback: false,
    }),
    failures
  );
  const runtimeContexts = await maintenanceStage(
    'runtime-context-census',
    () => reconcileRuntimeContexts(),
    Object.freeze({
      status: 'failed' as const,
      contexts: Object.freeze([]),
      observedAt: new Date().toISOString(),
    }),
    failures
  );
  const packageIntegrity = await maintenanceStage(
    'package-integrity',
    () => verifyCriticalPackageFiles(),
    Object.freeze({
      status: 'insufficient_evidence' as const,
      productVersion: PRODUCT_VERSION,
      target: null,
      checkedAt: new Date().toISOString(),
      files: Object.freeze([]),
    }),
    failures
  );
  const safeMode = await maintenanceStage(
    'safe-mode-health',
    () => recordHealthyInitialization(),
    context.safeMode,
    failures
  );
  return Object.freeze({
    generation: context.generation,
    reason: context.reason,
    recoveredTransactions: context.recoveredTransactions,
    discardedTransactions: context.discardedTransactions,
    storageAccess,
    contentScript,
    runtimeContexts,
    safeMode,
    recoveredUpdate: context.recoveredUpdate,
    packageIntegrity,
    maintenanceFailures: Object.freeze(failures.map((failure) => Object.freeze({ ...failure }))),
    completedAt: new Date().toISOString(),
  });
}

async function maintenanceStage<T>(
  stage: BackgroundMaintenanceFailure['stage'],
  task: () => Promise<T>,
  fallback: T,
  failures: BackgroundMaintenanceFailure[]
): Promise<T> {
  try {
    return await withTimeout(task(), stage);
  } catch (error) {
    failures.push({
      stage,
      error: safeErrorMessage(error),
    });
    return fallback;
  }
}

function withTimeout<T>(promise: Promise<T>, stage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Background maintenance stage timed out: ${stage}`));
    }, MAINTENANCE_STAGE_TIMEOUT_MS);
    void promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    );
  });
}

function safeErrorMessage(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  return value.slice(0, 512);
}
