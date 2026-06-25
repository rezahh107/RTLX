import { sendMessage } from '../../shared/api-adapter';
import { message, type RulePatch } from '../../shared/messages';
import { mergeSettings } from '../../shared/settings';
import type {
  CommunityCatalogEntry,
  DetectedSite,
  ElementKind,
  PerSiteSettings,
  ProfileHistoryEntry,
  RecordedFixtureSummary,
  RuntimeSnapshot,
  Settings,
  SiteProfile,
} from '../../shared/types';
interface Context {
  tabId: number;
  url: URL;
  hostname: string;
  global: Settings;
  site: PerSiteSettings | undefined;
  profile: SiteProfile | null;
  detectedSite: DetectedSite | null;
}
let context: Context | null = null;
void initialize();
byId('refresh').addEventListener('click', () => void initialize());
async function initialize(): Promise<void> {
  const tab = await activeTab();
  if (tab.id === undefined || !tab.url) return status('Unsupported page');
  const url = new URL(tab.url);
  if (!['http:', 'https:'].includes(url.protocol)) return status('Unsupported page');
  const response = await sendMessage(
    message('REQUEST_CONTEXT', { hostname: url.hostname, pathname: url.pathname })
  );
  if (!response.success || !isContextData(response.data)) return status('Unable to load context');
  context = {
    tabId: tab.id,
    url,
    hostname: url.hostname.toLowerCase(),
    global: response.data.global,
    site: response.data.site,
    profile: response.data.profile ?? null,
    detectedSite: response.data.detectedSite ?? null,
  };
  render();
  bindOnce();
  await Promise.all([renderCatalog(), refreshRuntime(), renderHistory()]);
}
let bound = false;
function bindOnce(): void {
  if (bound) return;
  bound = true;
  byId('toggle-site').addEventListener('click', () => void toggleSite());
  byId('rollback').addEventListener('click', () => void action('ROLLBACK'));
  byId('start-picker').addEventListener('click', () => void startPicker());
  byId('save-settings').addEventListener('click', () => void saveSettings());
  byId('enable-menu').addEventListener('click', () => void enableMenu());
  byId('refresh-runtime').addEventListener('click', () => void refreshRuntime());
  byId('record-fixture').addEventListener('click', () => void recordFixture());
}
function render(): void {
  if (!context) return;
  const effective = mergeSettings(context.global, context.site);
  byId('host').textContent = context.hostname;
  byId('profile-name').textContent = context.profile?.displayName ?? 'Generic defaults';
  byId('detected-site').textContent = context.detectedSite?.displayName ?? 'Not detected';
  (byId('input-direction') as HTMLInputElement).checked = effective.inputDirectionAssistant;
  (byId('list-repair') as HTMLInputElement).checked = effective.listRepair;
  (byId('latin-font') as HTMLSelectElement).value = effective.latinFont;
  (byId('settings-scope') as HTMLSelectElement).value =
    context.site?.settingsScope ?? context.profile?.scopePolicy.mode ?? effective.settingsScope;
  byId('toggle-site').textContent =
    effective.siteMode === 'disabled' ? 'Enable on this site' : 'Disable on this site';
  renderRules();
}
function renderRules(): void {
  const host = byId('rules');
  host.replaceChildren();
  const rules = context?.profile?.rules ?? [];
  if (rules.length === 0) {
    host.textContent = 'No active profile rules.';
    return;
  }
  for (const rule of rules) {
    const item = document.createElement('div');
    item.className = 'rule';
    const title = document.createElement('strong');
    title.textContent = `${rule.category} · ${rule.ruleId}`;
    const selector = document.createElement('div');
    selector.className = 'selector';
    selector.textContent = rule.selector;
    const enabled = checkbox(
      'Enabled',
      rule.enabled,
      (value) => void updateRule(rule.ruleId, { enabled: value })
    );
    const direction = select(
      'Direction',
      [
        ['auto-safe', 'Auto safe'],
        ['force-rtl', 'Force RTL'],
        ['force-ltr', 'Force LTR'],
        ['preserve', 'Preserve'],
      ],
      rule.directionMode,
      (value) => void updateRule(rule.ruleId, { directionMode: value as never })
    );
    const alignment = select(
      'Alignment',
      [
        ['start', 'Logical start'],
        ['preserve', 'Preserve'],
      ],
      rule.alignmentMode,
      (value) => void updateRule(rule.ruleId, { alignmentMode: value as never })
    );
    const typography = select(
      'Typography',
      [
        ['persian-only', 'Vazirmatn + Latin policy'],
        ['preserve', 'Preserve'],
      ],
      rule.typographyMode,
      (value) => void updateRule(rule.ruleId, { typographyMode: value as never })
    );
    const delay = number(
      'Delay ms',
      rule.initialDelayMs,
      (value) => void updateRule(rule.ruleId, { initialDelayMs: value })
    );
    item.append(title, selector, enabled, direction, alignment, typography, delay);
    if (context?.profile?.profileKind === 'user') {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Delete rule';
      remove.addEventListener('click', () => void deleteRule(rule.ruleId));
      item.append(remove);
    }
    host.append(item);
  }
}
async function saveSettings(): Promise<void> {
  if (!context) return;
  const patch: PerSiteSettings = {
    ...(context.site ?? {}),
    inputDirectionAssistant: (byId('input-direction') as HTMLInputElement).checked,
    formFieldDirection: (byId('input-direction') as HTMLInputElement).checked,
    listRepair: (byId('list-repair') as HTMLInputElement).checked,
    latinFont: (byId('latin-font') as HTMLSelectElement).value as NonNullable<
      PerSiteSettings['latinFont']
    >,
    settingsScope: (byId('settings-scope') as HTMLSelectElement).value as NonNullable<
      PerSiteSettings['settingsScope']
    >,
  };
  const response = await sendMessage(
    message('UPDATE_SITE_SETTINGS', {
      hostname: context.hostname,
      pathname: context.url.pathname,
      settings: patch,
    })
  );
  if (response.success) {
    context.site = patch;
    status('Saved');
    await sendMessage(message('APPLY_CURRENT_TAB', { tabId: context.tabId }));
  } else status(response.error.message);
}
async function updateRule(ruleId: string, patch: RulePatch): Promise<void> {
  if (!context) return;
  if (context.profile?.profileKind !== 'user')
    return status('Built-in rules are read-only. Use the picker to create a user profile first.');
  const response = await sendMessage(
    message('UPDATE_PROFILE_RULE', { hostname: context.hostname, ruleId, patch })
  );
  if (response.success && isProfileResult(response.data)) {
    context.profile = response.data.profile;
    renderRules();
    status('Rule updated');
    await renderHistory();
  } else if (!response.success) status(response.error.message);
}
async function deleteRule(ruleId: string): Promise<void> {
  if (!context) return;
  const response = await sendMessage(
    message('DELETE_PROFILE_RULE', { hostname: context.hostname, ruleId })
  );
  if (response.success && isProfileResult(response.data)) {
    context.profile = response.data.profile;
    renderRules();
    status('Rule deleted');
    await renderHistory();
  } else if (!response.success) status(response.error.message);
}
async function startPicker(): Promise<void> {
  if (!context) return;
  const kind = (byId('picker-kind') as HTMLSelectElement).value as ElementKind;
  const response = await sendMessage(message('START_PICKER', { tabId: context.tabId, kind }));
  status(response.success ? 'Picker started' : response.error.message);
}
async function toggleSite(): Promise<void> {
  if (!context) return;
  const response = await sendMessage(
    message('TOGGLE_SITE_DISABLED', {
      tabId: context.tabId,
      hostname: context.hostname,
      pathname: context.url.pathname,
    })
  );
  if (!response.success) return status(response.error.message);
  await initialize();
}
async function action(type: 'ROLLBACK'): Promise<void> {
  if (!context) return;
  const response = await sendMessage(message(type, { tabId: context.tabId }));
  status(response.success ? 'Rolled back' : response.error.message);
}
async function enableMenu(): Promise<void> {
  const response = await sendMessage(message('ENABLE_CONTEXT_MENU', {}));
  status(response.success ? 'Quick override menu enabled' : response.error.message);
}
async function refreshRuntime(): Promise<void> {
  if (!context) return;
  const response = await sendMessage(
    message('GET_RUNTIME_SNAPSHOT', { tabId: context.tabId })
  ).catch(() => null);
  if (!response || !response.success || !isRuntimeSnapshot(response.data)) {
    byId('runtime-health').textContent = 'Runtime unavailable. Apply RTLX to this tab first.';
    byId('rule-health').replaceChildren();
    byId('performance').replaceChildren();
    return;
  }
  renderRuntimeSnapshot(response.data);
}

