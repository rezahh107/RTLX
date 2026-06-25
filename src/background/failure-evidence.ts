import { canonicalByteLength, canonicalize, toCanonicalJson } from '../shared/canonical-json';
import { LIMITS, PRODUCT_VERSION } from '../shared/constants';
import {
  classifyPageUrl,
  failureEvidenceExportBlockedReason,
  fitsCanonicalBudget,
  isFailureElementEvidence,
  isRecordedFixtureSummary,
  isRuntimeSnapshot,
  pathnameDepth,
  sanitizeFailureElementEvidenceForReport,
  sanitizeFailureObservation,
  selectFailureConclusion,
} from '../shared/failure-evidence';
import { storageGet, storageRemove, storageSet } from '../shared/api-adapter';
import type {
  FailureElementEvidence,
  FailureElementEvidenceForReport,
  FailureEvidenceDocumentProvenance,
  FailureEvidenceExportResult,
  FailureEvidenceReport,
  FailureEvidenceSection,
  FailureEvidenceSectionStatus,
  FailureProfileEvidence,
  RecordedFixtureSummary,
  RuntimeSnapshot,
  SiteProfile,
} from '../shared/types';
import { correlateDiagnostics, exportDiagnostics } from './diagnostics-store';
import {
  currentDocumentIdentityForTab,
  isCurrentDocumentIdentity,
  type DocumentIdentity,
} from './document-registry';
import { findActiveProfile } from './profile-repository';
import { getSettings, normalizedScopePath } from './settings-repository';
import { readSafeModeState } from './safe-mode';
import { sendTabCommandDetailed, type TabDeliveryStatus } from './tab-lifecycle-registry';
import { readUpdateState } from './update-coordinator';
import {
  analysisSummary,
  derivedReportDiagnostics,
  expectedObservation,
} from './failure-report-analysis';

const SELECTION_PREFIX = 'rtlx:failure-element:v1:';
const CONTENT_SCRIPT_ID = 'rtlx-v15-persistent';

interface MemorySelection {
  readonly hostname: string | null;
  readonly pathnameHash: string | null;
  readonly document: DocumentIdentity;
  readonly evidence: FailureElementEvidence;
}

interface StoredSelection {
  readonly schemaVersion: '1.1.0';
  readonly capturedAt: string;
  readonly hostname: string | null;
  readonly pathnameHash: string | null;
  readonly document: DocumentIdentity;
  readonly evidence: FailureElementEvidence;
}

interface ContentFailureSnapshot {
  readonly schemaVersion: '1.0.0';
  readonly captureId: string;
  readonly capturedAt: string;
  readonly documentInstanceId: string;
  readonly runtimeSnapshot: unknown;
  readonly fixtureSummary: unknown;
}

const memorySelections = new Map<number, MemorySelection>();

export async function clearFailureElementEvidence(tabId: number): Promise<void> {
  memorySelections.delete(tabId);
  await storageRemove('session', selectionKey(tabId)).catch(() => undefined);
}

export async function saveFailureElementEvidence(
  tabId: number,
  evidence: FailureElementEvidence,
  sourceUrl: string | undefined,
  document: DocumentIdentity
): Promise<void> {
  const classified = classifyPageUrl(sourceUrl);
  const profile = await activeProfile(classified.hostname, classified.pathname);
  const sourceScopePath = selectionScopePath(classified.pathname, profile);
  const sourcePathHash = sourceScopePath ? await sha256(sourceScopePath) : null;
  const selection = Object.freeze({
    hostname: classified.hostname,
    pathnameHash: sourcePathHash,
    document: Object.freeze({ ...document }),
    evidence,
  });
  memorySelections.set(tabId, selection);
  await storageSet('session', {
    [selectionKey(tabId)]: Object.freeze({
      schemaVersion: '1.1.0',
      capturedAt: new Date().toISOString(),
      hostname: classified.hostname,
      pathnameHash: sourcePathHash,
      document: selection.document,
      evidence,
    } satisfies StoredSelection),
  }).catch(() => undefined);
}

