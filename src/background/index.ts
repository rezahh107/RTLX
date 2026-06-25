import {
  canonicalByteLength,
  canonicalize,
  sha256Hex,
  toCanonicalJson,
} from '../shared/canonical-json';
import { enforceResponseMessage, messageContractProvenance } from '../shared/response-contract';
import { LIMITS, PROFILE_UPDATE_ALARM } from '../shared/constants';
import { isRequestMessage, type ResponseMessage } from '../shared/messages';
import { detectSupportedSite } from '../shared/site-detector';
import { validateSettings } from '../shared/settings';
import type { EnabledSiteMode } from '../shared/types';
import { appendDiagnostics } from './diagnostics-store';
import {
  clearFailureElementEvidence,
  exportFailureEvidence,
  saveFailureElementEvidence,
} from './failure-evidence';
import { ensureProfileAlarm } from './alarm-manager';
import { runWithAlarmLease } from './alarm-lease';
import {
  BACKGROUND_RUNTIME_EPOCH,
  type DocumentIdentity,
  registerContentDocument,
  validateContentDocument,
} from './document-registry';
import {
  ensureBackgroundContextInitialized,
  ensureBackgroundInitialized,
  reinitializeBackground,
} from './lifecycle';
import { isAuthorizedMessage, safeHostname, senderHostname } from './message-authorization';
import {
  ensureCurrentTabRuntime,
  injectCurrentTab,
  synchronizeRegisteredContentScript,
} from './permission-manager';
import { runBackgroundTask } from './runtime-status';
import {
  broadcastTabCommand,
  observeTabActivated,
  observeTabRemoved,
  observeTabReplaced,
  observeTabUpdated,
  sendTabCommand,
} from './tab-lifecycle-registry';
import { updateRemoteProfiles } from './profile-updater';
import { readSafeModeState } from './safe-mode';
import { observeSyncStorageChanges } from './sync-coordinator';
import { recoverStorageTransactions } from './storage-transaction';
import { beginUpdateQuiescence, isUpdateQuiescing } from './update-coordinator';
import { findActiveProfile } from './profile-repository';
import { deleteUserProfile } from './user-profile-repository';
import {
  getTemporaryDisable,
  resetTemporaryDisable,
  setTemporaryDisable,
} from './temporary-disable-store';
import {
  getScopedSettings,
  getSettings,
  getSiteSettings,
  setScopedSettings,
  setSettings,
  setSiteSettings,
} from './settings-repository';

chrome.runtime.onInstalled.addListener((details) =>
  launchBackgroundTask(
    'initialize:onInstalled',
    async () => {
      await reinitializeBackground(`onInstalled:${details.reason}`);
    },
    2
  )
);
chrome.runtime.onStartup.addListener(() =>
  launchBackgroundTask(
    'initialize:onStartup',
    async () => {
      await reinitializeBackground('onStartup');
    },
    2
  )
);
chrome.permissions.onAdded.addListener(() =>
  launchBackgroundTask(
    'permissions:onAdded',
    async () => {
      await ensureBackgroundInitialized('permissions:onAdded');
      await synchronizeRegisteredContentScript();
    },
    2
  )
);
chrome.permissions.onRemoved.addListener(() =>
  launchBackgroundTask(
    'permissions:onRemoved',
    async () => {
      await ensureBackgroundInitialized('permissions:onRemoved');
      await synchronizeRegisteredContentScript();
      await broadcastTabCommand({ type: 'RTLX_ROLLBACK' });
    },
    2
  )
);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PROFILE_UPDATE_ALARM)
    launchBackgroundTask('alarm:profile-update', async () => {
      await ensureBackgroundInitialized('alarm:profile-update');
      await handleProfileAlarm();
    });
});
if (chrome.commands?.onCommand)
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-current-site')
      launchBackgroundTask('command:toggle-current-site', async () => {
        await ensureBackgroundInitialized('command:toggle-current-site');
        await toggleActiveSiteFromCommand();
      });
  });
if (chrome.runtime.onUpdateAvailable)
  chrome.runtime.onUpdateAvailable.addListener((details) =>
    launchBackgroundTask('runtime:onUpdateAvailable', async () => {
      await beginUpdateQuiescence(details.version, {
        rollbackActiveDocuments: () => broadcastTabCommand({ type: 'RTLX_ROLLBACK' }),
        recoverTransactions: () => recoverStorageTransactions(),
        reload: () => chrome.runtime.reload(),
      });
    })
  );
chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  const expectedRequestId = requestId(raw);
  const messageType = diagnosticMessageType(raw);
  const provenance = messageContractProvenance(
    'background',
    `background.runtime.onMessage:${messageType}`,
    messageType
  );
  void handle(raw, sender).then(
    (response) => sendResponse(enforceResponseMessage(response, expectedRequestId, provenance)),
    (error: unknown) =>
      sendResponse(
        enforceResponseMessage(
          failure(
            expectedRequestId,
            'RTLX-INTERNAL',
            error instanceof Error ? error.message.slice(0, 512) : 'Unknown error'
          ),
          expectedRequestId,
          provenance
        )
      )
  );
  return true;
});
chrome.tabs.onUpdated.addListener(observeTabUpdated);
chrome.tabs.onActivated.addListener((activeInfo) => observeTabActivated(activeInfo.tabId));
chrome.tabs.onRemoved.addListener((tabId) => {
  observeTabRemoved(tabId);
  void clearFailureElementEvidence(tabId);
});
chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) =>
  observeTabReplaced(addedTabId, removedTabId)
);
chrome.storage.onChanged.addListener(observeSyncStorageChanges);

launchBackgroundTask(
  'initialize:module-load',
  async () => {
    await ensureBackgroundInitialized('module-load');
  },
  2
);

