import { sendMessage } from '../../shared/api-adapter';
import { PRODUCT_VERSION } from '../../shared/constants';
import { message } from '../../shared/messages';
import type { LatinFontPreference, Settings, SiteMode, SiteProfile } from '../../shared/types';

const enabled = byId('enabled') as HTMLInputElement;
const defaultSiteMode = byId('default-site-mode') as HTMLSelectElement;
const latinFont = byId('latin-font') as HTMLSelectElement;
const persistence = byId('diagnostics-persistence') as HTMLInputElement;
const profileInput = byId('import-profiles') as HTMLInputElement;
const signedProfileInput = byId('import-signed-profile') as HTMLInputElement;
const backupInput = byId('import-backup') as HTMLInputElement;
const validateBackupButton = byId('validate-backup') as HTMLButtonElement;
const applyBackupButton = byId('apply-backup') as HTMLButtonElement;
const status = byId('status');
let current: Settings;
let pendingBackupContent: string | null = null;

localize();
byId('version').textContent = PRODUCT_VERSION;
byId('extension-id').textContent = chrome.runtime.id;
void initialize();

async function initialize(): Promise<void> {
  const refreshed = await refreshOptionsState();
  if (!refreshed) return;
  bind();
}

async function refreshOptionsState(): Promise<boolean> {
  const response = await sendMessage(
    message('REQUEST_CONTEXT', { hostname: 'options.internal', pathname: '/' })
  );
  if (!response.success || !isSettingsContainer(response.data)) {
    setStatus(i18n('loadFailed'));
    return false;
  }
  current = response.data.global;
  render();
  await Promise.all([renderGrants(), renderProfiles(), renderShortcut(), renderPersonalHealth()]);
  return true;
}
function bind(): void {
  byId('save').addEventListener('click', () => void save());
  byId('reset').addEventListener('click', () => void reset());
  byId('revoke-all').addEventListener('click', () => void revokeAll());
  byId('export').addEventListener('click', () => void exportDiagnostics());
  byId('export-profiles').addEventListener('click', () => void exportProfiles());
  profileInput.addEventListener('change', () => void importProfiles());
  signedProfileInput.addEventListener('change', () => void importSignedProfile());
  backupInput.addEventListener('change', () => void selectBackup());
  validateBackupButton.addEventListener('click', () => void validateBackup());
  applyBackupButton.addEventListener('click', () => void applyBackup());
  byId('run-health').addEventListener('click', () => void renderPersonalHealth(true));
  byId('export-backup').addEventListener('click', () => void exportPersonalBackup());
  byId('export-support').addEventListener('click', () => void exportSupportBundle());
  byId('clear-diagnostics').addEventListener('click', () => void clearDiagnostics());
  byId('attempt-recovery').addEventListener('click', () => void attemptRecovery());
}
function render(): void {
  enabled.checked = current.enabled;
  defaultSiteMode.value = current.siteMode;
  latinFont.value = current.latinFont;
  persistence.checked = current.diagnosticsPersistence;
}
async function save(): Promise<void> {
  current = {
    ...current,
    enabled: enabled.checked,
    siteMode: defaultSiteMode.value as SiteMode,
    latinFont: latinFont.value as LatinFontPreference,
    diagnosticsPersistence: persistence.checked,
    remoteProfiles: false,
    telemetry: false,
  };
  const response = await sendMessage(message('UPDATE_SETTINGS', { settings: current }));
  setStatus(response.success ? i18n('saved') : response.error.message);
}
async function reset(): Promise<void> {
  const response = await sendMessage(message('RESET_SETTINGS', {}));
  if (response.success && isSettingsResult(response.data)) {
    current = response.data.settings;
    render();
    setStatus(i18n('resetDone'));
  }
}
async function renderProfiles(): Promise<void> {
  const response = await sendMessage(message('LIST_USER_PROFILES', {}));
  const body = byId('profile-list');
  body.replaceChildren();
  if (!response.success || !isProfilesResult(response.data)) {
    appendEmptyRow(body, i18n('loadFailed'));
    return;
  }
  if (response.data.profiles.length === 0) {
    appendEmptyRow(body, i18n('noProfiles'));
    return;
  }
  for (const profile of [...response.data.profiles].sort((a, b) =>
    a.profileId.localeCompare(b.profileId, 'en')
  )) {
    const row = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = profile.displayName;
    const host = document.createElement('td');
    host.textContent = profile.match.hosts.join(', ');
    host.dir = 'ltr';
    const version = document.createElement('td');
    version.textContent = String(profile.profileVersion);
    const actions = document.createElement('td');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = i18n('deleteProfile');
    remove.addEventListener('click', () => void deleteProfile(profile));
    actions.append(remove);
    row.append(name, host, version, actions);
    body.append(row);
  }
}
async function deleteProfile(profile: SiteProfile): Promise<void> {
  const hostname = profile.match.hosts[0];
  if (!hostname) return;
  const response = await sendMessage(message('DELETE_USER_PROFILE', { hostname }));
  setStatus(response.success ? i18n('profileDeleted') : response.error.message);
  if (response.success) await renderProfiles();
}
async function exportProfiles(): Promise<void> {
  const response = await sendMessage(message('EXPORT_USER_PROFILES', {}));
  if (!response.success || !isContentResult(response.data))
    return setStatus(response.success ? i18n('loadFailed') : response.error.message);
  downloadText(response.data.content, `rtlx-profiles-${PRODUCT_VERSION}.json`);
  setStatus(i18n('profilesExported'));
}
async function importProfiles(): Promise<void> {
  const file = profileInput.files?.[0];
  profileInput.value = '';
  if (!file) return;
  const content = await file.text();
  const response = await sendMessage(message('IMPORT_USER_PROFILES', { content }));
  setStatus(response.success ? i18n('profilesImported') : response.error.message);
  if (response.success) await renderProfiles();
}

