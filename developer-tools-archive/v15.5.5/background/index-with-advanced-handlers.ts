import { canonicalByteLength } from '../shared/canonical-json';
import { LIMITS, PROFILE_UPDATE_ALARM } from '../shared/constants';
import {
  addSelectionToProfile,
  deleteProfileRule,
  updateProfileRule,
} from '../shared/profile-builder';
import { isRequestMessage, type ResponseMessage } from '../shared/messages';
import { detectSupportedSite } from '../shared/site-detector';
import { validateSettings } from '../shared/settings';
import type { EnabledSiteMode, QuickOverrideMode } from '../shared/types';
import { appendDiagnostics, exportDiagnostics } from './diagnostics-store';
import { exportPersonalBackup, importPersonalBackup } from './personal-backup';
import {
  clearFailureElementEvidence,
  exportFailureEvidence,
  saveFailureElementEvidence,
} from './failure-evidence';
import {
  attemptPersonalRecovery,
  clearPersonalDiagnostics,
  exportPersonalSupportBundle,
  runPersonalHealthCheck,
} from './personal-health';
import { ensureProfileAlarm } from './alarm-manager';
import { runWithAlarmLease } from './alarm-lease';
import {
  BACKGROUND_RUNTIME_EPOCH,
  type DocumentIdentity,
  registerContentDocument,
  validateContentDocument,
} from './document-registry';
import {
  backgroundInitializationSnapshot,
  ensureBackgroundInitialized,
  reinitializeBackground,
} from './lifecycle';
import { isAuthorizedMessage, safeHostname, senderHostname } from './message-authorization';
import { injectCurrentTab, synchronizeRegisteredContentScript } from './permission-manager';
import {
  canRequestPermission,
  readPermissionDenials,
  recordPermissionDecision,
} from './permission-policy-guard';
import { backgroundRuntimeSnapshot, runBackgroundTask } from './runtime-status';
import {
  broadcastTabCommand,
  observeTabActivated,
  observeTabRemoved,
  observeTabReplaced,
  observeTabUpdated,
  sendTabCommand,
  tabLifecycleSnapshot,
} from './tab-lifecycle-registry';
import { updateRemoteProfiles } from './profile-updater';
import { readSafeModeState, resetSafeMode } from './safe-mode';
import {
  observeSyncStorageChanges,
  readObservedSyncChanges,
  readSyncConflicts,
} from './sync-coordinator';
import { recoverStorageTransactions } from './storage-transaction';
import { runtimeContextCensusSnapshot } from './runtime-context-reconciler';
import { beginUpdateQuiescence, isUpdateQuiescing, readUpdateState } from './update-coordinator';
import { communityCatalog, findActiveProfile } from './profile-repository';
import { importSignedCommunityProfile } from './community-profile-repository';
import {
  deleteUserProfile,
  exportUserProfiles,
  getUserProfile,
  importUserProfiles,
  listUserProfiles,
  saveUserProfile,
  restoreUserProfileHistory,
} from './user-profile-repository';
import { listProfileHistory } from './profile-history-repository';
import {
  getTemporaryDisable,
  resetTemporaryDisable,
  setTemporaryDisable,
} from './temporary-disable-store';
import {
  getScopedSettings,
  getSettings,
  getSiteSettings,
  resetSettings,
  setScopedSettings,
  setSettings,
  setSiteSettings,
} from './settings-repository';

const MENU_ROOT = 'rtlx-quick-root';
let contextMenuOperation: Promise<void> = Promise.resolve();

