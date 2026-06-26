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
  browserStatus: {
    chrome: 'not-run' | 'passed' | 'failed';
    edge: 'not-run' | 'passed' | 'failed';
    firefox: 'not-run' | 'passed' | 'failed';
  };
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
export interface PerformancePhaseSummary {
  phase: string;
  samples: number;
  minDurationMs: number;
  totalDurationMs: number;
  maxDurationMs: number;
  averageDurationMs: number;
  p95DurationMs: number;
  p95SampleWindow: number;
  totalCount: number;
}
export interface RuntimePerformanceSnapshot {
  schemaVersion: '1.1.0';
  generatedAt: string;
  phases: readonly PerformancePhaseSummary[];
}
export interface StreamingSnapshot {
  queuedRoots: number;
  batchesFlushed: number;
  rootsFlushed: number;
  maxBurstSize: number;
  pending: boolean;
  acceptedRoots: number;
  duplicateRoots: number;
  coalescedRoots: number;
  rejectedRoots: number;
  forcedFlushes: number;
  overflowEpisodes: number;
  flushFailures: number;
  activeOverflowEpisodeId: number | null;
  lastFlushReason: 'quiet-window' | 'max-wait' | 'capacity' | 'manual' | null;
  quietForMs: number;
}

export interface CaptureReadiness {
  status: 'ready' | 'partial' | 'blocked';
  reasonCodes: readonly string[];
  certificationEligible: boolean;
  streamingPending: boolean;
  candidateQueuesEmpty: boolean;
  discoveryQueuesEmpty: boolean;
  textBlockEnumerationsPending: number;
  textBlocksProcessingPending: number;
  typographyContinuationsPending: number;
  typographyProtectionReconciliationsPending: number;
  recentLongTaskSignal: boolean;
}

export interface RuntimePageDebugElement {
  tag: string;
  dir: 'rtl' | 'ltr' | 'auto' | null;
  role: string | null;
  computedDirection: string;
  computedTextAlign: string;
  computedFontFamily: string;
}

export interface RuntimePageDebugSnapshot {
  schemaVersion: '1.2.0';
  buildFlavor: 'font-binaries' | 'no-font-binaries';
  htmlDir: 'rtl' | 'ltr' | 'auto' | null;
  bodyDir: 'rtl' | 'ltr' | 'auto' | null;
  documentLang: string | null;
  styleElementPresent: boolean;
  styleElementHasBundledFontFace: boolean;
  fontSetStatus: 'loading' | 'loaded' | 'unsupported';
  fontSetReady: boolean;
  declaredFontFaces: number;
  loadedFontFaces: number;
  errorFontFaces: number;
  ownedCandidates: number;
  ownedTypographyTargets: number;
  ownedWrappers: number;
  firstOwnedCandidate: RuntimePageDebugElement | null;
  firstTypographyTarget: RuntimePageDebugElement | null;
  effectiveSettings: {
    siteMode: SiteMode;
    directionCorrection: boolean;
    bidiIsolation: boolean;
    typography: boolean;
    formFieldDirection: boolean;
    inputDirectionAssistant: boolean;
    listRepair: boolean;
    latinFont: LatinFontPreference;
    persianFont: PersianFontPreference;
    settingsScope: SettingsScopeMode;
    confirmedSuspiciousDirection: boolean;
  };
  diagnosticsCount: number;
  correctionCount: number;
  codeZoneCount: number;
  observerActive: boolean;
  closedShadowDomEnabled: boolean;
  closedShadowPatchInstalled: boolean;
  openShadowRootCount: number;
  closedShadowRootCount: number;
  processedShadowRootCount: number;
  closedShadowProcessCount: number;
  streaming: StreamingSnapshot;
  performance: RuntimePerformanceSnapshot;
  pageClassifier: {
    pageType: string;
    confidence: number;
    signals: Readonly<Record<string, string | number | boolean>>;
  };
  siteProfile: ProfileHealthReport;
  captureReadiness: CaptureReadiness;
}

export interface RuntimeSnapshot {
  captureReadiness: CaptureReadiness;
  pageDebug?: RuntimePageDebugSnapshot;
  streaming?: StreamingSnapshot;
  performance?: RuntimePerformanceSnapshot;
}

export interface ElementInspection {
  tag: string;
  role: string | null;
  idHash: string | null;
  classHash: string | null;
  ownTextLength: number;
  textSampleHash: string | null;
  htmlLang: string | null;
  nearestLang: string | null;
  localDir: 'rtl' | 'ltr' | 'auto' | null;
  nearestDir: 'rtl' | 'ltr' | 'auto' | null;
  computedDirection: string;
  computedTextAlign: string;
  computedFontFamily: string;
  writingMode: string;
  unicodeBidi: string;
  display: string;
  whiteSpace: string;
  editable: boolean;
  inCodeZone: boolean;
  inMathZone: boolean;
  inEditorZone: boolean;
  inOwnedWrapper: boolean;
  ownedCandidate: boolean;
  ownedTypographyTarget: boolean;
  classification: {
    language: ContentLanguage;
    confidence: number;
    detectedDirection: BaseDirection;
  };
  directionEvidence: DirectionEvidence;
  directionAction: DirectionAction;
  tokenCount: number;
  bidiTokens: readonly BidiToken[];
  typography: {
    expectedPersianFont: PersianFontPreference;
    expectedLatinFont: LatinFontPreference;
    actualFontFamily: string;
    matchedExpected: boolean;
  };
  appliedMarkers: readonly string[];
  timestamp: string;
}

