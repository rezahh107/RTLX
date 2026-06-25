import {
  ExtensionRequestContractError,
  ExtensionResponseContractError,
  sendMessage,
} from '../../shared/api-adapter';
import { BUILD_INPUT_HASH } from '../../generated/build-fingerprint';
import { message } from '../../shared/messages';
import {
  messageContractProvenance,
  RESPONSE_CONTRACT_ERROR_CODE,
  type MessageContractProvenance,
} from '../../shared/response-contract';
import { mergeSettings } from '../../shared/settings';
import { routeFailureEvidenceExportResult } from './failure-export';
import { applyPopupLocale } from './locale';
import type {
  LatinFontPreference,
  PerSiteSettings,
  PersianFontPreference,
  Settings,
  SiteProfile,
} from '../../shared/types';

interface Context {
  tabId: number;
  hostname: string;
  url: URL;
  global: Settings;
  site: PerSiteSettings | undefined;
  profile: SiteProfile | null;
}

type BootstrapFailureCategory =
  | 'backgroundUnavailable'
  | 'backgroundInitializationFailed'
  | 'contextTimedOut'
  | 'invalidContextResponse'
  | 'requestContractViolation'
  | 'responseContractViolation'
  | 'settingsUnavailable';

type BootstrapFailureBoundary =
  | 'message_transport'
  | 'background_initialization'
  | 'background_response_contract'
  | 'request_validation'
  | 'consumer_validation'
  | 'consumer_schema';

interface BootstrapFailure {
  stage: 'REQUEST_CONTEXT';
  category: BootstrapFailureCategory;
  message: string;
  requestId: string | null;
  failureBoundary: BootstrapFailureBoundary;
  responseReceived: boolean;
  responseKeys: readonly string[];
  invalidPaths: readonly string[];
  invalidValueKinds: readonly string[];
  provenance: MessageContractProvenance;
}

const elements = {
  host: byId('site-host'),
  badge: byId('state-badge'),
  statusCard: document.querySelector<HTMLElement>('.status-card')!,
  statusMessage: byId('status-message'),
  activeToggle: byId('active-toggle') as HTMLInputElement,
  persianFont: byId('persian-font') as HTMLSelectElement,
  latinFont: byId('latin-font') as HTMLSelectElement,
  apply: byId('apply-current') as HTMLButtonElement,
  issue: byId('select-problem-area') as HTMLButtonElement,
  report: byId('download-page-debug-report') as HTMLButtonElement,
  reset: byId('reset-site') as HTMLButtonElement,
  toast: byId('status'),
};

let activeContext: Context | null = null;
let bootstrapFailure: BootstrapFailure | null = null;
let bootstrapRequestId: string | null = null;

localize();
elements.report.addEventListener('click', () => void downloadAvailableReport());
void initialize().catch((error: unknown) => handleInitializationFailure(error));

async function initialize(): Promise<void> {
  setSemanticState('neutral', i18n('statusChecking'));
  const tab = await activeTab().catch(() => null);
  if (!tab?.id || !tab.url) return setUnsupported('unsupportedPage');
  let url: URL;
  try {
    url = new URL(tab.url);
  } catch {
    return setUnsupported('unsupportedPage');
  }
  if (!['http:', 'https:'].includes(url.protocol)) return setUnsupported('failureRestrictedHint');

  const request = message('REQUEST_CONTEXT', {
    hostname: url.hostname,
    pathname: url.pathname,
  });
  bootstrapRequestId = request.requestId;
  const response = await sendMessage(request);
  if (!response.success) {
    const responseContractViolation = response.error.code === RESPONSE_CONTRACT_ERROR_CODE;
    return handleInitializationFailure(
      new Error(response.error.message),
      responseContractViolation
        ? 'responseContractViolation'
        : response.error.code === 'RTLX-INTERNAL'
          ? 'backgroundInitializationFailed'
          : 'settingsUnavailable',
      {
        requestId: request.requestId,
        failureBoundary: responseContractViolation
          ? 'background_response_contract'
          : 'background_initialization',
        responseReceived: true,
        responseKeys: ['error', 'requestId', 'success'],
        provenance: messageContractProvenance(
          'background',
          'background.runtime.onMessage:REQUEST_CONTEXT',
          'REQUEST_CONTEXT'
        ),
      }
    );
  }
  if (!isContextData(response.data))
    return handleInitializationFailure(
      new Error('Invalid context response'),
      'invalidContextResponse',
      {
        requestId: request.requestId,
        failureBoundary: 'consumer_schema',
        responseReceived: true,
        responseKeys: safeObjectKeys(response.data),
        provenance: messageContractProvenance(
          'background',
          'background.runtime.onMessage:REQUEST_CONTEXT',
          'REQUEST_CONTEXT'
        ),
      }
    );

  const context: Context = {
    tabId: tab.id,
    hostname: url.hostname.toLowerCase(),
    url,
    global: response.data.global,
    site: response.data.site,
    profile: response.data.profile ?? null,
  };
  activeContext = context;
  render(context);
  bind(context);
  await refreshState(context);
}

