import { storageGet } from '../shared/api-adapter';
import { isDiagnostic, sanitizeDiagnostic } from '../shared/diagnostics';
import type { Diagnostic } from '../shared/types';
import { runStorageTransaction } from './storage-transaction';

const KEY = 'rtlx:diagnostics:v1';
const MAX = 500;

export interface DiagnosticProvenance {
  tabId: number;
  frameId: number;
  browserDocumentId: string | null;
  contentDocumentInstanceId: string;
  documentGeneration: number;
}

export interface DiagnosticCorrelation extends DiagnosticProvenance {
  runtimeInstanceId: string | null;
}
let memory: Diagnostic[] = [];
let operation: Promise<void> = Promise.resolve();

export function appendDiagnostics(
  values: readonly Diagnostic[],
  persist: boolean,
  source: 'trusted-background' | 'untrusted-content' = 'trusted-background',
  provenance?: DiagnosticProvenance
): Promise<void> {
  const safe = values
    .filter(isDiagnostic)
    .map((item) => sanitizeDiagnostic(item, source))
    .map((item) => (provenance ? attachProvenance(item, provenance) : item));
  return serialized(async () => {
    const current = persist ? await readPersisted() : memory;
    memory = mergeDiagnostics(current, safe);
    if (persist) {
      await runStorageTransaction({
        kind: 'persist-diagnostics',
        setItems: { [KEY]: memory },
      });
    }
  });
}

export function exportDiagnostics(persist: boolean): Promise<readonly Diagnostic[]> {
  return serialized(async () => {
    if (persist) memory = mergeDiagnostics(await readPersisted(), []);
    return Object.freeze([...memory]);
  });
}

export function correlateDiagnostics(
  values: readonly Diagnostic[],
  correlation: DiagnosticCorrelation
): readonly Diagnostic[] {
  return Object.freeze(
    values.filter((diagnostic) => {
      const details = diagnostic.details;
      if (details.tabId !== correlation.tabId || details.frameId !== correlation.frameId)
        return false;
      if (
        details.contentDocumentInstanceId !== correlation.contentDocumentInstanceId ||
        details.documentGeneration !== correlation.documentGeneration
      )
        return false;
      if (
        correlation.browserDocumentId !== null &&
        details.browserDocumentId !== correlation.browserDocumentId
      )
        return false;
      if (
        correlation.runtimeInstanceId !== null &&
        details.runtimeInstanceId !== correlation.runtimeInstanceId
      )
        return false;
      return true;
    })
  );
}

export function clearMemoryDiagnostics(): void {
  memory = [];
}

export function clearDiagnostics(): Promise<void> {
  return serialized(async () => {
    memory = [];
    await runStorageTransaction({ kind: 'clear-diagnostics', removeKeys: [KEY] });
  });
}

async function readPersisted(): Promise<readonly Diagnostic[]> {
  const stored = await storageGet<unknown>('local', KEY);
  if (!Array.isArray(stored)) return [];
  return stored.filter(isDiagnostic).map((item) => sanitizeDiagnostic(item, 'untrusted-content'));
}

function attachProvenance(diagnostic: Diagnostic, provenance: DiagnosticProvenance): Diagnostic {
  return Object.freeze({
    ...diagnostic,
    details: Object.freeze({
      ...diagnostic.details,
      tabId: provenance.tabId,
      frameId: provenance.frameId,
      ...(provenance.browserDocumentId === null
        ? {}
        : { browserDocumentId: provenance.browserDocumentId }),
      contentDocumentInstanceId: provenance.contentDocumentInstanceId,
      documentGeneration: provenance.documentGeneration,
    }),
  });
}

function mergeDiagnostics(
  current: readonly Diagnostic[],
  incoming: readonly Diagnostic[]
): Diagnostic[] {
  const merged = new Map<string, Diagnostic>();
  for (const diagnostic of [...current, ...incoming]) {
    const key = stableDiagnosticKey(diagnostic);
    const existing = merged.get(key);
    merged.set(key, existing ? combine(existing, diagnostic) : diagnostic);
  }
  return [...merged.values()]
    .sort((a, b) => {
      const timestamp = a.timestamp.localeCompare(b.timestamp, 'en');
      return timestamp === 0
        ? stableDiagnosticKey(a).localeCompare(stableDiagnosticKey(b), 'en')
        : timestamp;
    })
    .slice(-MAX);
}

function combine(existing: Diagnostic, next: Diagnostic): Diagnostic {
  const occurrences = occurrenceCount(existing) + occurrenceCount(next);
  return Object.freeze({
    ...existing,
    details: Object.freeze({ ...withoutOccurrences(existing.details), occurrences }),
  });
}

function occurrenceCount(diagnostic: Diagnostic): number {
  const value = diagnostic.details.occurrences;
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 1;
}

function withoutOccurrences(
  details: Diagnostic['details']
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(Object.entries(details).filter(([key]) => key !== 'occurrences'));
}

function stableDiagnosticKey(diagnostic: Diagnostic): string {
  return JSON.stringify([
    diagnostic.code,
    diagnostic.severity,
    diagnostic.requirementId,
    diagnostic.scope,
    Object.entries(withoutOccurrences(diagnostic.details)).sort(([a], [b]) =>
      a.localeCompare(b, 'en')
    ),
  ]);
}

function serialized<T>(operationToRun: () => Promise<T>): Promise<T> {
  const result = operation.then(operationToRun, operationToRun);
  operation = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}