async function importSignedProfile(): Promise<void> {
  const file = signedProfileInput.files?.[0];
  signedProfileInput.value = '';
  if (!file) return;
  const content = await file.text();
  const response = await sendMessage(message('IMPORT_SIGNED_PROFILE', { content }));
  setStatus(response.success ? i18n('signedProfileImported') : response.error.message);
}

async function renderPersonalHealth(force = false): Promise<void> {
  if (force) setStatus(i18n('healthCheckRunning'));
  const response = await sendMessage(message('RUN_PERSONAL_HEALTH_CHECK', {}));
  if (!response.success || !isHealthContainer(response.data)) {
    if (force) setStatus(response.success ? i18n('loadFailed') : response.error.message);
    return;
  }
  const health = response.data.health;
  byId('health-status').textContent = health.status;
  byId('health-integrity').textContent = health.packageIntegrity.status;
  byId('health-storage').textContent =
    `${formatBytes(health.storageBytes.local)} / ${formatBytes(health.storageBytes.sync)}`;
  byId('health-transactions').textContent = String(health.pendingTransactions);
  byId('health-profiles').textContent = String(health.userProfilesCount);
  byId('health-diagnostics').textContent = String(health.diagnosticsCount);
  if (force) setStatus(i18n('healthCheckDone'));
}

async function exportPersonalBackup(): Promise<void> {
  const response = await sendMessage(
    message('EXPORT_PERSONAL_BACKUP', { includeDiagnostics: false })
  );
  if (!response.success || !isContentResult(response.data))
    return setStatus(response.success ? i18n('loadFailed') : response.error.message);
  downloadText(response.data.content, `rtlx-personal-backup-${PRODUCT_VERSION}.json`);
  setStatus(i18n('backupExported'));
}

async function selectBackup(): Promise<void> {
  const file = backupInput.files?.[0];
  pendingBackupContent = file ? await file.text() : null;
  validateBackupButton.disabled = pendingBackupContent === null;
  applyBackupButton.disabled = true;
  byId('backup-preview').textContent = pendingBackupContent ? i18n('backupSelected') : '';
}

async function validateBackup(): Promise<void> {
  if (!pendingBackupContent) return;
  const response = await sendMessage(
    message('IMPORT_PERSONAL_BACKUP', { content: pendingBackupContent, dryRun: true })
  );
  if (!response.success || !isBackupImportContainer(response.data)) {
    applyBackupButton.disabled = true;
    byId('backup-preview').textContent = response.success
      ? i18n('loadFailed')
      : response.error.message;
    return;
  }
  applyBackupButton.disabled = false;
  byId('backup-preview').textContent = JSON.stringify(response.data.result, null, 2);
  setStatus(i18n('backupValidated'));
}

async function applyBackup(): Promise<void> {
  if (!pendingBackupContent) return;
  applyBackupButton.disabled = true;
  const response = await sendMessage(
    message('IMPORT_PERSONAL_BACKUP', { content: pendingBackupContent, dryRun: false })
  );
  if (!response.success || !isBackupImportContainer(response.data)) {
    applyBackupButton.disabled = false;
    return setStatus(response.success ? i18n('loadFailed') : response.error.message);
  }
  byId('backup-preview').textContent = JSON.stringify(response.data.result, null, 2);
  setStatus(i18n('backupApplied'));
  await refreshOptionsState();
}

async function exportSupportBundle(): Promise<void> {
  const response = await sendMessage(message('EXPORT_PERSONAL_SUPPORT_BUNDLE', {}));
  if (!response.success || !isContentResult(response.data))
    return setStatus(response.success ? i18n('loadFailed') : response.error.message);
  downloadText(response.data.content, `rtlx-support-${PRODUCT_VERSION}.json`);
  setStatus(i18n('supportExported'));
}