export async function exportFailureEvidence(input: {
  tabId: number;
  expected: string;
  actual: string;
}): Promise<FailureEvidenceExportResult> {
  const capturedAt = new Date().toISOString();
  const captureId = crypto.randomUUID();
  const tab = await getTab(input.tabId);
  const classified = classifyPageUrl(tab.url);
  const permission = await hostPermission(classified.scheme, classified.hostname);
  const eligibility =
    classified.status === 'eligible' && permission === 'not_granted'
      ? 'permission_missing'
      : classified.status;
  const contentScriptRegistered = await registeredContentScriptStatus();
  const pingResult =
    eligibility === 'eligible'
      ? await sendTabCommandDetailed(
          input.tabId,
          { type: 'RTLX_PING' },
          { timeoutMs: LIMITS.maxFailureEvidenceContentTimeoutMs }
        )
      : null;
  const pingOk =
    pingResult?.status === 'delivered' &&
    typeof pingResult.data === 'object' &&
    pingResult.data !== null &&
    'ok' in pingResult.data &&
    pingResult.data.ok === true;
  const contentDeliveryStatus = deliveryStatusForReport(eligibility, pingResult?.status, pingOk);
  const contentReachable = contentDeliveryStatus === 'delivered';
  const currentMainDocument = currentDocumentIdentityForTab(input.tabId, 0);
  const currentMainProvenance = documentProvenance(input.tabId, currentMainDocument, 'matched');
  const snapshotSectionReason = contentReachable
    ? 'RTLX-FEC-SECTION-NO-DATA'
    : deliveryReason(contentDeliveryStatus);
  const snapshot = contentReachable
    ? await captureFailureSnapshot(input.tabId, captureId, currentMainDocument)
    : null;
  const runtimeSnapshot = sectionFromContent<RuntimeSnapshot>(
    snapshot?.payload?.runtimeSnapshot ?? null,
    snapshot?.payload?.capturedAt ?? capturedAt,
    snapshot?.document ?? currentMainProvenance,
    snapshot?.status ?? (contentReachable ? 'no_data' : 'unavailable'),
    snapshot?.reasonCode ?? snapshotSectionReason,
    LIMITS.maxFailureEvidenceRuntimeSnapshotBytes,
    isRuntimeSnapshot
  );
  const blockedReason = failureEvidenceExportBlockedReason(runtimeSnapshot.data);
  if (blockedReason)
    return Object.freeze({
      status: 'blocked' as const,
      reasonCode: blockedReason,
    });

  const fixtureSummary = sectionFromContent<RecordedFixtureSummary>(
    snapshot?.payload?.fixtureSummary ?? null,
    snapshot?.payload?.capturedAt ?? capturedAt,
    snapshot?.document ?? currentMainProvenance,
    snapshot?.status ?? (contentReachable ? 'no_data' : 'unavailable'),
    snapshot?.reasonCode ?? snapshotSectionReason,
    LIMITS.maxFailureEvidenceFixtureSummaryBytes,
    isRecordedFixtureSummary
  );
  const pathnameHash = classified.pathname ? await sha256(classified.pathname) : null;
  const profile = await activeProfile(classified.hostname, classified.pathname);
  const selectionScope = selectionScopePath(classified.pathname, profile);
  const selectionPathHash = selectionScope ? await sha256(selectionScope) : null;
  const selectedElement = await readFailureElementEvidence(
    input.tabId,
    classified.hostname,
    selectionPathHash,
    capturedAt
  );
  const profileEvidenceData: FailureProfileEvidence = Object.freeze({
    profileId: profile?.profileId ?? runtimeSnapshot.data?.profileHealth.profileId ?? null,
    profileVersion:
      profile?.profileVersion ?? runtimeSnapshot.data?.profileHealth.profileVersion ?? null,
    profileSource: profile?.metadata.source ?? null,
    health: runtimeSnapshot.data?.profileHealth ?? null,
    selectedElementDecision: selectedElement.data?.classification ?? null,
  });
  const profileEvidence = sectionFromContent<FailureProfileEvidence>(
    profileEvidenceData,
    capturedAt,
    currentMainProvenance,
    'available',
    'RTLX-FEC-SECTION-AVAILABLE',
    LIMITS.maxFailureEvidenceProfileEvidenceBytes,
    isFailureProfileEvidence
  );
  const settings = await getSettings();
  const allDiagnostics = await exportDiagnostics(settings.diagnosticsPersistence);
  const correlatedDiagnostics = currentMainDocument
    ? correlateDiagnostics(allDiagnostics, {
        ...currentMainDocument,
        runtimeInstanceId: runtimeSnapshot.data?.runtimeInstanceId ?? null,
      })
    : Object.freeze([]);
  const reportDiagnostics = derivedReportDiagnostics(
    profileEvidence.data?.health?.status ?? null,
    selectedElement.reasonCode,
    capturedAt,
    runtimeSnapshot.data?.captureReadiness.status ?? null
  );
  const diagnostics = Object.freeze(
    [...correlatedDiagnostics, ...reportDiagnostics].slice(-LIMITS.maxFailureEvidenceDiagnostics)
  );
  const [platform, safeMode, updateState] = await Promise.all([
    platformInfo(),
    readSafeModeState(),
    readUpdateState(),
  ]);
  const conclusion = selectFailureConclusion({
    eligibility,
    contentScriptRegistered,
    contentReachable,
    contentDeliveryStatus,
    safeModeActive: safeMode.active,
    runtimeState: runtimeSnapshot.data?.runtimeState ?? null,
    degradationLevel: runtimeSnapshot.data?.degradationLevel ?? null,
    profileId: profileEvidence.data?.profileId ?? null,
    profileHealthStatus: profileEvidence.data?.health?.status ?? null,
    selected: selectedElement.data,
    candidateCount: fixtureSummary.data?.counts.candidates ?? null,
  });
  const unsignedReport: FailureEvidenceReport = Object.freeze({
    schemaVersion: '1.2.0',
    productVersion: PRODUCT_VERSION,
    capturedAt,
    captureId,
    captureMode: 'user_initiated',
    canonicalizationVersion: '1.0.0',
    hashAlgorithm: 'sha256',
    reportHash: null,
    privacy: Object.freeze({
      pageTextIncluded: false,
      fullUrlIncluded: false,
      queryIncluded: false,
      fragmentIncluded: false,
      formValuesIncluded: false,
      cookiesIncluded: false,
      localStorageIncluded: false,
      networkCaptureIncluded: false,
      screenshotIncluded: false,
      automaticUpload: false,
    }),
    location: Object.freeze({
      scheme: classified.scheme,
      hostname: classified.hostname,
      pathnameDepth: pathnameDepth(classified.pathname),
      pathnameHash,
    }),
    pageEligibility: Object.freeze({
      status: eligibility,
      reasonCode:
        eligibility === 'permission_missing'
          ? 'RTLX-CAPTURE-PERMISSION-MISSING'
          : classified.reasonCode,
      hostPermission: permission,
      contentScriptRegistered,
      contentScriptReachable: contentReachable,
      contentDeliveryStatus,
    }),
    environment: Object.freeze({
      extensionId: chrome.runtime.id,
      extensionVersion: chrome.runtime.getManifest().version,
      ...browserIdentity(navigator.userAgent),
      platform: platform.os,
      architecture: platform.arch,
    }),
    operationalState: Object.freeze({
      safeModeActive: safeMode.active,
      updatePending: updateState !== null,
    }),
    runtimeSnapshot,
    fixtureSummary,
    profileEvidence,
    selectedElement,
    diagnostics,
    analysis: analysisSummary(runtimeSnapshot, profileEvidence, selectedElement),
    userObservation: Object.freeze({
      expected: expectedObservation(
        runtimeSnapshot.data?.pageDebug.effectiveSettings ?? null,
        runtimeSnapshot.data?.pageDebug.buildFlavor ?? null
      ),
      actual: sanitizeFailureObservation(input.actual),
    }),
    conclusion: Object.freeze(conclusion),
  });
  const boundedUnsignedReport = enforceReportBudget(unsignedReport);
  const reportHash = await sha256Canonical(boundedUnsignedReport);
  const report: FailureEvidenceReport = Object.freeze({
    ...boundedUnsignedReport,
    reportHash,
  });
  return Object.freeze({ content: canonicalize(toCanonicalJson(report)), report });
}

