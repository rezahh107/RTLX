export type SiteMode = 'disabled' | 'ask' | 'auto-safe' | 'force-candidate-rtl';
export type EnabledSiteMode = Exclude<SiteMode, 'disabled'>;
export type LatinFontPreference = 'inter' | 'amazon-ember-local' | 'preserve';
export type PersianFontPreference = 'vazirmatn-bundled' | 'local-first';
export type SettingsScopeMode = 'site' | 'conversation';

export interface Settings {
  schemaVersion: '2.1.0';
  enabled: boolean;
  siteMode: SiteMode;
  directionCorrection: boolean;
  bidiIsolation: boolean;
  typography: boolean;
  interactiveTextMutation: boolean;
  formFieldDirection: boolean;
  inputDirectionAssistant: boolean;
  listRepair: boolean;
  latinFont: LatinFontPreference;
  persianFont: PersianFontPreference;
  settingsScope: SettingsScopeMode;
  aggressiveNaturalLanguageWrapping: boolean;
  closedShadowDom: boolean;
  remoteProfiles: boolean;
  telemetry: false;
  diagnosticsPersistence: boolean;
}

export interface PerSiteSettings {
  siteMode?: SiteMode;
  lastEnabledSiteMode?: EnabledSiteMode;
  directionCorrection?: boolean;
  bidiIsolation?: boolean;
  typography?: boolean;
  formFieldDirection?: boolean;
  inputDirectionAssistant?: boolean;
  listRepair?: boolean;
  latinFont?: LatinFontPreference;
  persianFont?: PersianFontPreference;
  settingsScope?: SettingsScopeMode;
  confirmedSuspiciousDirection?: boolean;
}

export type DiagnosticSeverity = 'info' | 'warning' | 'error' | 'fatal';
export type DiagnosticScope = 'feature' | 'candidate' | 'frame' | 'site' | 'extension';

export interface Diagnostic {
  schemaVersion: '1.0.0';
  code: string;
  severity: DiagnosticSeverity;
  requirementId: string;
  scope: DiagnosticScope;
  timestamp: string;
  details: Readonly<Record<string, string | number | boolean | null>>;
}

export type ContentLanguage =
  | 'persian'
  | 'arabic-script-non-persian'
  | 'latin'
  | 'mixed'
  | 'unknown';
export type BaseDirection = 'rtl' | 'ltr' | 'unknown';

export interface PersianSignals {
  totalLetters: number;
  arabicScriptLetters: number;
  persianDistinctLetters: number;
  latinLetters: number;
  lexicalHits: number;
  explicitLangFa: boolean;
}

export interface LanguageResult {
  language: ContentLanguage;
  confidence: number;
  detectedDirection: BaseDirection;
  signals: PersianSignals;
}

export interface DirectionEvidence {
  localDir: 'rtl' | 'ltr' | 'auto' | null;
  nearestAncestorDir: 'rtl' | 'ltr' | 'auto' | null;
  documentDirDeclared: boolean;
  detectedDirection: BaseDirection;
  language: ContentLanguage;
  languageConfidence: number;
  userMode: SiteMode;
  hardExcluded: boolean;
  codeZone: boolean;
  isHtmlOrBody: boolean;
  userConfirmedSuspiciousDirection: boolean;
}

export type DirectionAction =
  | 'preserve'
  | 'set-rtl-on-candidate'
  | 'set-ltr-on-code-zone'
  | 'set-ltr-on-candidate'
  | 'set-auto-on-unknown-runtime-text'
  | 'request-user-confirmation'
  | 'no-op';

export type TokenType =
  | 'existing_semantic_boundary'
  | 'inline_code'
  | 'url'
  | 'email'
  | 'file_path'
  | 'package_identifier'
  | 'api_signature'
  | 'cli_flag_or_command'
  | 'technical_identifier'
  | 'version'
  | 'ip_mac_phone'
  | 'natural_ltr_phrase';

export interface BidiToken {
  start: number;
  end: number;
  type: TokenType;
  priority: number;
  direction: 'ltr' | 'rtl' | 'auto';
}

export type ElementKind = 'content' | 'code' | 'math' | 'editor' | 'terminal' | 'ignore';
export type QuickOverrideMode = 'content' | 'ltr' | 'ignore';
export type ProfileSelectorGroup =
  | 'content'
  | 'code'
  | 'math'
  | 'editor'
  | 'terminal'
  | 'exclude'
  | 'mutationSensitive';
export type ProfileRuleCategory = ElementKind | 'mutationSensitive';
export type RuleDirectionMode = 'auto-safe' | 'force-rtl' | 'force-ltr' | 'preserve';
export type RuleAlignmentMode = 'start' | 'preserve';
export type RuleTypographyMode = 'persian-only' | 'preserve';

export interface ProfileSelectorsV2 {
  content: string[];
  exclude: string[];
  code: string[];
  math: string[];
  editor: string[];
  terminal: string[];
  mutationSensitive: string[];
}

