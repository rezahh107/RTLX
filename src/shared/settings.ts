import { SETTINGS_SCHEMA_VERSION } from './constants';
import type {
  LatinFontPreference,
  PerSiteSettings,
  PersianFontPreference,
  Settings,
  SettingsScopeMode,
  SiteMode,
} from './types';
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  enabled: true,
  siteMode: 'auto-safe',
  directionCorrection: true,
  bidiIsolation: true,
  typography: true,
  interactiveTextMutation: false,
  formFieldDirection: false,
  inputDirectionAssistant: false,
  listRepair: true,
  latinFont: 'amazon-ember-local',
  persianFont: 'local-first',
  settingsScope: 'site',
  aggressiveNaturalLanguageWrapping: false,
  closedShadowDom: false,
  remoteProfiles: false,
  telemetry: false,
  diagnosticsPersistence: false,
});
const SITE_MODES = new Set<SiteMode>(['disabled', 'ask', 'auto-safe', 'force-candidate-rtl']);
const LATIN_FONTS = new Set<LatinFontPreference>(['inter', 'amazon-ember-local', 'preserve']);
const PERSIAN_FONTS = new Set<PersianFontPreference>(['vazirmatn-bundled', 'local-first']);
const SCOPE_MODES = new Set<SettingsScopeMode>(['site', 'conversation']);
export function validateSettings(v: unknown): v is Settings {
  if (!isRecord(v)) return false;
  return (
    v.schemaVersion === SETTINGS_SCHEMA_VERSION &&
    typeof v.enabled === 'boolean' &&
    typeof v.siteMode === 'string' &&
    SITE_MODES.has(v.siteMode as SiteMode) &&
    typeof v.directionCorrection === 'boolean' &&
    typeof v.bidiIsolation === 'boolean' &&
    typeof v.typography === 'boolean' &&
    typeof v.interactiveTextMutation === 'boolean' &&
    typeof v.formFieldDirection === 'boolean' &&
    typeof v.inputDirectionAssistant === 'boolean' &&
    typeof v.listRepair === 'boolean' &&
    typeof v.latinFont === 'string' &&
    LATIN_FONTS.has(v.latinFont as LatinFontPreference) &&
    typeof v.persianFont === 'string' &&
    PERSIAN_FONTS.has(v.persianFont as PersianFontPreference) &&
    typeof v.settingsScope === 'string' &&
    SCOPE_MODES.has(v.settingsScope as SettingsScopeMode) &&
    typeof v.aggressiveNaturalLanguageWrapping === 'boolean' &&
    typeof v.closedShadowDom === 'boolean' &&
    typeof v.remoteProfiles === 'boolean' &&
    v.telemetry === false &&
    typeof v.diagnosticsPersistence === 'boolean'
  );
}
export function mergeSettings(g: Settings, s: PerSiteSettings | undefined): Settings {
  if (!s) return g;
  return Object.freeze({
    ...g,
    ...(s.siteMode === undefined ? {} : { siteMode: s.siteMode }),
    ...(s.directionCorrection === undefined ? {} : { directionCorrection: s.directionCorrection }),
    ...(s.bidiIsolation === undefined ? {} : { bidiIsolation: s.bidiIsolation }),
    ...(s.typography === undefined ? {} : { typography: s.typography }),
    ...(s.formFieldDirection === undefined ? {} : { formFieldDirection: s.formFieldDirection }),
    ...(s.inputDirectionAssistant === undefined
      ? {}
      : { inputDirectionAssistant: s.inputDirectionAssistant }),
    ...(s.listRepair === undefined ? {} : { listRepair: s.listRepair }),
    ...(s.latinFont === undefined ? {} : { latinFont: s.latinFont }),
    ...(s.persianFont === undefined ? {} : { persianFont: s.persianFont }),
    ...(s.settingsScope === undefined ? {} : { settingsScope: s.settingsScope }),
    telemetry: false,
  });
}
export function migrateSettings(v: unknown): Settings {
  if (validateSettings(v)) return Object.freeze({ ...v });
  if (!isRecord(v)) return DEFAULT_SETTINGS;
  return Object.freeze({
    ...DEFAULT_SETTINGS,
    ...(typeof v.enabled === 'boolean' ? { enabled: v.enabled } : {}),
    ...(typeof v.siteMode === 'string' && SITE_MODES.has(v.siteMode as SiteMode)
      ? { siteMode: v.siteMode as SiteMode }
      : {}),
    ...(typeof v.directionCorrection === 'boolean'
      ? { directionCorrection: v.directionCorrection }
      : {}),
    ...(typeof v.bidiIsolation === 'boolean' ? { bidiIsolation: v.bidiIsolation } : {}),
    ...(typeof v.typography === 'boolean' ? { typography: v.typography } : {}),
    ...(typeof v.interactiveTextMutation === 'boolean'
      ? { interactiveTextMutation: v.interactiveTextMutation }
      : {}),
    ...(typeof v.formFieldDirection === 'boolean'
      ? { formFieldDirection: v.formFieldDirection }
      : {}),
    ...(typeof v.inputDirectionAssistant === 'boolean'
      ? { inputDirectionAssistant: v.inputDirectionAssistant }
      : {}),
    ...(typeof v.listRepair === 'boolean' ? { listRepair: v.listRepair } : {}),
    ...(typeof v.latinFont === 'string' && LATIN_FONTS.has(v.latinFont as LatinFontPreference)
      ? { latinFont: v.latinFont as LatinFontPreference }
      : {}),
    ...(typeof v.persianFont === 'string' &&
    PERSIAN_FONTS.has(v.persianFont as PersianFontPreference)
      ? { persianFont: v.persianFont as PersianFontPreference }
      : {}),
    ...(typeof v.settingsScope === 'string' && SCOPE_MODES.has(v.settingsScope as SettingsScopeMode)
      ? { settingsScope: v.settingsScope as SettingsScopeMode }
      : {}),
    ...(typeof v.aggressiveNaturalLanguageWrapping === 'boolean'
      ? { aggressiveNaturalLanguageWrapping: v.aggressiveNaturalLanguageWrapping }
      : {}),
    ...(typeof v.closedShadowDom === 'boolean' ? { closedShadowDom: v.closedShadowDom } : {}),
    ...(typeof v.remoteProfiles === 'boolean' ? { remoteProfiles: v.remoteProfiles } : {}),
    ...(typeof v.diagnosticsPersistence === 'boolean'
      ? { diagnosticsPersistence: v.diagnosticsPersistence }
      : {}),
    telemetry: false,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
  });
}
export function siteStorageKey(hostname: string): string {
  return `rtlx:site:${hostname.toLowerCase()}`;
}
export function conversationStorageKey(hostname: string, scopeHash: string): string {
  if (!/^[a-f0-9]{64}$/u.test(scopeHash)) throw new Error('Invalid conversation scope hash');
  return `rtlx:conversation:${hostname.toLowerCase()}:${scopeHash}`;
}
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