async function readFailureElementEvidence(
  tabId: number,
  hostname: string | null,
  pathnameHash: string | null,
  capturedAt: string
): Promise<FailureEvidenceSection<FailureElementEvidenceForReport>> {
  const stored = await storageGet<unknown>('session', selectionKey(tabId)).catch(() => undefined);
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    const record = stored as Record<string, unknown>;
    if (isStoredSelection(record))
      return selectionToSection(record, tabId, hostname, pathnameHash, capturedAt, true);
    await clearFailureElementEvidence(tabId);
    return emptySelectedSection(
      tabId,
      capturedAt,
      'no_data',
      'RTLX-FEC-SELECTION-LEGACY-CLEARED',
      documentProvenance(tabId, currentDocumentIdentityForTab(tabId, 0), 'matched')
    );
  }
  const memory = memorySelections.get(tabId);
  if (!memory)
    return emptySelectedSection(tabId, capturedAt, 'no_data', 'RTLX-FEC-SELECTION-ABSENT');
  return selectionToSection(memory, tabId, hostname, pathnameHash, capturedAt, false);
}

function selectionToSection(
  selection: Readonly<{
    hostname: string | null;
    pathnameHash: string | null;
    document: DocumentIdentity;
    evidence: FailureElementEvidence;
  }>,
  tabId: number,
  hostname: string | null,
  pathnameHash: string | null,
  capturedAt: string,
  clearOnMismatch: boolean
): FailureEvidenceSection<FailureElementEvidenceForReport> {
  const locationMatches =
    selection.hostname === hostname && selection.pathnameHash === pathnameHash;
  const documentMatches = isCurrentDocumentIdentity(selection.document);
  if (!locationMatches || !documentMatches) {
    if (clearOnMismatch) void clearFailureElementEvidence(tabId);
    else memorySelections.delete(tabId);
    return emptySelectedSection(
      tabId,
      capturedAt,
      'no_data',
      locationMatches
        ? 'RTLX-FEC-SELECTION-STALE-DOCUMENT-CLEARED'
        : 'RTLX-FEC-SELECTION-LOCATION-MISMATCH-CLEARED',
      documentProvenance(tabId, currentDocumentIdentityForTab(tabId, 0), 'matched')
    );
  }
  return sectionFromContent<FailureElementEvidenceForReport>(
    sanitizeFailureElementEvidenceForReport(selection.evidence),
    capturedAt,
    documentProvenance(tabId, selection.document, 'matched'),
    'available',
    'RTLX-FEC-SECTION-AVAILABLE',
    LIMITS.maxFailureEvidenceSelectedElementBytes,
    isFailureElementEvidenceForReport
  );
}

