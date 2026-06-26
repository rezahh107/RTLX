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
    latinFont: LatinFontPreference;
    persianFont: PersianFontPreference;
  };
}

export interface CaptureStabilizationSnapshot {
  attempted: boolean;
  initialStatus: CaptureReadiness['status'];
  finalStatus: CaptureReadiness['status'];
  waitedMs: number;
  attempts: number;
  timedOut: boolean;
}

export interface StartupReconciliationSnapshot {
  schemaVersion: '1.0.0';
  rootsInspected: number;
  previousRuntimeMarker: string | null;
  preexistingOwnedCandidates: number;
  preexistingTypographyTargets: number;
  preexistingDirectionTargets: number;
  preexistingWrappers: number;
  preexistingStyleElements: number;
  ownedDirectionAttributesRemoved: number;
  ambiguousLegacyDirectionAttributes: number;
  classesRemoved: number;
  wrappersUnwrapped: number;
  stylesRemoved: number;
  cleanupFailures: number;
  cleanupPerformed: boolean;
}

export interface RuntimeSnapshot {
  schemaVersion: '1.10.0';
  processorVersion: string;
  runtimeInstanceId: string;
  runtimeStartedAt: string;
  runtimeState: string;
  lifecycleState: 'active' | 'passive' | 'hidden' | 'frozen' | 'resumed' | 'destroyed';
  lifecycleGeneration: number;
  degradationLevel: 0 | 1 | 2 | 3 | 4;
  degradation: Record<string, unknown>;
  provenance: { buildInputHash: string; profileHash: string | null };
  captureReadiness: CaptureReadiness;
  captureStabilization: CaptureStabilizationSnapshot;
  startupReconciliation: StartupReconciliationSnapshot;
  detachedWorkPruned: Record<string, number>;
  profileHealth: ProfileHealthReport;
  performance: RuntimePerformanceSnapshot;
  streaming: StreamingSnapshot;
  backpressure: Record<string, string | number | boolean>;
  delayedWork: Record<string, number>;
  visibility: Record<string, number>;
  diagnosticBatch: Record<string, number | boolean>;
  pendingCandidates: number;
  pendingDiscoveryRoots: number;
  queues: Record<string, number>;
  discovery: Record<string, number>;
  typography: Record<string, number>;
  processing: Record<string, number>;
  classifications: Record<string, number>;
  directionDecisions: Record<string, number>;
  notModifiedReasons: Readonly<Record<string, number>>;
  ruleEffectiveness: readonly Record<string, string | number>[];
  textDecisionCache: Record<string, number>;
  processedTextFingerprintCache: Record<string, number>;
  textBlockCoverage: Record<string, unknown>;
  layoutSafety: Record<string, unknown>;
  metricsScope: Record<string, string>;
  wrapperLifecycle: Record<string, number>;
  fontDiagnostics: Record<string, string | number | boolean>;
  observedRoots: number;
  observedMutationRoots: number;
  ownedMutationSignatures: number;
  wrapperCount: number;
  journalEntries: number;
  pageDebug: RuntimePageDebugSnapshot;
}

export interface RecordedFixtureSummary {
  schemaVersion: '1.0.0';
  productVersion: string;
  buildFlavor: 'font-binaries' | 'no-font-binaries';
  textIncluded: false;
  profileId: string | null;
  profileVersion: number | null;
  counts: Record<string, number>;
}

export interface ProfileHistoryEntry {
  schemaVersion: '1.0.0';
  hash: string;
  savedAt: string;
  profileVersion: number;
  profile: SiteProfile;
}

export type TypographyDecision =
  | 'applied'
  | 'eligible'
  | 'disabled'
  | 'not-persian'
  | 'code-zone'
  | 'math-zone'
  | 'editor-zone'
  | 'terminal-zone'
  | 'icon-protected'
  | 'hard-excluded';

export interface ElementInspection {
  schemaVersion: '3.2.0';
  matchedProfile: string | null;
  matchedRule: string | null;
  matchedRules: readonly RuleMatchInspection[];
  matchedGroup: ProfileSelectorGroup | null;
  selector: string;
  exclusionReason: string | null;
  typographyDecision: TypographyDecision;
  languageClassification: ContentLanguage;
  languageConfidence: number;
  detectedDirection: BaseDirection;
  semanticBlock: Record<string, unknown>;
  semanticRegion: Record<string, unknown>;
  textBlock: Record<string, unknown>;
  directionTarget: Record<string, unknown>;
  alignmentTarget: Record<string, unknown>;
  typographyCoverage: Record<string, unknown>;
  directionDecision: Record<string, unknown>;
  notModifiedReason: string | null;
  mutationStatus: Record<string, unknown>;
}