function handleInitializationFailure(
  error: unknown,
  category: BootstrapFailureCategory = classifyBootstrapFailure(error),
  details: Partial<
    Pick<
      BootstrapFailure,
      | 'requestId'
      | 'failureBoundary'
      | 'responseReceived'
      | 'responseKeys'
      | 'invalidPaths'
      | 'invalidValueKinds'
      | 'provenance'
    >
  > = {}
): void {
  const responseContractError = error instanceof ExtensionResponseContractError ? error : null;
  const requestContractError = error instanceof ExtensionRequestContractError ? error : null;
  bootstrapFailure = {
    stage: 'REQUEST_CONTEXT',
    category,
    message: error instanceof Error ? error.message : String(error),
    requestId:
      details.requestId ??
      responseContractError?.requestId ??
      requestContractError?.requestId ??
      bootstrapRequestId,
    failureBoundary:
      details.failureBoundary ??
      responseContractError?.failureBoundary ??
      requestContractError?.failureBoundary ??
      bootstrapFailureBoundary(category),
    responseReceived:
      details.responseReceived ??
      responseContractError?.responseReceived ??
      requestContractError?.responseReceived ??
      false,
    responseKeys: details.responseKeys ?? responseContractError?.issue.responseKeys ?? [],
    invalidPaths:
      details.invalidPaths ??
      responseContractError?.issue.invalidPaths ??
      requestContractError?.issue.invalidPaths ??
      [],
    invalidValueKinds:
      details.invalidValueKinds ??
      responseContractError?.issue.invalidValueKinds ??
      requestContractError?.issue.invalidValueKinds ??
      [],
    provenance:
      details.provenance ??
      responseContractError?.issue.provenance ??
      requestContractError?.issue.provenance ??
      bootstrapFailureProvenance(category),
  };
  const key = bootstrapFailureMessageKey(category);
  setUnsupported(key);
  setToast(i18n(key));
}

function classifyBootstrapFailure(error: unknown): BootstrapFailureCategory {
  if (error instanceof ExtensionRequestContractError) return 'requestContractViolation';
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (message.includes('timed out')) return 'contextTimedOut';
  if (
    message.includes('receiving end does not exist') ||
    message.includes('could not establish connection') ||
    message.includes('message port closed')
  )
    return 'backgroundUnavailable';
  if (message.includes('invalid extension response')) return 'invalidContextResponse';
  return 'backgroundInitializationFailed';
}

function bootstrapFailureMessageKey(category: BootstrapFailureCategory): string {
  switch (category) {
    case 'backgroundUnavailable':
      return 'statusBackgroundUnavailable';
    case 'contextTimedOut':
      return 'statusContextTimedOut';
    case 'invalidContextResponse':
      return 'statusInvalidContextResponse';
    case 'requestContractViolation':
      return 'statusRequestContractViolation';
    case 'responseContractViolation':
      return 'statusResponseContractViolation';
    case 'settingsUnavailable':
      return 'statusSettingsUnavailable';
    case 'backgroundInitializationFailed':
      return 'statusBackgroundInitializationFailed';
  }
}

function bootstrapFailureBoundary(category: BootstrapFailureCategory): BootstrapFailureBoundary {
  if (category === 'backgroundUnavailable' || category === 'contextTimedOut')
    return 'message_transport';
  if (category === 'invalidContextResponse') return 'consumer_validation';
  if (category === 'requestContractViolation') return 'request_validation';
  if (category === 'responseContractViolation') return 'background_response_contract';
  return 'background_initialization';
}

