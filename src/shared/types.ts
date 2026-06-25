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
  productVersion: '15.9.11';
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
  degradation: {
    level: 0 | 1 | 2 | 3 | 4;
    transitions: number;
    recoveryTransitions: number;
    lastTransitionReason: string | null;
    dwellTimeMsByLevel: Readonly<Record<'0' | '1' | '2' | '3' | '4', number>>;
  };
  provenance: {
    buildInputHash: string;
    profileHash: string | null;
  };
  captureReadiness: CaptureReadiness;
  captureStabilization: CaptureStabilizationSnapshot;
  startupReconciliation: StartupReconciliationSnapshot;
  detachedWorkPruned: {
    textBlockEnumerations: number;
    typographyContinuations: number;
    typographyProtectionReconciliations: number;
  };
  profileHealth: ProfileHealthReport;
  performance: RuntimePerformanceSnapshot;
  streaming: StreamingSnapshot;
  backpressure: {
    level: 'normal' | 'pressure' | 'hidden';
    sliceMs: number;
    nodesPerSlice: number;
    queueDepth: number;
    mutationBurst: number;
    longTaskSignal: boolean;
  };
  delayedWork: { buckets: number; candidates: number; rejected: number };
  visibility: { targets: number; capacityFallbacks: number };
  diagnosticBatch: { pending: number; timerActive: boolean; batchesInWindow: number };
  pendingCandidates: number;
  pendingDiscoveryRoots: number;
  queues: {
    visibleCandidates: number;
    backgroundCandidates: number;
    discoveryRoots: number;
  };
  discovery: {
    activeCursors: number;
    batches: number;
    continuations: number;
    completedRoots: number;
    limitHits: number;
    visitedNodes: number;
    candidatesDiscovered: number;
  };
  typography: {
    targetsApplied: number;
    targetsReconciled: number;
    verificationChecks: number;
    verificationFailures: number;
  };
  processing: {
    processedCandidates: number;
    explicitLtrPersianCandidates: number;
    queuedVisible: number;
    queuedBackground: number;
  };
  classifications: {
    persian: number;
    mixed: number;
    latin: number;
    arabicScriptNonPersian: number;
    unknown: number;
  };
  directionDecisions: {
    rtl: number;
    ltr: number;
    preserve: number;
    noOp: number;
    confirmation: number;
  };
  notModifiedReasons: Readonly<Record<string, number>>;
  ruleEffectiveness: readonly {
    ruleId: string;
    evaluated: number;
    accepted: number;
    suppressed: number;
    mutationsApplied: number;
    preserved: number;
    selectorMatched: number;
    ruleAccepted: number;
    ruleSuppressed: number;
    mutationOperationsCommitted: number;
    directionPreserved: number;
  }[];
  textDecisionCache: {
    hits: number;
    misses: number;
    stores: number;
  };
  processedTextFingerprintCache: {
    hits: number;
    misses: number;
    stores: number;
  };
  textBlockCoverage: {
    semanticRegions: number;
    textBlocksDiscovered: number;
    textBlocksProcessed: number;
    textBlockKinds: Readonly<Record<string, number>>;
    textBlockElementsInspected: number;
    textBlockEnumerationContinuationsQueued: number;
    textBlockEnumerationsCompleted: number;
    textBlockEnumerationsPending: number;
    typographyNodesInspected: number;
    typographyNodesEligible: number;
    typographyTargetsPlanned: number;
    typographyContinuationsQueued: number;
    typographyScansCompleted: number;
    typographyContinuationsPending: number;
    typographyProtectionReconciliationsPending: number;
    typographySkipped: Readonly<Record<string, number>>;
  };
  layoutSafety: {
    semanticLayoutContainers: number;
    uniqueSemanticLayoutContainers: number;
    directionTargetsRedirected: number;
    uniqueDirectionTargetsRedirected: number;
    directionMutationsSuppressed: number;
    directionTargetRedirectReasons: Readonly<Record<string, number>>;
  };
  metricsScope: {
    discovery: 'runtime-lifetime';
    processing: 'runtime-lifetime';
    fixtureSummary: 'current-dom';
  };
  wrapperLifecycle: {
    created: number;
    externallyRemoved: number;
    current: number;
  };
  fontDiagnostics: {
    fontSetStatus: 'loading' | 'loaded' | 'unsupported';
    fontSetReady: boolean;
    buildFlavor: 'font-binaries' | 'no-font-binaries';
    declaredFaces: number;
    loadedFaces: number;
    errorFaces: number;
    exactLocalFontUsed: 'unknown';
  };
  observedRoots: number;
  observedMutationRoots: number;
  ownedMutationSignatures: number;
  wrapperCount: number;
  journalEntries: number;
  pageDebug: RuntimePageDebugSnapshot;
}