export type FailureEvidenceStatus =
  | 'browser_restricted_page'
  | 'permission_missing'
  | 'content_script_not_registered'
  | 'content_script_unreachable'
  | 'tab_discarded'
  | 'tab_loading'
  | 'tab_frozen'
  | 'content_message_timeout'
  | 'frame_not_covered'
  | 'profile_not_selected'
  | 'profile_rule_no_match'
  | 'element_hard_excluded'
  | 'element_classified_as_code'
  | 'element_classified_as_editor'
  | 'no_rtl_candidate_detected'
  | 'safe_mode_active'
  | 'runtime_degraded'
  | 'runtime_exception'
  | 'page_structure_unsupported'
  | 'captured'
  | 'insufficient_evidence';

export interface FailureElementEvidence {
  schemaVersion: '1.2.0';
  selector: string | null;
  selectorStrategy: string | null;
  tag: string;
  role: string | null;
  explicitDir: 'rtl' | 'ltr' | 'auto' | null;
  explicitLang: string | null;
  contentEditable: boolean;
  classification: Record<string, unknown>;
  semanticBlock: ElementInspection['semanticBlock'];
  semanticRegion: ElementInspection['semanticRegion'];
  textBlock: ElementInspection['textBlock'];
  directionTarget: ElementInspection['directionTarget'];
  alignmentTarget: ElementInspection['alignmentTarget'];
  typographyCoverage: ElementInspection['typographyCoverage'];
  computed: Record<string, string>;
  layout: Record<string, string | boolean | null>;
  directionSource: Record<string, string | number | boolean | null>;
  iconEvidence: Record<string, string | boolean | null>;
  font: Record<string, string | boolean>;
  context: Record<string, number | boolean>;
  textShape: Record<string, string | number>;
  profileMatch: Record<string, string | number | boolean | null | readonly string[]>;
}

export type FailureEvidenceSectionStatus =
  | 'available'
  | 'no_data'
  | 'unavailable'
  | 'invalid_response'
  | 'timeout'
  | 'oversized'
  | 'mixed_document'
  | 'stale_document'
  | 'unsupported';

export interface FailureEvidenceDocumentProvenance {
  tabId: number;
  frameId: number | null;
  browserDocumentId: string | null;
  contentDocumentInstanceId: string | null;
  documentGeneration: number | null;
  lifecycle: string | null;
  provenanceStatus: 'matched' | 'unavailable' | 'mismatch' | 'not_applicable';
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

export interface FailureSelectorPrivacy {
  status: 'preserved' | 'redacted' | 'not_provided';
  reasonCode: string;
  tokenShape: 'none' | 'email_like' | 'account_like' | 'long_numeric' | 'unknown_sensitive';
}

export type FailureElementEvidenceForReport = Omit<FailureElementEvidence, 'selector'> & {
  selector: string | null;
  selectorPrivacy: FailureSelectorPrivacy;
};

export interface FailureProfileEvidence {
  profileId: string | null;
  profileVersion: number | null;
  profileSource: string | null;
  health: ProfileHealthReport | null;
  selectedElementDecision: FailureElementEvidence['classification'] | null;
}

export interface FailureEvidenceReport {
  schemaVersion: '1.2.0';
  productVersion: string;
  capturedAt: string;
  captureId: string;
  captureMode: 'user_initiated';
  canonicalizationVersion: '1.0.0';
  hashAlgorithm: 'sha256';
  reportHash: string | null;
  privacy: Record<string, boolean>;
  location: Record<string, string | number | null>;
  pageEligibility: Record<string, string | boolean | null>;
  environment: Record<string, string | null>;
  operationalState: Record<string, boolean>;
  runtimeSnapshot: FailureEvidenceSection<RuntimeSnapshot>;
  fixtureSummary: FailureEvidenceSection<RecordedFixtureSummary>;
  profileEvidence: FailureEvidenceSection<FailureProfileEvidence>;
  selectedElement: FailureEvidenceSection<FailureElementEvidenceForReport>;
  diagnostics: readonly Diagnostic[];
  analysis: { status: 'complete' | 'partial' | 'insufficient_evidence'; reasonCodes: readonly string[] };
  userObservation: { expected: string; actual: string };
  conclusion: { status: FailureEvidenceStatus; reasonCode: string };
}

export type FailureEvidenceExportBlockedReason = 'RTLX-CAPTURE-VISIBLE-TAB-REQUIRED';

export type FailureEvidenceExportResult =
  | Readonly<{ content: string; report: FailureEvidenceReport }>
  | Readonly<{ status: 'blocked'; reasonCode: FailureEvidenceExportBlockedReason }>;