function bootstrapFailureProvenance(category: BootstrapFailureCategory): MessageContractProvenance {
  if (category === 'requestContractViolation')
    return messageContractProvenance(
      'popup',
      'popup.initialize:REQUEST_CONTEXT',
      'REQUEST_CONTEXT'
    );
  return messageContractProvenance(
    'background',
    'background.runtime.onMessage:REQUEST_CONTEXT',
    'REQUEST_CONTEXT'
  );
}

function safeObjectKeys(value: unknown): readonly string[] {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.freeze(Object.keys(value).sort())
    : Object.freeze([]);
}

function browserIdentity(): Readonly<{ family: string; majorVersion: string | null }> {
  const userAgent = navigator.userAgent;
  const firefox = userAgent.match(/Firefox\/(\d+)/u);
  if (firefox) return Object.freeze({ family: 'firefox', majorVersion: firefox[1] ?? null });
  const edge = userAgent.match(/Edg\/(\d+)/u);
  if (edge) return Object.freeze({ family: 'edge', majorVersion: edge[1] ?? null });
  const chromium = userAgent.match(/(?:Chrome|Chromium)\/(\d+)/u);
  if (chromium) return Object.freeze({ family: 'chromium', majorVersion: chromium[1] ?? null });
  return Object.freeze({ family: 'unknown', majorVersion: null });
}

async function downloadAvailableReport(): Promise<void> {
  if (activeContext) return downloadReport(activeContext);
  await downloadBootstrapFailureReport();
}

async function downloadBootstrapFailureReport(): Promise<void> {
  elements.report.disabled = true;
  try {
    const tab = await activeTab().catch(() => null);
    const page = pageIdentity(tab?.url);
    const manifest = chrome.runtime.getManifest();
    const content = `${JSON.stringify(
      {
        schemaVersion: '2.1.0',
        reportType: 'popup-bootstrap-failure',
        createdAt: new Date().toISOString(),
        extension: {
          id: chrome.runtime.id,
          version: manifest.version,
          manifestVersion: manifest.manifest_version,
          buildFingerprint: BUILD_INPUT_HASH,
          browser: browserIdentity(),
        },
        page,
        failure: bootstrapFailure ?? {
          stage: 'REQUEST_CONTEXT',
          category: 'backgroundInitializationFailed',
          message: 'Popup initialization has not completed',
          requestId: bootstrapRequestId,
          failureBoundary: 'background_initialization',
          responseReceived: false,
          responseKeys: [],
          invalidPaths: [],
          invalidValueKinds: [],
          provenance: messageContractProvenance(
            'popup',
            'popup.initialize:REQUEST_CONTEXT',
            'REQUEST_CONTEXT'
          ),
        },
      },
      null,
      2
    )}
`;
    const stamp = new Date().toISOString().replace(/[:.]/gu, '-');
    const hostname = page?.hostname ?? 'unknown-page';
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rtlx-bootstrap-${hostname.replace(/[^a-z0-9.-]/giu, '-')}-${stamp}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast(i18n('failureDownloaded'));
  } finally {
    elements.report.disabled = false;
  }
}

function pageIdentity(value: string | undefined): { protocol: string; hostname: string } | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return { protocol: url.protocol, hostname: url.hostname.toLowerCase() };
  } catch {
    return null;
  }
}

function render(context: Context): void {
  const effective = mergeSettings(context.global, context.site);
  elements.host.textContent = context.hostname;
  elements.activeToggle.checked = effective.enabled && effective.siteMode !== 'disabled';
  elements.persianFont.value = effective.persianFont;
  elements.latinFont.value =
    effective.latinFont === 'amazon-ember-local' ? 'amazon-ember-local' : 'inter';
}

function bind(context: Context): void {
  elements.activeToggle.addEventListener(
    'change',
    () => void setActivation(context, elements.activeToggle.checked)
  );
  elements.apply.addEventListener('click', () => void applyCurrent(context, true));
  elements.persianFont.addEventListener('change', () => void savePreferences(context, true));
  elements.latinFont.addEventListener('change', () => void savePreferences(context, true));
  elements.issue.addEventListener('click', () => void selectProblemArea(context));
  elements.reset.addEventListener('click', () => void resetSite(context));
}

