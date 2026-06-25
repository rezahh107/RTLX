import { sendMessage } from '../shared/api-adapter';
import { enforceContentCommandResponse } from '../shared/response-contract';
import {
  configureMessageRuntimeEpoch,
  currentDocumentInstanceId,
  isCommandForCurrentDocument,
  isContentCommand,
  isRuntimeEpochRebindForCurrentDocument,
  message,
} from '../shared/messages';
import { mergeSettings } from '../shared/settings';
import type { PerSiteSettings, Settings, SiteProfile } from '../shared/types';
import { FrameRuntime } from './frame-runtime';
import { FailureEvidencePicker } from './failure-evidence-picker';

let runtime: FrameRuntime | null = null;
let failurePicker: FailureEvidencePicker | null = null;
let runtimeInitializationRetries = 0;
let runtimeRecoveryArmed = false;
let runtimeRecoveryPending = false;

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !isContentCommand(raw)) return false;
  if (raw.type === 'RTLX_REBIND_RUNTIME_EPOCH') {
    if (!isRuntimeEpochRebindForCurrentDocument(raw) || !raw.meta) return false;
    void rebindRuntimeEpoch(raw.meta.runtimeEpoch).then((rebound) =>
      sendContentResponse(
        sendResponse,
        rebound
          ? { ok: true, data: { documentInstanceId: currentDocumentInstanceId() } }
          : {
              ok: false,
              error: {
                code: 'RTLX-CONTENT-RUNTIME-EPOCH-REBIND-FAILED',
                message: 'Runtime epoch rebind failed',
              },
            }
      )
    );
    return true;
  }
  if (!isCommandForCurrentDocument(raw)) return false;
  if (raw.type === 'RTLX_ROLLBACK') {
    runtime?.rollback();
    runtime = null;
    sendContentResponse(sendResponse, { ok: true });
    return true;
  }
  if (raw.type === 'RTLX_PING') {
    sendContentResponse(sendResponse, { ok: true });
    return true;
  }
  if (raw.type === 'RTLX_REPROCESS') {
    void reloadRuntime().then(() => sendContentResponse(sendResponse, { ok: true }));
    return true;
  }
  if (raw.type === 'RTLX_START_FAILURE_PICKER') {
    if (!runtime) {
      sendContentResponse(sendResponse, {
        ok: false,
        error: { code: 'RTLX-CONTENT-RUNTIME-UNAVAILABLE', message: 'Runtime unavailable' },
      });
      return true;
    }
    failurePicker?.destroy();
    failurePicker = new FailureEvidencePicker((element, selector) =>
      runtime!.inspectElement(element, selector)
    );
    failurePicker.start();
    sendContentResponse(sendResponse, { ok: true });
    return true;
  }
  if (raw.type === 'RTLX_RUNTIME_SNAPSHOT') {
    void (async () => {
      sendContentResponse(sendResponse, {
        ok: true,
        data: runtime ? await runtime.captureSnapshot() : null,
      });
    })();
    return true;
  }
  if (raw.type === 'RTLX_RECORD_FIXTURE') {
    sendContentResponse(sendResponse, { ok: true, data: runtime?.recordFixture() ?? null });
    return true;
  }
  if (raw.type === 'RTLX_FAILURE_SNAPSHOT') {
    void (async () => {
      const snapshot = runtime ? await runtime.failureSnapshot() : null;
      sendContentResponse(sendResponse, {
        ok: true,
        data: Object.freeze({
          schemaVersion: '1.0.0',
          captureId: raw.captureId,
          capturedAt: new Date().toISOString(),
          documentInstanceId: currentDocumentInstanceId(),
          runtimeSnapshot: snapshot?.runtimeSnapshot ?? null,
          fixtureSummary: snapshot?.fixtureSummary ?? null,
        }),
      });
    })();
    return true;
  }
  return false;
});

function sendContentResponse(sendResponse: (response?: unknown) => void, response: unknown): void {
  sendResponse(enforceContentCommandResponse(response));
}

window.addEventListener(
  'pagehide',
  () => {
    failurePicker?.destroy();
    failurePicker = null;
    disarmRuntimeRecovery();
    runtime?.destroy();
    runtime = null;
  },
  { once: true }
);
void reloadRuntime();