export interface FailureElementEvidence extends ElementInspection {
  selectorPathHash: string | null;
  domDepth: number;
  siblingIndexHash: string | null;
  previousSiblingHash: string | null;
  nextSiblingHash: string | null;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  boundingClientRect: {
    width: number;
    height: number;
    topBucket: number;
    leftBucket: number;
    visible: boolean;
  };
  scroll: {
    xBucket: number;
    yBucket: number;
  };
  screenshotIncluded: false;
  rawTextIncluded: false;
  rawHtmlIncluded: false;
}

export interface FailureElementEvidenceForReport extends FailureElementEvidence {
  selectionMode: 'automatic' | 'manual';
  selectionReason: string;
  locationMatch: boolean;
}

export type FailureEvidenceStatus =
  | 'page_not_eligible'
  | 'capture_blocked'
  | 'profile_not_selected'
  | 'profile_degraded'
  | 'direction_not_applied'
  | 'typography_not_applied'
  | 'code_zone_corrupted'
  | 'candidate_not_detected'
  | 'partial_evidence'
  | 'configuration_disabled'
  | 'unknown';

export type FailureEvidenceSectionStatus = 'available' | 'no_data';

export interface FailureEvidenceDocumentProvenance {
  tabId: number;
  frameId: number;
  browserDocumentId: string | null;
  contentDocumentInstanceId: string | null;
  documentGeneration: number | null;
  lifecycle: string | null;
  provenanceStatus: 'matched' | 'mismatch' | 'unknown';
}

export interface FailureEvidenceSection<T> {
  schemaVersion: '1.0.0';
  status: FailureEvidenceSectionStatus;
  reasonCode: string;
  capturedAt: string;
  document: FailureEvidenceDocumentProvenance;
  byteLength: number;
  data: T | null;
}

export interface RecordedFixtureSummary {
  schemaVersion: '1.0.0';
  fixtureId: string | null;
  matchedFixture: boolean;
  fixtureVersion: string | null;
  expectationStatus: 'matched' | 'mismatch' | 'not_applicable';
}

export interface FailureProfileEvidence {
  profileId: string | null;
  profileVersion: number | null;
  profileSource: 'official' | 'community' | 'user-picker' | 'none';
  health: ProfileHealthReport | null;
  selectedElementDecision: RuleMatchInspection | null;
}

export interface FailureEvidenceReport {
  schemaVersion: '1.0.0';
  generatedAt: string;
  reportId: string;
  reportKind: 'failure-evidence';
  consent: {
    userInitiated: true;
    textContentIncluded: false;
    htmlContentIncluded: false;
    formValuesIncluded: false;
    cookiesIncluded: false;
    localStorageIncluded: false;
    networkCaptureIncluded: false;
    screenshotIncluded: false;
    automaticUpload: false;
  };
  location: {
    scheme: string;
    hostname: string | null;
    pathnameDepth: number;
    pathnameHash: string | null;
  };
  pageEligibility: {
    status: 'eligible' | 'browser_restricted' | 'unsupported_scheme' | 'permission_missing';
    reasonCode: string;
    hostPermission: 'granted' | 'not_granted' | 'not_applicable' | 'unknown';
    contentScriptRegistered: boolean | null;
    contentScriptReachable: boolean;
    contentDeliveryStatus:
      | 'delivered'
      | 'discarded'
      | 'loading'
      | 'frozen'
      | 'unreachable'
      | 'timeout'
      | 'invalid_response'
      | 'missing_tab'
      | 'not_applicable';
  };
  environment: {
    extensionId: string;
    extensionVersion: string;
    browserFamily: string;
    browserVersion: string | null;
    platform: string;
    architecture: string;
  };
  operationalState: {
    safeModeActive: boolean;
    updatePending: boolean;
  };
  runtimeSnapshot: FailureEvidenceSection<RuntimeSnapshot>;
  fixtureSummary: FailureEvidenceSection<RecordedFixtureSummary>;
  profileEvidence: FailureEvidenceSection<FailureProfileEvidence>;
  selectedElement: FailureEvidenceSection<FailureElementEvidenceForReport>;
  diagnostics: readonly Diagnostic[];
  analysis: {
    status: 'complete' | 'partial' | 'insufficient_evidence';
    reasonCodes: readonly string[];
  };
  userObservation: {
    expected: string;
    actual: string;
  };
  conclusion: {
    status: FailureEvidenceStatus;
    reasonCode: string;
  };
}

export type FailureEvidenceExportBlockedReason = 'RTLX-CAPTURE-VISIBLE-TAB-REQUIRED';

export type FailureEvidenceExportResult =
  | Readonly<{ content: string; report: FailureEvidenceReport }>
  | Readonly<{
      status: 'blocked';
      reasonCode: FailureEvidenceExportBlockedReason;
    }>;