function renderRuntimeSnapshot(snapshot: RuntimeSnapshot): void {
  const metrics = byId('runtime-health');
  metrics.replaceChildren();
  for (const [label, value] of [
    ['Runtime', snapshot.runtimeState],
    ['Lifecycle', `${snapshot.lifecycleState} · generation ${snapshot.lifecycleGeneration}`],
    ['Degradation', `level ${snapshot.degradationLevel}`],
    [
      'Backpressure',
      `${snapshot.backpressure.level} · ${snapshot.backpressure.nodesPerSlice} nodes / ${snapshot.backpressure.sliceMs} ms`,
    ],
    ['Profile health', snapshot.profileHealth.status],
    ['Wrappers', String(snapshot.wrapperCount)],
    ['Journal entries', String(snapshot.journalEntries)],
    ['Observed roots', String(snapshot.observedRoots)],
    ['Mutation observers', String(snapshot.observedMutationRoots)],
    ['Visibility targets', String(snapshot.visibility.targets)],
    ['Delayed candidates', String(snapshot.delayedWork.candidates)],
    ['Streaming batches', String(snapshot.streaming.batchesFlushed)],
    ['Streaming pending', snapshot.streaming.pending ? 'yes' : 'no'],
  ] as const) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    metrics.append(dt, dd);
  }

  const rules = byId('rule-health');
  rules.replaceChildren();
  for (const rule of snapshot.profileHealth.rules) {
    const row = document.createElement('p');
    row.className = `health health-${rule.status}`;
    row.textContent = `${rule.ruleId}: ${rule.status} (${rule.matchCount} matches)`;
    rules.append(row);
  }

  const performance = byId('performance');
  performance.replaceChildren();
  for (const phase of snapshot.performance.phases) {
    const row = document.createElement('p');
    row.textContent = `${phase.phase}: p95 ${phase.p95DurationMs} ms · max ${phase.maxDurationMs} ms · ${phase.samples} samples`;
    performance.append(row);
  }
}