async function rebindRuntimeEpoch(runtimeEpoch: string): Promise<boolean> {
  configureMessageRuntimeEpoch(runtimeEpoch);
  try {
    const response = await sendMessage(
      message('REQUEST_CONTEXT', {
        hostname: location.hostname.toLowerCase(),
        pathname: location.pathname,
      })
    );
    return response.success && isContext(response.data);
  } catch {
    return false;
  }
}

async function reloadRuntime(): Promise<void> {
  failurePicker?.destroy();
  failurePicker = null;
  runtime?.destroy();
  runtime = null;
  const context = await loadContext();
  if (!context) {
    if (runtimeInitializationRetries < 2) {
      runtimeInitializationRetries += 1;
      window.setTimeout(() => void reloadRuntime(), 1500);
      return;
    }
    runtimeInitializationRetries = 0;
    armRuntimeRecovery();
    return;
  }
  runtimeInitializationRetries = 0;
  disarmRuntimeRecovery();
  let settings = mergeSettings(context.global, context.site);
  if (
    !settings.enabled ||
    settings.siteMode === 'disabled' ||
    (context.temporaryDisableUntil !== null &&
      Date.parse(context.temporaryDisableUntil) > Date.now())
  )
    return;
  settings = applyProfileFeaturePrecedence(settings, context.site, context.profile);
  runtime = new FrameRuntime(
    settings,
    context.profile,
    context.site?.confirmedSuspiciousDirection === true,
    context.profileHash
  );
  await runtime.start();
}

function armRuntimeRecovery(): void {
  if (runtimeRecoveryArmed) return;
  runtimeRecoveryArmed = true;
  window.addEventListener('pageshow', handleRuntimeRecovery);
  document.addEventListener('visibilitychange', handleRuntimeRecovery);
}

function disarmRuntimeRecovery(): void {
  if (!runtimeRecoveryArmed) return;
  runtimeRecoveryArmed = false;
  window.removeEventListener('pageshow', handleRuntimeRecovery);
  document.removeEventListener('visibilitychange', handleRuntimeRecovery);
}

function handleRuntimeRecovery(): void {
  if (
    !runtimeRecoveryArmed ||
    runtimeRecoveryPending ||
    runtime !== null ||
    document.visibilityState === 'hidden'
  )
    return;
  runtimeRecoveryPending = true;
  runtimeInitializationRetries = 0;
  void reloadRuntime().finally(() => {
    runtimeRecoveryPending = false;
  });
}

async function loadContext(): Promise<{
  global: Settings;
  site: PerSiteSettings | undefined;
  profile: SiteProfile | null;
  profileHash: string | null;
  temporaryDisableUntil: string | null;
} | null> {
  const hostname = location.hostname.toLowerCase();
  try {
    const response = await sendMessage(
      message('REQUEST_CONTEXT', { hostname, pathname: location.pathname })
    );
    if (response.success && isContext(response.data)) {
      configureMessageRuntimeEpoch(response.data.runtimeEpoch);
      if (response.data.safeMode === true || response.data.updatePending === true) return null;
      return {
        global: response.data.global,
        site: response.data.site,
        profile: response.data.profile ?? null,
        profileHash:
          typeof response.data.profileHash === 'string' ? response.data.profileHash : null,
        temporaryDisableUntil: response.data.temporaryDisableUntil ?? null,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function isContext(value: unknown): value is {
  global: Settings;
  site?: PerSiteSettings;
  profile?: SiteProfile | null;
  profileHash?: string | null;
  temporaryDisableUntil?: string | null;
  runtimeEpoch: string;
  safeMode?: boolean;
  updatePending?: boolean;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'global' in value &&
    'runtimeEpoch' in value &&
    typeof value.runtimeEpoch === 'string'
  );
}

function applyProfileFeaturePrecedence(
  settings: Settings,
  site: PerSiteSettings | undefined,
  profile: SiteProfile | null
): Settings {
  if (!profile) return settings;
  return Object.freeze({
    ...settings,
    directionCorrection:
      site?.directionCorrection ?? (settings.directionCorrection && profile.features.direction),
    bidiIsolation: site?.bidiIsolation ?? (settings.bidiIsolation && profile.features.bidi),
    typography: site?.typography ?? (settings.typography && profile.features.typography),
  });
}