async function captureFailureSnapshot(
  tabId: number,
  captureId: string,
  expectedDocument: DocumentIdentity | null
): Promise<{
  readonly status: FailureEvidenceSectionStatus;
  readonly reasonCode: string;
  readonly document: FailureEvidenceDocumentProvenance;
  readonly payload: ContentFailureSnapshot | null;
}> {
  const result = await sendTabCommandDetailed(
    tabId,
    { type: 'RTLX_FAILURE_SNAPSHOT', captureId },
    { expectResponse: true, timeoutMs: LIMITS.maxFailureEvidenceContentTimeoutMs }
  );
  if (result.status !== 'delivered')
    return Object.freeze({
      status: result.status === 'timeout' ? 'timeout' : 'unavailable',
      reasonCode: result.reasonCode,
      document: documentProvenance(tabId, expectedDocument, 'unavailable'),
      payload: null,
    });
  if (!isContentFailureSnapshot(result.data) || result.data.captureId !== captureId)
    return Object.freeze({
      status: 'invalid_response',
      reasonCode: 'RTLX-FEC-SNAPSHOT-INVALID',
      document: documentProvenance(tabId, expectedDocument, 'mismatch'),
      payload: null,
    });
  const matched =
    expectedDocument === null ||
    expectedDocument.contentDocumentInstanceId === result.data.documentInstanceId;
  return Object.freeze({
    status: matched ? 'available' : 'mixed_document',
    reasonCode: matched ? 'RTLX-FEC-SECTION-AVAILABLE' : 'RTLX-FEC-SNAPSHOT-MIXED-DOCUMENT',
    document: documentProvenance(tabId, expectedDocument, matched ? 'matched' : 'mismatch'),
    payload: result.data,
  });
}