async function recordFixture(): Promise<void> {
  if (!context) return;
  const response = await sendMessage(message('RECORD_FIXTURE_SUMMARY', { tabId: context.tabId }));
  if (!response.success || !isRecordedFixture(response.data)) {
    status(response.success ? 'Fixture unavailable' : response.error.message);
    return;
  }
  downloadJson(`rtlx-fixture-${context.hostname}.json`, response.data);
  status('Text-free fixture exported');
}

async function renderHistory(): Promise<void> {
  if (!context) return;
  const host = byId('profile-history');
  host.replaceChildren();
  const response = await sendMessage(
    message('LIST_PROFILE_HISTORY', { hostname: context.hostname })
  );
  if (!response.success || !isHistoryResult(response.data)) {
    host.textContent = 'Profile history unavailable';
    return;
  }
  if (response.data.entries.length === 0) {
    host.textContent = 'No snapshots yet.';
    return;
  }
  for (const entry of response.data.entries) {
    const row = document.createElement('div');
    row.className = 'history-item';
    const label = document.createElement('span');
    label.textContent = `v${entry.profileVersion} · ${new Date(entry.savedAt).toLocaleString()}`;
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.textContent = 'Restore';
    restore.addEventListener('click', () => void restoreHistory(entry.hash));
    row.append(label, restore);
    host.append(row);
  }
}