chrome.runtime.onInstalled.addListener((details) =>
  launchBackgroundTask(
    'initialize:onInstalled',
    async () => {
      await reinitializeBackground(`onInstalled:${details.reason}`);
      await registerContextMenusIfGranted();
    },
    2
  )
);
chrome.runtime.onStartup.addListener(() =>
  launchBackgroundTask(
    'initialize:onStartup',
    async () => {
      await reinitializeBackground('onStartup');
      await registerContextMenusIfGranted();
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
  void handle(raw, sender).then(sendResponse, (error: unknown) =>
    sendResponse(
      failure(
        requestId(raw),
        'RTLX-INTERNAL',
        error instanceof Error ? error.message.slice(0, 512) : 'Unknown error'
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
if (chrome.contextMenus)
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    launchBackgroundTask('context-menu:click', async () => {
      await ensureBackgroundInitialized('context-menu:click');
      await handleMenuClick(String(info.menuItemId), tab?.id);
    });
  });
launchBackgroundTask(
  'initialize:module-load',
  async () => {
    await ensureBackgroundInitialized('module-load');
    await registerContextMenusIfGranted();
  },
  2
);

async function handle(
  raw: unknown,
  sender: chrome.runtime.MessageSender
): Promise<ResponseMessage> {
  await ensureBackgroundInitialized('runtime:onMessage');
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
      const site = internal
        ? undefined
        : await getScopedSettings(raw.payload.hostname, raw.payload.pathname, profile);
      const temporaryDisableUntil = internal
        ? null
        : await getTemporaryDisable(raw.payload.hostname);
      const detectedSite = internal ? null : detectSupportedSite(raw.payload.hostname);
      return success(raw.requestId, {
        global,
        site,
        profile,
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
      await injectCurrentTab(raw.payload.tabId);
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
      return success(raw.requestId, {
        global: await getSettings(),
        site: await getScopedSettings(raw.payload.hostname, raw.payload.pathname, profile),
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
    case 'EXPORT_DIAGNOSTICS': {
      const settings = await getSettings();
      return success(raw.requestId, {
        diagnostics: await exportDiagnostics(settings.diagnosticsPersistence),
      });
    }
    case 'RESET_SETTINGS':
      return success(raw.requestId, { settings: await resetSettings() });
    case 'EXPORT_PERSONAL_BACKUP':
      return success(raw.requestId, {
        content: await exportPersonalBackup(raw.payload.includeDiagnostics),
      });
    case 'IMPORT_PERSONAL_BACKUP':
      return success(raw.requestId, {
        result: await importPersonalBackup(raw.payload.content, raw.payload.dryRun),
      });
    case 'RUN_PERSONAL_HEALTH_CHECK':
      return success(raw.requestId, {
        health: await runPersonalHealthCheck({ forceIntegrity: true }),
      });
    case 'EXPORT_PERSONAL_SUPPORT_BUNDLE':
      return success(raw.requestId, { content: await exportPersonalSupportBundle() });
    case 'CLEAR_DIAGNOSTICS':
      return success(raw.requestId, { health: await clearPersonalDiagnostics() });
    case 'ATTEMPT_PERSONAL_RECOVERY':
      return success(raw.requestId, await attemptPersonalRecovery());
    case 'START_PICKER':
      await injectCurrentTab(raw.payload.tabId);
      await sendTabCommand(raw.payload.tabId, {
        type: 'RTLX_START_PICKER',
        kind: raw.payload.kind,
      });
      return success(raw.requestId);
    case 'START_FAILURE_PICKER':
      await clearFailureElementEvidence(raw.payload.tabId);
      await injectCurrentTab(raw.payload.tabId);
      await sendTabCommand(raw.payload.tabId, { type: 'RTLX_START_FAILURE_PICKER' });
      return success(raw.requestId);
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
      return success(raw.requestId, await exportFailureEvidence(raw.payload));
    case 'SAVE_PICKER_SELECTION': {
      const hostname = senderHostname(sender);
      if (!hostname || hostname !== raw.payload.selection.hostname)
        return failure(raw.requestId, 'RTLX-MESSAGE-005', 'Selection host mismatch');
      const existing = await getUserProfile(hostname);
      const senderPath = safePathname(sender.url ?? sender.tab?.url ?? '/');
      const active = existing ?? (await findActiveProfile(hostname, senderPath).catch(() => null));
      const base =
        active?.profileKind === 'bundled'
          ? {
              ...active,
              profileId: `user:${hostname}`,
              profileKind: 'user' as const,
              profileVersion: 1,
              displayName: `Custom profile — ${hostname}`,
              metadata: {
                source: 'user-picker' as const,
                verification: 'user-authored' as const,
                product: null,
              },
            }
          : active;
      const profile = addSelectionToProfile(hostname, raw.payload.selection, base);
      await saveUserProfile(profile);
      if (sender.tab?.id !== undefined)
        await sendTabCommand(
          sender.tab.id,
          { type: 'RTLX_REPROCESS' },
          { queueIfUnavailable: true }
        );
      return success(raw.requestId, { profile });
    }
    case 'LIST_USER_PROFILES':
      return success(raw.requestId, { profiles: await listUserProfiles() });
    case 'EXPORT_USER_PROFILES':
      return success(raw.requestId, { content: await exportUserProfiles() });
    case 'IMPORT_USER_PROFILES':
      return success(raw.requestId, { profiles: await importUserProfiles(raw.payload.content) });
    case 'IMPORT_SIGNED_PROFILE':
      return success(raw.requestId, {
        profile: await importSignedCommunityProfile(raw.payload.content),
      });
    case 'DELETE_USER_PROFILE':
      await deleteUserProfile(raw.payload.hostname);
      return success(raw.requestId);
    case 'TOGGLE_SITE_DISABLED':
      return success(
        raw.requestId,
        await toggleSite(raw.payload.tabId, raw.payload.hostname, raw.payload.pathname)
      );
    case 'UPDATE_PROFILE_RULE': {
      const current = await getUserProfile(raw.payload.hostname);
      if (!current) return failure(raw.requestId, 'RTLX-PROFILE-404', 'User profile not found');
      const profile = updateProfileRule(current, raw.payload.ruleId, raw.payload.patch);
      await saveUserProfile(profile);
      return success(raw.requestId, { profile });
    }
    case 'DELETE_PROFILE_RULE': {
      const current = await getUserProfile(raw.payload.hostname);
      if (!current) return failure(raw.requestId, 'RTLX-PROFILE-404', 'User profile not found');
      const profile = deleteProfileRule(current, raw.payload.ruleId);
      await saveUserProfile(profile);
      return success(raw.requestId, { profile });
    }
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
    case 'LIST_PROFILE_HISTORY':
      return success(raw.requestId, { entries: await listProfileHistory(raw.payload.hostname) });
    case 'RESTORE_PROFILE_HISTORY': {
      const profile = await restoreUserProfileHistory(raw.payload.hostname, raw.payload.hash);
      return success(raw.requestId, { profile });
    }
    case 'GET_COMMUNITY_CATALOG':
      return success(raw.requestId, { entries: await communityCatalog() });
    case 'GET_OPERATIONAL_STATUS':
      return success(raw.requestId, {
        initialization: backgroundInitializationSnapshot(),
        runtime: backgroundRuntimeSnapshot(),
        contexts: runtimeContextCensusSnapshot(),
        tabs: tabLifecycleSnapshot(),
        safeMode: await readSafeModeState(),
        update: await readUpdateState(),
        syncConflicts: await readSyncConflicts(),
        observedSyncChanges: await readObservedSyncChanges(),
        permissionDenials: await readPermissionDenials(),
      });
    case 'RESET_SAFE_MODE':
      return success(raw.requestId, { safeMode: await resetSafeMode() });
    case 'OPEN_CONTROL_PANEL':
      await openControlPanel(raw.payload.tabId);
      return success(raw.requestId);
    case 'ENABLE_CONTEXT_MENU': {
      if (!chrome.contextMenus) return success(raw.requestId, { granted: false, supported: false });
      const granted = __RTLX_FIREFOX__ || (await requestOptionalPermission('contextMenus'));
      if (granted) await registerContextMenus();
      return success(raw.requestId, { granted, supported: true });
    }
  }
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
async function registerContextMenusIfGranted(): Promise<void> {
  if (!chrome.contextMenus) return;
  if (__RTLX_FIREFOX__) {
    await registerContextMenus();
    return;
  }
  const has = await containsPermission('contextMenus');
  if (has) await registerContextMenus();
}
async function registerContextMenus(): Promise<void> {
  if (!chrome.contextMenus) return;
  const work = contextMenuOperation.then(async () => {
    await new Promise<void>((resolve, reject) =>
      chrome.contextMenus.removeAll(() => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve();
      })
    );
    chrome.contextMenus.create({
      id: MENU_ROOT,
      title: 'RTLX temporary override',
      contexts: ['all'],
    });
    for (const [id, title] of [
      ['content', 'Treat as Persian/English content'],
      ['ltr', 'Force selected element LTR'],
      ['ignore', 'Ignore selected element'],
    ] as const)
      chrome.contextMenus.create({
        id: `rtlx-quick-${id}`,
        parentId: MENU_ROOT,
        title,
        contexts: ['all'],
      });
  });
  contextMenuOperation = work.then(
    () => undefined,
    () => undefined
  );
  return work;
}
async function handleMenuClick(id: string, tabId: number | undefined): Promise<void> {
  if (tabId === undefined || !id.startsWith('rtlx-quick-')) return;
  const mode = id.slice('rtlx-quick-'.length) as QuickOverrideMode;
  if (mode === 'content' || mode === 'ltr' || mode === 'ignore')
    await sendTabCommand(tabId, { type: 'RTLX_QUICK_OVERRIDE', mode });
}
async function openControlPanel(tabId: number): Promise<void> {
  if (__RTLX_CHROMIUM_SIDE_PANEL__) {
    await chrome.sidePanel.open({ tabId });
    return;
  }
  if (chrome.sidebarAction?.open) {
    await chrome.sidebarAction.open();
    return;
  }
  await chrome.runtime.openOptionsPage();
}
function containsPermission(permission: string): Promise<boolean> {
  return new Promise((resolve) =>
    chrome.permissions.contains(
      { permissions: [permission as chrome.runtime.ManifestPermission] },
      resolve
    )
  );
}
async function requestOptionalPermission(permission: string): Promise<boolean> {
  if (!(await canRequestPermission(permission))) return false;
  const granted = await new Promise<boolean>((resolve) =>
    chrome.permissions.request(
      { permissions: [permission as chrome.runtime.ManifestPermission] },
      resolve
    )
  );
  await recordPermissionDecision(permission, granted);
  return granted;
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