function sectionFromContent<T>(
  value: unknown,
  capturedAt: string,
  document: FailureEvidenceDocumentProvenance,
  inputStatus: FailureEvidenceSectionStatus,
  reasonCode: string,
  maxBytes: number,
  validator: (value: unknown) => value is T
): FailureEvidenceSection<T> {
  if (inputStatus !== 'available')
    return makeSection<T>(inputStatus, reasonCode, capturedAt, document, null);
  if (value === null)
    return makeSection<T>('no_data', 'RTLX-FEC-SECTION-NO-DATA', capturedAt, document, null);
  if (!validator(value))
    return makeSection<T>(
      'invalid_response',
      'RTLX-FEC-SECTION-INVALID',
      capturedAt,
      document,
      null
    );
  if (!fitsCanonicalBudget(value, maxBytes))
    return makeSection<T>('oversized', 'RTLX-FEC-SECTION-OVERSIZED', capturedAt, document, null);
  return makeSection('available', 'RTLX-FEC-SECTION-AVAILABLE', capturedAt, document, value);
}

function makeSection<T>(
  status: FailureEvidenceSectionStatus,
  reasonCode: string,
  capturedAt: string,
  document: FailureEvidenceDocumentProvenance,
  data: T | null
): FailureEvidenceSection<T> {
  return Object.freeze({
    schemaVersion: '1.0.0',
    status,
    reasonCode,
    capturedAt,
    document,
    byteLength: data === null ? 0 : canonicalByteLength(data),
    data,
  });
}

function emptySelectedSection(
  tabId: number,
  capturedAt: string,
  status: FailureEvidenceSectionStatus,
  reasonCode: string,
  document: FailureEvidenceDocumentProvenance = documentProvenance(tabId, null, 'unavailable')
): FailureEvidenceSection<FailureElementEvidenceForReport> {
  return makeSection<FailureElementEvidenceForReport>(
    status,
    reasonCode,
    capturedAt,
    document,
    null
  );
}

function enforceReportBudget(report: FailureEvidenceReport): FailureEvidenceReport {
  if (canonicalByteLength(report) <= LIMITS.maxFailureEvidenceBytes) return report;
  const reduced = Object.freeze({
    ...report,
    runtimeSnapshot: makeSection<RuntimeSnapshot>(
      'oversized',
      'RTLX-FEC-REPORT-BUDGET-RUNTIME-DROPPED',
      report.capturedAt,
      report.runtimeSnapshot.document,
      null
    ),
    fixtureSummary: makeSection<RecordedFixtureSummary>(
      'oversized',
      'RTLX-FEC-REPORT-BUDGET-FIXTURE-DROPPED',
      report.capturedAt,
      report.fixtureSummary.document,
      null
    ),
  });
  if (canonicalByteLength(reduced) <= LIMITS.maxFailureEvidenceBytes) return reduced;
  const minimal = Object.freeze({
    ...reduced,
    selectedElement: makeSection<FailureElementEvidenceForReport>(
      'oversized',
      'RTLX-FEC-REPORT-BUDGET-SELECTION-DROPPED',
      report.capturedAt,
      report.selectedElement.document,
      null
    ),
    profileEvidence: makeSection<FailureProfileEvidence>(
      'oversized',
      'RTLX-FEC-REPORT-BUDGET-PROFILE-DROPPED',
      report.capturedAt,
      report.profileEvidence.document,
      null
    ),
    diagnostics: Object.freeze([]),
  });
  if (canonicalByteLength(minimal) <= LIMITS.maxFailureEvidenceBytes) return minimal;
  throw new Error('RTLX-FEC-REPORT-BUDGET-EXCEEDED');
}