async function handle(
  raw: unknown,
  sender: chrome.runtime.MessageSender
): Promise<ResponseMessage> {
  let size = Number.POSITIVE_INFINITY;
  try {
    size = canonicalByteLength(raw);
  } catch {
    // Invalid non-JSON messages are rejected below.
  }
  if (size > LIMITS.maxMessageBytes || !isRequestMessage(raw))
    return failure(requestId(raw), 'RTLX-MESSAGE-001', 'Invalid message');
  if (sender.id !== chrome.runtime.id)
    return failure(raw.requestId, 'RTLX-MESSAGE-002', 'Invalid sender');
  if (!isAuthorizedMessage(raw, sender, chrome.runtime.getURL('')))
    return failure(raw.requestId, 'RTLX-MESSAGE-004', 'Sender context is not authorized');
  if (raw.type === 'REQUEST_CONTEXT')
    await ensureBackgroundContextInitialized('runtime:request-context');
  else await ensureBackgroundInitialized('runtime:onMessage');
  const safeMode = await readSafeModeState();
  if (isMutatingMessage(raw.type) && isUpdateQuiescing())
    return failure(raw.requestId, 'RTLX-UPDATE-PENDING', 'Extension update is pending');
  if (isMutatingMessage(raw.type) && safeMode.active)
    return failure(raw.requestId, 'RTLX-SAFE-MODE', 'Extension is in safe mode');
  let contentDocumentIdentity: DocumentIdentity | null = null;
  if (sender.tab?.id !== undefined && isContentBoundMessage(raw.type)) {
    const validation =
      raw.type === 'REQUEST_CONTEXT'
        ? registerContentDocument(raw, sender)
        : validateContentDocument(raw, sender);
    if (!validation.ok) return failure(raw.requestId, validation.code, validation.reason);
    contentDocumentIdentity = validation.identity;
  }
  switch (raw.type) {
    case 'REQUEST_CONTEXT': {
      const global = await getSettings();
      const internal = raw.payload.hostname.endsWith('.internal');
      const profile = internal
        ? null
        : await findActiveProfile(raw.payload.hostname, raw.payload.pathname).catch(() => null);
      const profileHash = profile
        ? `sha256:${await sha256Hex(canonicalize(toCanonicalJson(profile)))}`
        : null;
      const site = internal
        ? undefined
        : await getScopedSettings(raw.payload.hostname, raw.payload.pathname, profile);
      const temporaryDisableUntil = internal
        ? null
        : await getTemporaryDisable(raw.payload.hostname);
      const detectedSite = internal ? null : detectSupportedSite(raw.payload.hostname);
      return success(raw.requestId, {
        global,
        ...(site === undefined ? {} : { site }),
        profile,
        profileHash,
        temporaryDisableUntil,
        detectedSite,
        runtimeEpoch: BACKGROUND_RUNTIME_EPOCH,
        safeMode: safeMode.active,
        updatePending: isUpdateQuiescing(),
      });
    }
    case 'UPDATE_SETTINGS':
      if (!validateSettings(raw.payload.settings))
        return failure(raw.requestId, 'RTLX-SETTINGS-001', 'Invalid settings');
      await setSettings(raw.payload.settings);
      await ensureProfileAlarm(raw.payload.settings.remoteProfiles);
      if (!raw.payload.settings.enabled) await broadcastTabCommand({ type: 'RTLX_ROLLBACK' });
      return success(raw.requestId);
    case 'UPDATE_SITE_SETTINGS': {
      const profile = await findActiveProfile(raw.payload.hostname, raw.payload.pathname).catch(
        () => null
      );
      await setScopedSettings(
        raw.payload.hostname,
        raw.payload.pathname,
        profile,
        raw.payload.settings
      );
      return success(raw.requestId);
    }
    case 'APPLY_CURRENT_TAB':
      return success(raw.requestId, await injectCurrentTab(raw.payload.tabId));
    case 'ENSURE_CURRENT_TAB_RUNTIME':
      await ensureCurrentTabRuntime(raw.payload.tabId);
      return success(raw.requestId);
    case 'ROLLBACK':
      await sendTabCommand(raw.payload.tabId, { type: 'RTLX_ROLLBACK' });
      return success(raw.requestId);
    case 'TEMPORARY_DISABLE': {
      const until = await setTemporaryDisable(raw.payload.hostname, raw.payload.minutes);
      await sendTabCommand(raw.payload.tabId, { type: 'RTLX_ROLLBACK' });
      return success(raw.requestId, { until });
    }
    case 'RESET_TEMPORARY_DISABLE':
      await resetTemporaryDisable(raw.payload.hostname);
      return success(raw.requestId);
    case 'GET_STATUS': {
      const profile = await findActiveProfile(raw.payload.hostname, raw.payload.pathname).catch(
        () => null
      );
      const site = await getScopedSettings(raw.payload.hostname, raw.payload.pathname, profile);
      return success(raw.requestId, {
        global: await getSettings(),
        ...(site === undefined ? {} : { site }),
      });
    }
    case 'REPORT_DIAGNOSTICS':
      if (sender.tab?.id === undefined)
        return failure(raw.requestId, 'RTLX-MESSAGE-003', 'Content sender has no tab');
      {
        const settings = await getSettings();
        await appendDiagnostics(
          raw.payload.diagnostics,
          settings.diagnosticsPersistence,
          'untrusted-content',
          contentDocumentIdentity ?? undefined
        );
        return success(raw.requestId);
      }
    case 'REPORT_SUSPICIOUS_DIRECTION': {
      const hostname = senderHostname(sender);
      if (!hostname)
        return failure(raw.requestId, 'RTLX-MESSAGE-003', 'Content sender has no host');
      const current = await getSiteSettings(hostname);
      if (current?.confirmedSuspiciousDirection === undefined)
        await setSiteSettings(hostname, {
          ...(current ?? {}),
          confirmedSuspiciousDirection: false,
        });
      return success(raw.requestId);
    }
    case 'START_FAILURE_PICKER': {
      await clearFailureElementEvidence(raw.payload.tabId);
      const injection = await injectCurrentTab(raw.payload.tabId);
      await sendTabCommand(raw.payload.tabId, { type: 'RTLX_START_FAILURE_PICKER' });
      return success(raw.requestId, { injection });
    }
    case 'SAVE_FAILURE_ELEMENT_EVIDENCE':
      if (sender.tab?.id === undefined)
        return failure(raw.requestId, 'RTLX-CAPTURE-001', 'Content sender has no tab');
      if (!contentDocumentIdentity)
        return failure(raw.requestId, 'RTLX-DOCUMENT-005', 'Document handshake missing');
      await saveFailureElementEvidence(
        sender.tab.id,
        raw.payload.evidence,
        sender.url ?? sender.tab.url,
        contentDocumentIdentity
      );
      return success(raw.requestId);
    case 'EXPORT_FAILURE_EVIDENCE':
      await ensureCurrentTabRuntime(raw.payload.tabId);
      return success(raw.requestId, await exportFailureEvidence(raw.payload));
    case 'DELETE_USER_PROFILE':
      await deleteUserProfile(raw.payload.hostname);
      return success(raw.requestId);
    case 'TOGGLE_SITE_DISABLED':
      return success(
        raw.requestId,
        await toggleSite(raw.payload.tabId, raw.payload.hostname, raw.payload.pathname)
      );
    case 'GET_RUNTIME_SNAPSHOT': {
      const data = await sendTabCommand(
        raw.payload.tabId,
        { type: 'RTLX_RUNTIME_SNAPSHOT' },
        { expectResponse: true }
      );
      return success(raw.requestId, data);
    }
    case 'RECORD_FIXTURE_SUMMARY': {
      const data = await sendTabCommand(
        raw.payload.tabId,
        { type: 'RTLX_RECORD_FIXTURE' },
        { expectResponse: true }
      );
      return success(raw.requestId, data);
    }
    default:
      return failure(
        raw.requestId,
        'RTLX-FEATURE-REMOVED',
        'Feature is not available in the focused edition'
      );
  }
}