export interface RecordedFixtureSummary {
  schemaVersion: '1.0.0';
  productVersion: '15.9.11';
  buildFlavor: 'font-binaries' | 'no-font-binaries';
  textIncluded: false;
  profileId: string | null;
  profileVersion: number | null;
  counts: {
    candidates: number;
    ownedCandidates: number;
    ownedWrappers: number;
    rtlElements: number;
    ltrElements: number;
    autoElements: number;
    codeZones: number;
    mathZones: number;
    editorZones: number;
    terminalZones: number;
  };
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
  semanticBlock: {
    tag: string;
    role: string | null;
    strategy: string;
    depth: number;
    ancestorKinds: readonly string[];
    directionTargetTag: string | null;
    directionTargetRole: string | null;
    directionTargetStrategy: string;
    directionTargetDepth: number;
    layoutSensitive: boolean;
    layoutReason: string | null;
  };
  semanticRegion: {
    tag: string;
    role: string | null;
    strategy: string;
    depth: number;
    textBlockCount: number;
  };
  textBlock: {
    tag: string;
    role: string | null;
    kind: string;
    depth: number;
  };
  directionTarget: {
    tag: string | null;
    role: string | null;
    strategy: string;
    depth: number;
    explicitDir: 'rtl' | 'ltr' | 'auto' | null;
    computedDirection: string | null;
  };
  alignmentTarget: {
    tag: string | null;
    role: string | null;
    computedTextAlign: string | null;
  };
  typographyCoverage: {
    inspected: number;
    eligible: number;
    targets: number;
    continuationPending: boolean;
  };
  directionDecision: {
    action: DirectionAction;
    reason: string;
    documentLangUsedAsStrongSignal: false;
  };
  notModifiedReason: string | null;
  mutationStatus: {
    candidateOwned: boolean;
    explicitDir: 'rtl' | 'ltr' | 'auto' | null;
    ownedWrappers: number;
    journalEntries: number;
  };
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
  classification: {
    language: ContentLanguage;
    confidence: number;
    detectedDirection: BaseDirection;
    exclusionReason: string | null;
    typographyDecision: TypographyDecision;
    directionAction: DirectionAction;
    directionReason: string;
    documentLangUsedAsStrongSignal: false;
    notModifiedReason: string | null;
  };
  semanticBlock: {
    tag: string;
    role: string | null;
    strategy: string;
    depth: number;
    ancestorKinds: readonly string[];
    directionTargetTag: string | null;
    directionTargetRole: string | null;
    directionTargetStrategy: string;
    directionTargetDepth: number;
    layoutSensitive: boolean;
    layoutReason: string | null;
  };
  semanticRegion: ElementInspection['semanticRegion'];
  textBlock: ElementInspection['textBlock'];
  directionTarget: ElementInspection['directionTarget'];
  alignmentTarget: ElementInspection['alignmentTarget'];
  typographyCoverage: ElementInspection['typographyCoverage'];
  computed: {
    direction: string;
    unicodeBidi: string;
    textAlign: string;
    writingMode: string;
    whiteSpace: string;
    display: string;
    fontFamily: string;
    flexDirection: string;
    overflowX: string;
    overflowY: string;
  };
  layout: {
    layoutSensitive: boolean;
    reason: string | null;
    containsIcons: boolean;
    containsControls: boolean;
    directNaturalText: boolean;
  };
  directionSource: {
    kind: 'explicit' | 'inherited' | 'computed-default';
    sourceDepth: number | null;
    sourceTag: string | null;
    sourceDisplay: string | null;
    sourceOwnedByRtlx: boolean;
    sourceContainsIcons: boolean;
    sourceContainsControls: boolean;
  };
  iconEvidence: {
    iconProtected: boolean;
    hasSvgDescendant: boolean;
    hasRoleImgDescendant: boolean;
    hasAriaHiddenDescendant: boolean;
    beforeContentPresent: boolean;
    afterContentPresent: boolean;
    beforePrivateUse: boolean;
    afterPrivateUse: boolean;
    beforeFontFamily: string | null;
    afterFontFamily: string | null;
  };
  font: {
    fontSetStatus: 'loading' | 'loaded' | 'unsupported';
    fontSetReady: boolean;
    declaredAliasPresent: boolean;
    exactLocalFontUsed: 'unknown';
  };
  context: {
    iframeDepth: number;
    shadowRootDepth: number;
    sameOriginTopFrame: boolean;
  };
  textShape: {
    lengthBucket: '0' | '1-20' | '21-100' | '101-250' | '251-1000' | '1000+';
    totalCodepoints: number;
    persianLetters: number;
    arabicScriptNonPersianLetters: number;
    latinLetters: number;
    digits: number;
  };
  profileMatch: {
    profileId: string | null;
    ruleId: string | null;
    matchedRuleIds: readonly string[];
    group: ProfileSelectorGroup | null;
    candidateOwned: boolean;
    ownedWrappers: number;
    journalEntries: number;
  };
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
  privacy: {
    pageTextIncluded: false;
    fullUrlIncluded: false;
    queryIncluded: false;
    fragmentIncluded: false;
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