async function setActivation(context: Context, enabled: boolean): Promise<void> {
  lockUi(true);
  try {
    if (enabled) {
      const granted = await ensurePermission(context.url, context.hostname);
      if (!granted) {
        elements.activeToggle.checked = false;
        setSemanticState('warning', i18n('statusPermissionRequired'));
        return setToast(i18n('permissionDenied'));
      }
      await savePreferences(context, false);
      await applyCurrent(context, false);
      setToast(i18n('siteEnabled'));
    } else {
      const effective = mergeSettings(context.global, context.site);
      const lastEnabledSiteMode =
        effective.siteMode === 'disabled' ? 'auto-safe' : effective.siteMode;
      await updateSite(context, { siteMode: 'disabled', lastEnabledSiteMode });
      await sendMessage(message('ROLLBACK', { tabId: context.tabId })).catch(() => undefined);
      setToast(i18n('siteDisabled'));
    }
  } finally {
    lockUi(false);
    render(context);
    await refreshState(context);
  }
}

async function savePreferences(context: Context, reapply: boolean): Promise<void> {
  const mode = 'auto-safe' as const;
  await updateSite(context, {
    siteMode: elements.activeToggle.checked ? mode : 'disabled',
    lastEnabledSiteMode: mode,
    directionCorrection: true,
    bidiIsolation: true,
    typography: true,
    listRepair: true,
    persianFont: elements.persianFont.value as PersianFontPreference,
    latinFont: elements.latinFont.value as LatinFontPreference,
  });
  if (reapply && elements.activeToggle.checked) await applyCurrent(context, false);
  render(context);
  await refreshState(context);
}

async function applyCurrent(context: Context, userInitiated: boolean): Promise<void> {
  lockUi(true);
  try {
    const granted = await ensurePermission(context.url, context.hostname);
    if (!granted) {
      elements.activeToggle.checked = false;
      setSemanticState('warning', i18n('statusPermissionRequired'));
      return setToast(i18n('permissionDenied'));
    }
    if (mergeSettings(context.global, context.site).siteMode === 'disabled') {
      elements.activeToggle.checked = true;
      await savePreferences(context, false);
    }
    const response = await sendMessage(message('APPLY_CURRENT_TAB', { tabId: context.tabId }));
    if (!response.success) return setToast(response.error.message);
    if (userInitiated) setToast(i18n('applied'));
    await waitForSettledRuntime(context.tabId, 2500);
  } finally {
    lockUi(false);
    await refreshState(context);
  }
}

async function selectProblemArea(context: Context): Promise<void> {
  lockUi(true);
  try {
    const granted = await ensurePermission(context.url, context.hostname);
    if (!granted) return setToast(i18n('permissionDenied'));
    await sendMessage(message('APPLY_CURRENT_TAB', { tabId: context.tabId })).catch(
      () => undefined
    );
    const response = await sendMessage(message('START_FAILURE_PICKER', { tabId: context.tabId }));
    if (!response.success) return setToast(response.error.message);
    setToast(i18n('problemAreaPickerStarted'));
    window.setTimeout(() => window.close(), 150);
  } finally {
    lockUi(false);
  }
}