export interface ProfileRule {
  ruleId: string;
  selector: string;
  category: ProfileRuleCategory;
  enabled: boolean;
  directionMode: RuleDirectionMode;
  alignmentMode: RuleAlignmentMode;
  typographyMode: RuleTypographyMode;
  initialDelayMs: number;
  healthExpectation?: 'required' | 'optional';
  alternativeGroup?: string;
}

export interface ProfileScopePolicy {
  mode: SettingsScopeMode;
  pathDepth: 1 | 2 | 3;
}

export interface SiteProfile {
  schemaVersion: '3.0.0';
  profileId: string;
  profileVersion: number;
  profileKind: 'bundled' | 'user';
  displayName: string;
  match: { hosts: string[]; pathPrefixes: string[] };
  selectors: ProfileSelectorsV2;
  rules: ProfileRule[];
  scopePolicy: ProfileScopePolicy;
  features: { direction: boolean; bidi: boolean; typography: boolean; shadowOpen: boolean };
  thresholds: Readonly<Record<string, number>>;
  metadata: {
    source: 'official' | 'user-picker' | 'imported' | 'community';
    verification:
      | 'verified-fixture'
      | 'synthetic-fixture'
      | 'user-authored'
      | 'signature-verified'
      | 'unverified';
    product: string | null;
  };
}

export interface LegacySiteProfileV2 {
  schemaVersion: '2.0.0';
  profileId: string;
  profileVersion: number;
  profileKind: 'bundled' | 'user';
  displayName: string;
  match: { hosts: string[]; pathPrefixes: string[] };
  selectors: ProfileSelectorsV2;
  features: { direction: boolean; bidi: boolean; typography: boolean; shadowOpen: boolean };
  thresholds: Readonly<Record<string, number>>;
  metadata: {
    source: 'official' | 'user-picker' | 'imported';
    verification: 'verified-fixture' | 'synthetic-fixture' | 'user-authored' | 'unverified';
    product: string | null;
  };
}

export interface LegacySiteProfileV1 {
  schemaVersion: '1.0.0';
  profileId: string;
  profileVersion: number;
  match: { hosts: string[]; pathPrefixes: string[] };
  selectors: { content: string[]; exclude: string[]; code: string[]; mutationSensitive: string[] };
  features: { direction: boolean; bidi: boolean; typography: boolean; shadowOpen: boolean };
  thresholds: Readonly<Record<string, number>>;
}

export interface SignedProfileEnvelope {
  schemaVersion: '3.0.0';
  profileId: string;
  profileVersion: number;
  issuedAt: string;
  expiresAt: string;
  keyId: string;
  algorithm: 'ECDSA-P256-SHA256';
  canonicalization: 'RFC8785';
  payload: SiteProfile;
  signature: string;
}

export interface PublicKeyRecord {
  keyId: string;
  notBefore: string;
  notAfter: string;
  revoked: boolean;
  jwk: JsonWebKey;
}

export interface PublicKeyRegistry {
  schemaVersion: '1.0.0';
  registryVersion: 1;
  keys: PublicKeyRecord[];
  verificationState: 'verified' | 'insufficient_evidence';
}

export interface PickerSelection {
  schemaVersion: '2.0.0';
  hostname: string;
  kind: ElementKind;
  selector: string;
  directionMode: RuleDirectionMode;
  alignmentMode: RuleAlignmentMode;
  typographyMode: RuleTypographyMode;
  initialDelayMs: number;
}

export interface ProfileExportPackage {
  schemaVersion: '2.0.0';
  productVersion: string;
  profiles: SiteProfile[];
}

export interface DetectedSite {
  siteId: string;
  displayName: string;
  hostname: string;
  category: 'ai' | 'developer' | 'productivity' | 'communication';
}

export interface CommunityCatalogEntry {
  catalogId: string;
  displayName: string;
  profileId: string;
  hosts: readonly string[];
  source: 'bundled' | 'imported-signed';
  verification: 'verified-fixture' | 'synthetic-fixture' | 'signature-verified';
  availableOffline: true;
  fixtureStatus: 'verified' | 'synthetic' | 'failed';
  liveStatus: 'not-run' | 'passed' | 'failed';
  browserStatus: { chrome: 'not-run' | 'passed' | 'failed'; edge: 'not-run' | 'passed' | 'failed'; firefox: 'not-run' | 'passed' | 'failed' };
  lastCheckedAt: string | null;
}

export type ProfileHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'no-match'
  | 'excessive-match'
  | 'invalid-selector'
  | 'disabled'
  | 'not-applicable';

export interface ProfileRuleHealth {
  ruleId: string;
  category: ProfileRuleCategory;
  impact: 'semantic' | 'protective';
  status: ProfileHealthStatus;
  matchCount: number;
}

export interface ProfileHealthReport {
  schemaVersion: '1.1.0';
  profileId: string | null;
  profileVersion: number | null;
  profileMode: 'none' | 'protective-only' | 'semantic-assisted';
  status: ProfileHealthStatus;
  checkedAt: string;
  maxMatchesPerRule: number;
  rules: readonly ProfileRuleHealth[];
}

export interface RuleMatchInspection {
  ruleId: string;
  category: ProfileRuleCategory;
  profileOrder: number;
  accepted: boolean;
  reason: 'first-enabled-match' | 'suppressed-later-match';
}