function deliveryStatusForReport(
  eligibility: 'eligible' | 'browser_restricted' | 'unsupported_scheme' | 'permission_missing',
  status: TabDeliveryStatus | undefined,
  pingOk: boolean
): FailureEvidenceReport['pageEligibility']['contentDeliveryStatus'] {
  if (eligibility !== 'eligible') return 'not_applicable';
  if (status === undefined) return 'unreachable';
  if (status === 'delivered') return pingOk ? 'delivered' : 'invalid_response';
  return status;
}

function deliveryReason(
  status: FailureEvidenceReport['pageEligibility']['contentDeliveryStatus']
): string {
  switch (status) {
    case 'delivered':
      return 'RTLX-FEC-SECTION-AVAILABLE';
    case 'discarded':
      return 'RTLX-CAPTURE-TAB-DISCARDED';
    case 'loading':
      return 'RTLX-CAPTURE-TAB-LOADING';
    case 'frozen':
      return 'RTLX-CAPTURE-TAB-FROZEN';
    case 'unreachable':
      return 'RTLX-CAPTURE-CONTENT-UNREACHABLE';
    case 'timeout':
      return 'RTLX-CAPTURE-CONTENT-TIMEOUT';
    case 'invalid_response':
      return 'RTLX-CAPTURE-CONTENT-INVALID-RESPONSE';
    case 'missing_tab':
      return 'RTLX-CAPTURE-TAB-MISSING';
    case 'not_applicable':
      return 'RTLX-CAPTURE-NOT-APPLICABLE';
  }
}

function documentProvenance(
  tabId: number,
  identity: DocumentIdentity | null,
  provenanceStatus: FailureEvidenceDocumentProvenance['provenanceStatus']
): FailureEvidenceDocumentProvenance {
  return Object.freeze({
    tabId,
    frameId: identity?.frameId ?? null,
    browserDocumentId: identity?.browserDocumentId ?? null,
    contentDocumentInstanceId: identity?.contentDocumentInstanceId ?? null,
    documentGeneration: identity?.documentGeneration ?? null,
    lifecycle: identity?.lifecycle ?? null,
    provenanceStatus: identity ? provenanceStatus : 'unavailable',
  });
}

function isContentFailureSnapshot(value: unknown): value is ContentFailureSnapshot {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === '1.0.0' &&
    typeof record.captureId === 'string' &&
    typeof record.capturedAt === 'string' &&
    Number.isFinite(Date.parse(record.capturedAt)) &&
    typeof record.documentInstanceId === 'string' &&
    'runtimeSnapshot' in record &&
    'fixtureSummary' in record
  );
}

function isStoredSelection(value: unknown): value is StoredSelection {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === '1.1.0' &&
    typeof record.capturedAt === 'string' &&
    (record.hostname === null || typeof record.hostname === 'string') &&
    (record.pathnameHash === null || typeof record.pathnameHash === 'string') &&
    isDocumentIdentity(record.document) &&
    isFailureElementEvidence(record.evidence)
  );
}

function isDocumentIdentity(value: unknown): value is DocumentIdentity {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.tabId === 'number' &&
    Number.isInteger(record.tabId) &&
    typeof record.frameId === 'number' &&
    Number.isInteger(record.frameId) &&
    (record.browserDocumentId === null || typeof record.browserDocumentId === 'string') &&
    typeof record.contentDocumentInstanceId === 'string' &&
    typeof record.documentGeneration === 'number' &&
    Number.isInteger(record.documentGeneration) &&
    typeof record.lifecycle === 'string' &&
    typeof record.registeredAt === 'string' &&
    typeof record.lastSeenAt === 'string'
  );
}