async function clearDiagnostics(): Promise<void> {
  const response = await sendMessage(message('CLEAR_DIAGNOSTICS', {}));
  setStatus(response.success ? i18n('diagnosticsCleared') : response.error.message);
  if (response.success) await renderPersonalHealth();
}

async function attemptRecovery(): Promise<void> {
  setStatus(i18n('recoveryRunning'));
  const response = await sendMessage(message('ATTEMPT_PERSONAL_RECOVERY', {}));
  setStatus(response.success ? i18n('recoveryDone') : response.error.message);
  if (response.success) await renderPersonalHealth(true);
}

function formatBytes(value: number | null): string {
  if (value === null) return i18n('notAvailable');
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(1)} KiB`;
}

async function renderShortcut(): Promise<void> {
  const commands = await getCommands();
  byId('shortcut-value').textContent =
    commands.find((command) => command.name === 'toggle-current-site')?.shortcut ||
    i18n('notAssigned');
}
async function renderGrants(): Promise<void> {
  const permissions = await getPermissions();
  const list = byId('grants');
  list.replaceChildren();
  for (const origin of [...(permissions.origins ?? [])].sort()) {
    const item = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = origin;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = i18n('revoke');
    button.addEventListener('click', () => void removeOrigins([origin]).then(renderGrants));
    item.append(text, button);
    list.append(item);
  }
  if ((permissions.origins ?? []).length === 0) {
    const item = document.createElement('li');
    item.textContent = i18n('noGrants');
    list.append(item);
  }
}
async function revokeAll(): Promise<void> {
  const permissions = await getPermissions();
  const origins = permissions.origins ?? [];
  if (origins.length > 0) await removeOrigins(origins);
  await renderGrants();
  setStatus(i18n('revoked'));
}
async function exportDiagnostics(): Promise<void> {
  const response = await sendMessage(message('EXPORT_DIAGNOSTICS', {}));
  if (!response.success) return setStatus(response.error.message);
  downloadText(
    `${JSON.stringify(response.data, null, 2)}\n`,
    `rtlx-diagnostics-${PRODUCT_VERSION}.json`
  );
  setStatus(i18n('exported'));
}
function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
function appendEmptyRow(body: HTMLElement, text: string): void {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 4;
  cell.textContent = text;
  row.append(cell);
  body.append(row);
}
function getPermissions(): Promise<chrome.permissions.Permissions> {
  return new Promise((resolve) => chrome.permissions.getAll(resolve));
}
function removeOrigins(origins: string[]): Promise<boolean> {
  return new Promise((resolve) => chrome.permissions.remove({ origins }, resolve));
}
function getCommands(): Promise<chrome.commands.Command[]> {
  return new Promise((resolve) => chrome.commands.getAll(resolve));
}
function isSettingsContainer(value: unknown): value is { global: Settings } {
  return typeof value === 'object' && value !== null && 'global' in value;
}
function isSettingsResult(value: unknown): value is { settings: Settings } {
  return typeof value === 'object' && value !== null && 'settings' in value;
}
function isProfilesResult(value: unknown): value is { profiles: SiteProfile[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'profiles' in value &&
    Array.isArray(value.profiles)
  );
}
function isContentResult(value: unknown): value is { content: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'content' in value &&
    typeof value.content === 'string'
  );
}
interface HealthSummary {
  status: string;
  pendingTransactions: number;
  userProfilesCount: number;
  diagnosticsCount: number;
  storageBytes: { local: number | null; sync: number | null };
  packageIntegrity: { status: string };
}
function isHealthContainer(value: unknown): value is { health: HealthSummary } {
  if (typeof value !== 'object' || value === null || !('health' in value)) return false;
  const health = value.health;
  return (
    typeof health === 'object' &&
    health !== null &&
    'status' in health &&
    typeof health.status === 'string' &&
    'pendingTransactions' in health &&
    typeof health.pendingTransactions === 'number' &&
    'userProfilesCount' in health &&
    typeof health.userProfilesCount === 'number' &&
    'diagnosticsCount' in health &&
    typeof health.diagnosticsCount === 'number' &&
    'storageBytes' in health &&
    typeof health.storageBytes === 'object' &&
    health.storageBytes !== null &&
    'packageIntegrity' in health &&
    typeof health.packageIntegrity === 'object' &&
    health.packageIntegrity !== null
  );
}
function isBackupImportContainer(value: unknown): value is { result: Record<string, unknown> } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'result' in value &&
    typeof value.result === 'object' &&
    value.result !== null
  );
}

function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element ${id}`);
  return element;
}
function localize(): void {
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = element.dataset.i18n;
    if (key) element.textContent = i18n(key);
  }
}
function i18n(key: string): string {
  return chrome.i18n.getMessage(key) || key;
}
function setStatus(value: string): void {
  status.textContent = value;
}
