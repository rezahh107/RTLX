import type {
  BaseDirection,
  ContentLanguage,
  Diagnostic,
  DirectionAction,
  DirectionEvidence,
  LatinFontPreference,
  PersianFontPreference,
  ProfileHealthReport,
  ProfileSelectorGroup,
  RuleMatchInspection,
  SiteMode,
  SiteProfile,
} from './types-core';

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

export type BackpressureLevel = 'normal' | 'pressure' | 'hidden';
export interface BackpressureSnapshot {
  level: BackpressureLevel;
  sliceMs: number;
  nodesPerSlice: number;
  queueDepth: number;
  mutationBurst: number;
  longTaskSignal: boolean;
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

export interface RuntimeTextBlockCoverage {
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
}

export interface RuntimeLayoutSafetySnapshot {
  semanticLayoutContainers: number;
  uniqueSemanticLayoutContainers: number;
  directionTargetsRedirected: number;
  uniqueDirectionTargetsRedirected: number;
  directionMutationsSuppressed: number;
  directionTargetRedirectReasons: Readonly<Record<string, number>>;
}

export interface RuntimeFontDiagnosticsSnapshot {
  fontSetStatus: 'loading' | 'loaded' | 'unsupported';
  fontSetReady: boolean;
  buildFlavor: 'font-binaries' | 'no-font-binaries';
  declaredFaces: number;
  loadedFaces: number;
  errorFaces: number;
  exactLocalFontUsed: 'unknown';
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
  backpressure: BackpressureSnapshot;
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
  ruleEffectiveness: readonly Readonly<Record<string, string | number>>[];
  textDecisionCache: Record<string, number>;
  processedTextFingerprintCache: Record<string, number>;
  textBlockCoverage: RuntimeTextBlockCoverage;
  layoutSafety: RuntimeLayoutSafetySnapshot;
  metricsScope: Record<string, string>;
  wrapperLifecycle: Record<string, number>;
  fontDiagnostics: RuntimeFontDiagnosticsSnapshot;
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

export interface ElementDirectionDecisionInspection {
  action: DirectionAction;
  reason: string;
  documentLangUsedAsStrongSignal?: boolean;
}

export interface ElementMutationStatusInspection {
  candidateOwned: boolean;
  explicitDir: DirectionEvidence['localDir'];
  ownedWrappers: number;
  journalEntries: number;
}

export interface ElementTypographyCoverageInspection {
  inspected: number;
  eligible: number;
  targets: number;
  continuationPending: boolean;
}

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
  typographyCoverage: ElementTypographyCoverageInspection;
  directionDecision: ElementDirectionDecisionInspection;
  notModifiedReason: string | null;
  mutationStatus: ElementMutationStatusInspection;
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

export type FailureContentDeliveryStatus =
  | 'delivered'
  | 'discarded'
  | 'loading'
  | 'frozen'
  | 'unreachable'
  | 'timeout'
  | 'invalid_response'
  | 'missing_tab'
  | 'not_applicable';

export interface FailurePageEligibility {
  status: 'eligible' | 'browser_restricted' | 'unsupported_scheme' | 'permission_missing';
  reasonCode: string;
  hostPermission: 'granted' | 'not_granted' | 'not_applicable' | 'unknown';
  contentScriptRegistered: boolean | null;
  contentScriptReachable: boolean;
  contentDeliveryStatus: FailureContentDeliveryStatus;
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
  pageEligibility: FailurePageEligibility;
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