async function downloadReport(context: Context): Promise<void> {
  lockUi(true);
  try {
    const granted = await ensurePermission(context.url, context.hostname);
    if (!granted) return setToast(i18n('permissionDenied'));
    const applied = await sendMessage(message('APPLY_CURRENT_TAB', { tabId: context.tabId }));
    if (!applied.success) return setToast(applied.error.message);
    await waitForSettledRuntime(context.tabId, 5000);
    const snapshot = await runtimeSnapshot(context.tabId);
    if (!snapshot) return setToast(i18n('statusStarting'));
    if (snapshot && captureRequiresVisibleTab(snapshot)) {
      setSemanticState('warning', i18n('statusCaptureRequiresVisibleTab'));
      setToast(i18n('captureRequiresVisibleTab'));
      return;
    }
    const response = await sendMessage(
      message('EXPORT_FAILURE_EVIDENCE', {
        tabId: context.tabId,
        expected: i18n('pageDebugExpected'),
        actual: i18n('pageDebugActual'),
      })
    );
    if (!response.success) return setToast(response.error.message);
    routeFailureEvidenceExportResult(response.data, {
      onBlocked: () => {
        setSemanticState('warning', i18n('statusCaptureRequiresVisibleTab'));
        setToast(i18n('captureRequiresVisibleTab'));
      },
      onExport: (data) => {
        const stamp = new Date().toISOString().replace(/[:.]/gu, '-');
        const blob = new Blob([data.content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `rtlx-report-${context.hostname.replace(/[^a-z0-9.-]/giu, '-')}-${stamp}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        setToast(i18n('failureDownloaded'));
      },
      onInvalid: () => setToast(i18n('loadFailed')),
    });
  } finally {
    lockUi(false);
    await refreshState(context);
  }
}

async function resetSite(context: Context): Promise<void> {
  if (!confirm(i18n('resetSiteConfirm'))) return;
  lockUi(true);
  try {
    await sendMessage(message('DELETE_USER_PROFILE', { hostname: context.hostname })).catch(
      () => undefined
    );
    context.site = {};
    await sendMessage(
      message('UPDATE_SITE_SETTINGS', {
        hostname: context.hostname,
        pathname: context.url.pathname,
        settings: {},
      })
    );
    await sendMessage(message('ROLLBACK', { tabId: context.tabId })).catch(() => undefined);
    setToast(i18n('resetSiteDone'));
  } finally {
    lockUi(false);
    render(context);
    await refreshState(context);
  }
}

async function refreshState(context: Context): Promise<void> {
  const permission = await containsOrigins([`${context.url.protocol}//${context.hostname}/*`]);
  const effective = mergeSettings(context.global, context.site);
  if (!permission) return setSemanticState('warning', i18n('statusPermissionRequired'));
  if (!effective.enabled || effective.siteMode === 'disabled')
    return setSemanticState('neutral', i18n('statusInactive'));

  const snapshot = await runtimeSnapshot(context.tabId);
  if (!snapshot) return setSemanticState('warning', i18n('statusStarting'));
  const readiness = nestedString(snapshot, ['captureReadiness', 'status']);
  const level = numberField(snapshot, 'degradationLevel');
  const pending = numberField(snapshot, 'pendingCandidates');
  const streamingPending = nestedBoolean(snapshot, ['streaming', 'pending']);
  if (captureRequiresVisibleTab(snapshot))
    return setSemanticState('warning', i18n('statusCaptureRequiresVisibleTab'));
  if (readiness === 'blocked' || level >= 4)
    return setSemanticState('danger', i18n('statusNeedsAttention'));
  if (readiness === 'partial' || level >= 2 || pending > 0 || streamingPending)
    return setSemanticState('warning', i18n('statusProcessing'));
  setSemanticState('success', i18n('statusHealthy'));
}

async function waitForSettledRuntime(tabId: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const snapshot = await runtimeSnapshot(tabId);
    if (snapshot) {
      const readiness = nestedString(snapshot, ['captureReadiness', 'status']);
      if (readiness === 'ready') return;
      const pending =
        numberField(snapshot, 'pendingCandidates') +
        nestedNumber(snapshot, ['queues', 'discoveryRoots']);
      const streamingPending = nestedBoolean(snapshot, ['streaming', 'pending']);
      if (readiness === null && pending === 0 && !streamingPending) return;
    }
    await delay(250);
  }
}

async function runtimeSnapshot(tabId: number): Promise<Record<string, unknown> | null> {
  const response = await sendMessage(message('GET_RUNTIME_SNAPSHOT', { tabId })).catch(() => null);
  if (!response?.success || !isRecord(response.data)) return null;
  const data = response.data;
  if (isRecord(data.data)) return data.data;
  return data;
}

async function updateSite(context: Context, patch: PerSiteSettings): Promise<void> {
  context.site = { ...(context.site ?? {}), ...patch };
  const response = await sendMessage(
    message('UPDATE_SITE_SETTINGS', {
      hostname: context.hostname,
      pathname: context.url.pathname,
      settings: context.site,
    })
  );
  if (!response.success) setToast(response.error.message);
}

function setSemanticState(kind: 'success' | 'warning' | 'danger' | 'neutral', text: string): void {
  elements.statusCard.classList.remove('success', 'warning', 'danger', 'neutral');
  elements.statusCard.classList.add(kind);
  elements.badge.className = `badge badge-${kind}`;
  elements.badge.textContent =
    kind === 'success'
      ? i18n('statusBadgeHealthy')
      : kind === 'warning'
        ? i18n('statusBadgeWarning')
        : kind === 'danger'
          ? i18n('statusBadgeError')
          : i18n('statusBadgeOff');
  elements.statusMessage.textContent = text;
}

function setUnsupported(key: string): void {
  elements.host.textContent = '—';
  elements.activeToggle.disabled = true;
  elements.apply.disabled = true;
  elements.report.disabled = !BOOTSTRAP_FAILURE_MESSAGE_KEYS.has(key);
  elements.reset.disabled = true;
  setSemanticState('neutral', i18n(key));
}

const BOOTSTRAP_FAILURE_MESSAGE_KEYS = new Set([
  'loadFailed',
  'statusBackgroundUnavailable',
  'statusBackgroundInitializationFailed',
  'statusContextTimedOut',
  'statusInvalidContextResponse',
  'statusRequestContractViolation',
  'statusResponseContractViolation',
  'statusSettingsUnavailable',
]);

function lockUi(locked: boolean): void {
  for (const element of [
    elements.activeToggle,
    elements.persianFont,
    elements.latinFont,
    elements.apply,
    elements.issue,
    elements.report,
    elements.reset,
  ])
    element.disabled = locked;
}

function siteOrigins(hostname: string): string[] {
  return [`http://${hostname}/*`, `https://${hostname}/*`];
}
async function ensurePermission(url: URL, hostname: string): Promise<boolean> {
  const origin = `${url.protocol}//${hostname}/*`;
  if (await containsOrigins([origin])) return true;
  return requestOrigins(siteOrigins(hostname));
}
function requestOrigins(origins: string[]): Promise<boolean> {
  return new Promise((resolve) => chrome.permissions.request({ origins }, resolve));
}
function containsOrigins(origins: string[]): Promise<boolean> {
  return new Promise((resolve) => chrome.permissions.contains({ origins }, resolve));
}
function activeTab(): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) =>
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
      tabs[0] ? resolve(tabs[0]) : reject(new Error('No active tab'))
    )
  );
}
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function isContextData(value: unknown): value is {
  global: Settings;
  site?: PerSiteSettings;
  profile?: SiteProfile | null;
} {
  return isRecord(value) && 'global' in value;
}
function numberField(value: Record<string, unknown>, key: string): number {
  return typeof value[key] === 'number' && Number.isFinite(value[key]) ? Number(value[key]) : 0;
}
function nestedNumber(value: Record<string, unknown>, path: string[]): number {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return 0;
    current = current[key];
  }
  return typeof current === 'number' && Number.isFinite(current) ? current : 0;
}
function nestedString(value: Record<string, unknown>, path: string[]): string | null {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return typeof current === 'string' ? current : null;
}

function captureRequiresVisibleTab(snapshot: Record<string, unknown>): boolean {
  const readiness = nestedString(snapshot, ['captureReadiness', 'status']);
  if (readiness !== 'blocked') return false;
  const reasonCodes = nestedStringArray(snapshot, ['captureReadiness', 'reasonCodes']);
  return reasonCodes.includes('document_hidden') || reasonCodes.includes('runtime_inactive');
}

function nestedStringArray(value: Record<string, unknown>, path: string[]): string[] {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return [];
    current = current[key];
  }
  return Array.isArray(current) && current.every((item) => typeof item === 'string') ? current : [];
}

function nestedBoolean(value: Record<string, unknown>, path: string[]): boolean {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return false;
    current = current[key];
  }
  return current === true;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element ${id}`);
  return element;
}
function localize(): void {
  applyPopupLocale(document.documentElement, chrome.i18n.getUILanguage());
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = element.dataset.i18n;
    if (key) element.textContent = i18n(key);
  }
}
function i18n(key: string): string {
  return chrome.i18n.getMessage(key) || key;
}
function setToast(value: string): void {
  elements.toast.textContent = value;
}