function isFailureElementEvidenceForReport(
  value: unknown
): value is FailureElementEvidenceForReport {
  if (!isFailureElementEvidence(value)) return false;
  const record = value as FailureElementEvidenceForReport;
  return (
    typeof record.selectorPrivacy === 'object' &&
    record.selectorPrivacy !== null &&
    ['preserved', 'redacted', 'not_provided'].includes(record.selectorPrivacy.status) &&
    typeof record.selectorPrivacy.reasonCode === 'string' &&
    ['none', 'email_like', 'account_like', 'long_numeric', 'unknown_sensitive'].includes(
      record.selectorPrivacy.tokenShape
    )
  );
}

function isFailureProfileEvidence(value: unknown): value is FailureProfileEvidence {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.profileId === null || typeof record.profileId === 'string') &&
    (record.profileVersion === null || typeof record.profileVersion === 'number') &&
    (record.profileSource === null || typeof record.profileSource === 'string') &&
    (record.health === null || typeof record.health === 'object') &&
    (record.selectedElementDecision === null || typeof record.selectedElementDecision === 'object')
  );
}

function selectionScopePath(pathname: string | null, profile: SiteProfile | null): string | null {
  if (pathname === null) return null;
  if (profile?.scopePolicy.mode === 'site') return '/';
  if (profile?.scopePolicy.mode === 'conversation')
    return normalizedScopePath(pathname, profile.scopePolicy.pathDepth);
  return pathname;
}

async function activeProfile(
  hostname: string | null,
  pathname: string | null
): Promise<SiteProfile | null> {
  if (!hostname || !pathname) return null;
  return findActiveProfile(hostname, pathname).catch(() => null);
}

async function hostPermission(
  scheme: string,
  hostname: string | null
): Promise<'granted' | 'not_granted' | 'not_applicable' | 'unknown'> {
  if (!hostname || (scheme !== 'http' && scheme !== 'https')) return 'not_applicable';
  try {
    const granted = await new Promise<boolean>((resolve, reject) =>
      chrome.permissions.contains({ origins: [`${scheme}://${hostname}/*`] }, (value) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(value);
      })
    );
    return granted ? 'granted' : 'not_granted';
  } catch {
    return 'unknown';
  }
}

async function registeredContentScriptStatus(): Promise<boolean | null> {
  try {
    const scripts = await new Promise<chrome.scripting.RegisteredContentScript[]>(
      (resolve, reject) =>
        chrome.scripting.getRegisteredContentScripts({ ids: [CONTENT_SCRIPT_ID] }, (value) => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve(value);
        })
    );
    return scripts.length > 0;
  } catch {
    return null;
  }
}

function getTab(tabId: number): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) =>
    chrome.tabs.get(tabId, (tab) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(tab);
    })
  );
}

function platformInfo(): Promise<chrome.runtime.PlatformInfo> {
  return new Promise((resolve) => chrome.runtime.getPlatformInfo(resolve));
}

function browserIdentity(userAgent: string): {
  browserFamily: string;
  browserVersion: string | null;
} {
  for (const [browserFamily, token] of [
    ['edge', 'Edg/'],
    ['firefox', 'Firefox/'],
    ['chromium', 'Chrome/'],
  ] as const) {
    const browserVersion = versionAfterToken(userAgent, token);
    if (browserVersion) return { browserFamily, browserVersion };
  }
  return { browserFamily: 'unknown', browserVersion: null };
}

function versionAfterToken(userAgent: string, token: string): string | null {
  const start = userAgent.indexOf(token);
  if (start < 0) return null;
  const valueStart = start + token.length;
  let end = valueStart;
  while (end < userAgent.length) {
    const code = userAgent.charCodeAt(end);
    const digit = code >= 48 && code <= 57;
    if (!digit && userAgent.charAt(end) !== '.') break;
    end += 1;
  }
  return end > valueStart ? userAgent.slice(valueStart, end) : null;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return `sha256:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`;
}

async function sha256Canonical(value: FailureEvidenceReport): Promise<string> {
  const canonical = canonicalize(toCanonicalJson(value));
  return sha256(canonical);
}

function selectionKey(tabId: number): string {
  return `${SELECTION_PREFIX}${tabId}`;
}