function diagnosticMessageType(raw: unknown): string {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return 'UNKNOWN';
  const type = (raw as Record<string, unknown>).type;
  return typeof type === 'string' && /^[A-Z0-9_:-]{1,64}$/u.test(type) ? type : 'UNKNOWN';
}

async function toggleActiveSiteFromCommand(): Promise<void> {
  const tab = (await queryTabs({ active: true, currentWindow: true }))[0];
  if (tab?.id === undefined || !tab.url) return;
  const hostname = safeHostname(tab.url);
  if (!hostname) return;
  await toggleSite(tab.id, hostname, safePathname(tab.url));
}
async function toggleSite(
  tabId: number,
  hostname: string,
  pathname: string
): Promise<{ disabled: boolean }> {
  const global = await getSettings();
  const profile = await findActiveProfile(hostname, pathname).catch(() => null);
  const current = await getScopedSettings(hostname, pathname, profile);
  const effective = current?.siteMode ?? global.siteMode;
  if (effective === 'disabled') {
    const restored: EnabledSiteMode =
      current?.lastEnabledSiteMode ??
      (global.siteMode === 'disabled' ? 'auto-safe' : global.siteMode);
    await setScopedSettings(hostname, pathname, profile, {
      ...(current ?? {}),
      siteMode: restored,
      lastEnabledSiteMode: restored,
    });
    await injectCurrentTab(tabId);
    await sendTabCommand(tabId, { type: 'RTLX_REPROCESS' }, { queueIfUnavailable: true });
    return { disabled: false };
  }
  await setScopedSettings(hostname, pathname, profile, {
    ...(current ?? {}),
    siteMode: 'disabled',
    lastEnabledSiteMode: effective,
  });
  await sendTabCommand(tabId, { type: 'RTLX_ROLLBACK' });
  return { disabled: true };
}
function queryTabs(query: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve) => chrome.tabs.query(query, resolve));
}

function success(requestId: string, data?: unknown): ResponseMessage {
  return Object.freeze({ requestId, success: true, ...(data === undefined ? {} : { data }) });
}
function failure(requestId: string, code: string, message: string): ResponseMessage {
  return Object.freeze({ requestId, success: false, error: { code, message } });
}
function requestId(raw: unknown): string {
  return typeof raw === 'object' &&
    raw !== null &&
    'requestId' in raw &&
    typeof raw.requestId === 'string'
    ? raw.requestId
    : crypto.randomUUID();
}
function safePathname(value: string): string {
  try {
    return new URL(value).pathname;
  } catch {
    return '/';
  }
}
async function handleProfileAlarm(): Promise<void> {
  const leased = await runWithAlarmLease(PROFILE_UPDATE_ALARM, updateRemoteProfiles);
  if (leased.status !== 'executed') return;
  const settings = await getSettings();
  await appendDiagnostics([leased.value.diagnostic], settings.diagnosticsPersistence);
}

function isContentBoundMessage(type: string): boolean {
  return (
    type === 'REQUEST_CONTEXT' ||
    type === 'REPORT_DIAGNOSTICS' ||
    type === 'REPORT_SUSPICIOUS_DIRECTION' ||
    type === 'SAVE_PICKER_SELECTION' ||
    type === 'SAVE_FAILURE_ELEMENT_EVIDENCE'
  );
}

function isMutatingMessage(type: string): boolean {
  return ![
    'REQUEST_CONTEXT',
    'GET_STATUS',
    'EXPORT_DIAGNOSTICS',
    'LIST_USER_PROFILES',
    'EXPORT_USER_PROFILES',
    'GET_COMMUNITY_CATALOG',
    'GET_RUNTIME_SNAPSHOT',
    'ENSURE_CURRENT_TAB_RUNTIME',
    'RECORD_FIXTURE_SUMMARY',
    'LIST_PROFILE_HISTORY',
    'GET_OPERATIONAL_STATUS',
    'RESET_SAFE_MODE',
    'RUN_PERSONAL_HEALTH_CHECK',
    'EXPORT_PERSONAL_BACKUP',
    'EXPORT_PERSONAL_SUPPORT_BUNDLE',
    'CLEAR_DIAGNOSTICS',
    'ATTEMPT_PERSONAL_RECOVERY',
    'START_FAILURE_PICKER',
    'SAVE_FAILURE_ELEMENT_EVIDENCE',
    'EXPORT_FAILURE_EVIDENCE',
    'REPORT_DIAGNOSTICS',
    'ROLLBACK',
  ].includes(type);
}

function launchBackgroundTask(operation: string, task: () => Promise<void>, attempts = 1): void {
  void runBackgroundTask(operation, task, { attempts, retryDelayMs: 50 }).catch(() => undefined);
}