async function restoreHistory(hash: string): Promise<void> {
  if (!context) return;
  const response = await sendMessage(
    message('RESTORE_PROFILE_HISTORY', { hostname: context.hostname, hash })
  );
  if (!response.success || !isProfileResult(response.data)) {
    status(response.success ? 'Restore failed' : response.error.message);
    return;
  }
  context.profile = response.data.profile;
  renderRules();
  await renderHistory();
  await sendMessage(message('APPLY_CURRENT_TAB', { tabId: context.tabId }));
  status('Profile restored as a new version');
}

async function renderCatalog(): Promise<void> {
  const response = await sendMessage(message('GET_COMMUNITY_CATALOG', {}));
  const host = byId('catalog');
  host.replaceChildren();
  if (!response.success || !isCatalog(response.data)) {
    host.textContent = 'Catalog unavailable';
    return;
  }
  for (const entry of response.data.entries) {
    const row = document.createElement('div');
    row.className = 'catalog-item';
    const name = document.createElement('span');
    name.textContent = entry.displayName;
    const badge = document.createElement('small');
    badge.textContent = `offline · ${entry.verification} · live ${entry.liveStatus}`;
    row.append(name, badge);
    host.append(row);
  }
}
function checkbox(
  labelText: string,
  checked: boolean,
  onChange: (value: boolean) => void
): HTMLLabelElement {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  label.append(input, document.createTextNode(labelText));
  return label;
}
function select(
  labelText: string,
  values: readonly (readonly [string, string])[],
  current: string,
  onChange: (value: string) => void
): HTMLLabelElement {
  const label = document.createElement('label');
  label.textContent = labelText;
  const input = document.createElement('select');
  for (const [value, text] of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    option.selected = value === current;
    input.append(option);
  }
  input.addEventListener('change', () => onChange(input.value));
  label.append(input);
  return label;
}
function number(
  labelText: string,
  current: number,
  onChange: (value: number) => void
): HTMLLabelElement {
  const label = document.createElement('label');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.max = '5000';
  input.value = String(current);
  input.addEventListener('change', () =>
    onChange(Math.max(0, Math.min(5000, Number(input.value))))
  );
  label.append(input);
  return label;
}
function activeTab(): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) =>
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
      tabs[0] ? resolve(tabs[0]) : reject(new Error('No active tab'))
    )
  );
}
function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing ${id}`);
  return element;
}
function status(value: string): void {
  byId('status').textContent = value;
}
function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isRuntimeSnapshot(value: unknown): value is RuntimeSnapshot {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    value.schemaVersion === '1.1.0' &&
    'lifecycleState' in value &&
    'degradationLevel' in value &&
    'backpressure' in value &&
    'profileHealth' in value &&
    'performance' in value &&
    'streaming' in value
  );
}

function isRecordedFixture(value: unknown): value is RecordedFixtureSummary {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    value.schemaVersion === '1.0.0' &&
    'textIncluded' in value &&
    value.textIncluded === false &&
    'counts' in value
  );
}

function isHistoryResult(value: unknown): value is { entries: ProfileHistoryEntry[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'entries' in value &&
    Array.isArray(value.entries)
  );
}

function isContextData(value: unknown): value is {
  global: Settings;
  site: PerSiteSettings | undefined;
  profile?: SiteProfile | null;
  detectedSite?: DetectedSite | null;
} {
  return typeof value === 'object' && value !== null && 'global' in value;
}
function isProfileResult(value: unknown): value is { profile: SiteProfile } {
  return typeof value === 'object' && value !== null && 'profile' in value;
}
function isCatalog(value: unknown): value is { entries: CommunityCatalogEntry[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'entries' in value &&
    Array.isArray(value.entries)
  );
}
