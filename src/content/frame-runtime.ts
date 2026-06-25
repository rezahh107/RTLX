import {
  BUILD_FLAVOR,
  DIRECTION_OWNER_ATTRIBUTE,
  LIMITS,
  OWNED_CLASS,
  OWNED_WRAPPER_CLASS,
  PROCESSOR_VERSION,
  RUNTIME_OWNER_ATTRIBUTE,
  SESSION_IGNORE_CLASS,
  STYLE_ELEMENT_ID,
  TYPOGRAPHY_CLASS,
} from '../shared/constants';
import { sendMessage } from '../shared/api-adapter';
import { BUILD_INPUT_HASH } from '../generated/build-fingerprint';
import { createDiagnostic } from '../shared/diagnostics';
import { message } from '../shared/messages';
import type {
  BidiToken,
  Diagnostic,
  ElementInspection,
  RecordedFixtureSummary,
  RuntimeSnapshot,
  Settings,
  SiteProfile,
  QuickOverrideMode,
  ProfileHealthReport,
} from '../shared/types';
import { classifyLanguage } from './language-classifier';
import { directionForEditableText } from './input-direction';
import {
  decideDirectionDetailed,
  nearestExplicitDir,
  type DirectionDecision,
} from './direction-decider';
import {
  createCandidateDiscoveryCursor,
  type CandidateDiscoveryCursor,
} from './candidate-discovery';
import { hasExistingIsolation, isHardExcluded, isMutationSensitive } from './exclusion-registry';
import { tokenizeBidi } from './bidi-tokenizer';
import { classifyCodeContext } from './code-context';
import {
  isSimpleInteractiveText,
  resolveSemanticBlock,
  semanticAncestorKinds,
} from './semantic-block-resolver';
import { resolveDirectionTarget } from './direction-target-resolver';
import {
  createTextBlockEnumerationCursor,
  DEFAULT_TEXT_BLOCK_ENUMERATION_LIMIT,
  enumerateTextBlocks,
  type TextBlockEnumerationCursor,
  type TextBlockResolution,
} from './text-block-enumerator';
import { resolveOverlaps } from './overlap-resolver';
import { planMutations } from './mutation-planner';
import {
  collectTypographyBatch,
  createTypographyProtectionCursor,
  type TypographyProtectionCursor,
} from './typography-planner';
import { planCodeZones } from './code-zone-planner';
import { applyMutationPlan, removeJournaledClass } from './mutation-applier';
import { createPlan, type MutationOperation } from './mutation-plan';
import { RuntimeContext } from './runtime-context';
import { ObserverManager } from './observer-manager';
import { RootRegistry } from './root-registry';
import { ShadowRootManager } from './shadow-root-manager';
import { cooperativeYield, scheduleTask } from './scheduler';
import { PerformanceMonitor } from './performance-monitor';
import { FailureManager } from './failure-manager';
import { evaluateCaptureReadiness } from './capture-readiness';
import { VisibilityRegistry } from './visibility-registry';
import { evaluateProfileHealth } from './profile-health';
import { StreamingStabilityController } from './streaming-stability';
import { recordFixtureSummary } from './fixture-recorder';
import { BrowserLifecycleCoordinator } from './browser-lifecycle';
import { SharedDelayQueue } from './shared-delay-queue';
import { OwnedMutationSuppression } from './owned-mutation-suppression';
import { AdaptiveBackpressure } from './adaptive-backpressure';
import { DegradationController, type DegradationTransition } from './degradation-controller';
import { DiagnosticBatcher } from './diagnostic-batcher';
import { InputEventCoalescer } from './input-event-coalescer';
import { RuntimeEvidenceAccumulator } from './runtime-evidence-accumulator';
import {
  reconcilePreexistingRuntimeOwnership,
  type StartupReconciliationSnapshot,
} from './startup-reconciliation';
import { pruneDetachedTextBlockState } from './detached-work-pruner';
import { inspectTextBlockContinuationRecovery } from './text-block-continuation-recovery';
import {
  CandidateWorkController,
  type CandidateQueueSaturationSource,
} from './candidate-work-controller';
import { planMutationIntake } from './mutation-intake';
import {
  createProcessedTextFingerprint,
  isProcessedTextFingerprintEqual,
  type ProcessedTextFingerprint,
} from './text-decision-cache';
import {
  codeLikeSelectors,
  exclusionReason,
  isProfileExcluded,
  matchedProfileGroup,
  matchedProfileRule,
  matchingProfileRules,
  matchesAny,
  protectedTextSelectors,
  typographyDecision,
} from './profile-zone';

type DiscoveryRoot = Document | ShadowRoot | Element;

export class FrameRuntime {
  private readonly context = new RuntimeContext();
  private readonly observers = new ObserverManager();
  private readonly roots = new RootRegistry();
  private readonly failures = new FailureManager();
  private readonly performance = new PerformanceMonitor();
  private readonly visibility: VisibilityRegistry;
  private readonly streaming: StreamingStabilityController;
  private readonly ownership = new OwnedMutationSuppression();
  private readonly backpressure = new AdaptiveBackpressure();
  private readonly degradation = new DegradationController();
  private readonly lifecycle: BrowserLifecycleCoordinator;
  private readonly delays: SharedDelayQueue;
  private readonly diagnosticBatcher: DiagnosticBatcher;
  private readonly inputCoalescer: InputEventCoalescer;
  private readonly evidence = new RuntimeEvidenceAccumulator();
  private readonly candidateWork = new CandidateWorkController();
  private processedTextNodes = new WeakMap<Text, ProcessedTextFingerprint>();
  private processedTypographyNodes = new WeakMap<Text, string>();
  private readonly textBlockEnumerationCursors = new Map<Element, TextBlockEnumerationCursor>();
  private readonly textBlockEnumerationResults = new Map<Element, TextBlockResolution[]>();
  private completedTextBlocks = new WeakMap<Element, readonly TextBlockResolution[]>();
  private readonly pendingTextBlockEnumerations = new Set<Element>();
  private readonly typographyProtectionCursors = new Map<Element, TypographyProtectionCursor>();
  private readonly pendingTypographyProtectionReconciliations = new Set<Element>();
  private expandedSemanticRegions = new WeakSet<Element>();
  private recordedSemanticRegions = new WeakSet<Element>();
  private recordedTextBlocks = new WeakSet<Element>();
  private processedTextBlocks = new WeakSet<Element>();
  private readonly unprocessedTextBlocks = new Map<Element, string>();
  private readonly pendingTypographyContinuations = new Set<Element>();
  private readonly pending = new Set<Element>();
  private readonly backgroundPending = new Set<Element>();
  private readonly pendingDiscovery = new Set<DiscoveryRoot>();
  private readonly discoveryCursors = new Map<DiscoveryRoot, CandidateDiscoveryCursor>();
  private readonly runtimeInstanceId = crypto.randomUUID();
  private readonly runtimeStartedAt = new Date().toISOString();
  private readonly runtimeOwnerToken = `${PROCESSOR_VERSION}:${this.runtimeInstanceId}`;
  private startupReconciliation: StartupReconciliationSnapshot = Object.freeze({
    schemaVersion: '1.0.0' as const,
    rootsInspected: 0,
    previousRuntimeMarker: null as string | null,
    preexistingOwnedCandidates: 0,
    preexistingTypographyTargets: 0,
    preexistingDirectionTargets: 0,
    preexistingWrappers: 0,
    preexistingStyleElements: 0,
    ownedDirectionAttributesRemoved: 0,
    ambiguousLegacyDirectionAttributes: 0,
    classesRemoved: 0,
    wrappersUnwrapped: 0,
    stylesRemoved: 0,
    cleanupFailures: 0,
    cleanupPerformed: false,
  });
  private startupReconciliationComplete = false;
  private readonly detachedWorkPruned = {
    textBlockEnumerations: 0,
    typographyContinuations: 0,
    typographyProtectionReconciliations: 0,
  };
  private readonly discoveryStats = {
    batches: 0,
    continuations: 0,
    completedRoots: 0,
    limitHits: 0,
    visitedNodes: 0,
    candidatesDiscovered: 0,
  };
  private readonly typographyStats = {
    targetsApplied: 0,
    targetsReconciled: 0,
    verificationChecks: 0,
    verificationFailures: 0,
  };
  private readonly processingStats = {
    processedCandidates: 0,
    explicitLtrPersianCandidates: 0,
    queuedVisible: 0,
    queuedBackground: 0,
  };
  private fontSetReady = false;
  private shadowManager: ShadowRootManager;
  private processing = false;
  private sequence = 1;
  private lastUrl = location.href;
  private wrapperCount = 0;
  private listenersRegistered = false;
  private readonly delayedReady = new WeakSet<Element>();
  private readonly ownedInputDirections = new WeakMap<HTMLElement, string>();
  private profileHealthCache: ProfileHealthReport | null = null;
  private resumeCandidateBudget: number | null = null;
  private teardownComplete = false;
  private degradationRecoveryTimer: number | null = null;
  public readonly diagnostics: Diagnostic[] = [];

  public constructor(
    private settings: Settings,
    private readonly profile: SiteProfile | null,
    private readonly confirmedSuspicious: boolean,
    private readonly profileHash: string | null
  ) {
    this.shadowManager = new ShadowRootManager(this.roots, settings.closedShadowDom);
    this.visibility = new VisibilityRegistry((candidate) => {
      this.backgroundPending.delete(candidate);
      this.enqueueReady(candidate);
      void this.flush();
    });
    this.streaming = new StreamingStabilityController((roots) => {
      if (!this.lifecycle.canMutate() || this.degradation.isPaused()) return;
      for (const root of roots) {
        this.queueDiscovery(root);
        if (root instanceof Element) {
          const candidate = nearestCandidate(root);
          if (candidate) this.queue(candidate);
        }
      }
      void this.flush();
    });
    this.delays = new SharedDelayQueue(
      (candidate) => {
        this.delayedReady.add(candidate);
        this.queue(candidate);
        void this.flush();
      },
      (generation) => this.lifecycle.isCurrentGeneration(generation)
    );
    this.diagnosticBatcher = new DiagnosticBatcher((diagnostics) =>
      this.sendDiagnosticBatch(diagnostics)
    );
    this.inputCoalescer = new InputEventCoalescer((target, value) =>
      this.processEditableInput(target, value)
    );
    this.lifecycle = new BrowserLifecycleCoordinator({
      onSuspend: () => this.suspendForLifecycle(false),
      onFreeze: () => this.suspendForLifecycle(true),
      onResume: () => this.resumeFromLifecycle(),
      onDestroy: () => this.teardownRuntime(),
    });
  }

  public async start(): Promise<void> {
    this.lifecycle.start();
    if (this.lifecycle.canMutate() && !this.startupReconciliationComplete) {
      this.startupReconciliation = reconcilePreexistingRuntimeOwnership(document);
      this.startupReconciliationComplete = true;
      document.documentElement.setAttribute(RUNTIME_OWNER_ATTRIBUTE, this.runtimeOwnerToken);
    }
    if ('fonts' in document && document.fonts) {
      this.fontSetReady = document.fonts.status === 'loaded';
      void document.fonts.ready.then(() => {
        this.fontSetReady = true;
      });
    }
    if (!this.lifecycle.canMutate()) return;
    await this.activateRuntime(false);
  }

  public async reprocess(): Promise<void> {
    if (!this.lifecycle.canMutate()) return;
    this.candidateWork.resetAdmission();
    if (this.context.state() === 'DISABLED' || this.context.state() === 'SUSPENDED') {
      await this.activateRuntime(false);
      return;
    }
    this.queueDiscovery(document, true);
    await this.flush();
  }

  public rollback(): void {
    this.abortWork(true);
    const result = this.context.rollback(false);
    if (result.failed === 0 && result.skipped === 0) {
      this.processedTextNodes = new WeakMap<Text, ProcessedTextFingerprint>();
      this.processedTypographyNodes = new WeakMap<Text, string>();
      this.candidateWork.resetAdmission();
      this.expandedSemanticRegions = new WeakSet<Element>();
      this.recordedSemanticRegions = new WeakSet<Element>();
      this.recordedTextBlocks = new WeakSet<Element>();
      this.processedTextBlocks = new WeakSet<Element>();
      this.pendingTypographyContinuations.clear();
      this.wrapperCount = 0;
    } else {
      this.failures.trip('frame', 'rollback', 'repeated_rollback_failure');
      this.recordDegradation(this.degradation.recordFailure('rollback', { terminal: true }));
      this.diagnostics.push(
        createDiagnostic('RTLX-ROLLBACK-001', 'error', 'ROLLBACK-001', 'frame', {
          failed: result.failed,
          skipped: result.skipped,
        })
      );
    }
    this.collectDiagnostics();
    this.reportDiagnostics();
    void this.diagnosticBatcher.flush(true);
    this.lifecycle.destroy();
  }

  public destroy(): void {
    this.lifecycle.destroy();
  }

  public updateSettings(settings: Settings): void {
    this.settings = settings;
    this.candidateWork.resetAdmission();
    this.processedTypographyNodes = new WeakMap<Text, string>();
    this.resetTextBlockEnumerationState();
    this.typographyProtectionCursors.clear();
    this.pendingTypographyProtectionReconciliations.clear();
    this.expandedSemanticRegions = new WeakSet<Element>();
    this.processedTextBlocks = new WeakSet<Element>();
    this.pendingTypographyContinuations.clear();
    this.shadowManager = new ShadowRootManager(this.roots, settings.closedShadowDom);
  }

  public inspectElement(element: Element, selector: string): ElementInspection {
    const protectedSelectors = protectedTextSelectors(this.profile);
    const semantic = resolveSemanticBlock(element, protectedSelectors);
    const region = semantic.element;
    const blocks = enumerateTextBlocks(region, protectedSelectors);
    const selectedBlock =
      blocks.find((block) => block.element === element || block.element.contains(element)) ??
      blocks[0] ??
      Object.freeze({
        element: region,
        kind: 'fallback-region',
        depth: 0,
        strategy: 'fallback-region',
      });
    const target = selectedBlock.element;
    const directionTarget = resolveDirectionTarget(element, target, protectedSelectors);
    const decisionElement = directionTarget.element ?? target;
    const sample = sampleCandidateText(
      target,
      LIMITS.maxSampleCodepointsPerCandidate,
      protectedSelectors
    );
    const classification = classifyLanguage(sample, nearestLang(target));
    const codeContext = classifyCodeContext(target, codeLikeSelectors(this.profile));
    const localDir = normalizeDir(decisionElement.getAttribute('dir'));
    const baseDecision = decideDirectionDetailed({
      localDir,
      nearestAncestorDir: nearestExplicitDir(decisionElement),
      documentDirDeclared: document.documentElement.hasAttribute('dir'),
      detectedDirection: classification.detectedDirection,
      language: classification.language,
      languageConfidence: classification.confidence,
      userMode: this.settings.siteMode,
      hardExcluded: isHardExcluded(target),
      codeZone: codeContext === 'block-code',
      isHtmlOrBody: target.tagName === 'HTML' || target.tagName === 'BODY',
      userConfirmedSuspiciousDirection: this.confirmedSuspicious,
    });
    const rule = matchedProfileRule(target, this.profile);
    const directionDecision = applyProfileDirectionDecision(
      baseDecision,
      rule,
      localDir,
      codeContext,
      isSimpleInteractiveText(target)
    );
    const exclusion = exclusionReason(element, this.profile);
    const typoDecision = typographyDecision(
      target,
      this.settings,
      this.profile,
      classification.language
    );
    const notModifiedReason = explainNotModified(
      directionDecision.action,
      directionDecision.reason,
      exclusion,
      typoDecision
    );
    const typographyPreview = collectTypographyBatch(
      target,
      protectedSelectors,
      new WeakMap<Text, string>(),
      'inspection',
      LIMITS.maxTextNodesPerSlice
    );
    const directionStyle = directionTarget.element
      ? safeInspectionStyle(directionTarget.element)
      : null;
    const alignmentStyle = directionTarget.alignmentElement
      ? safeInspectionStyle(directionTarget.alignmentElement)
      : null;
    return Object.freeze({
      schemaVersion: '3.2.0',
      matchedProfile: this.profile?.profileId ?? null,
      matchedRule: rule?.ruleId ?? null,
      matchedRules: matchingProfileRules(target, this.profile),
      matchedGroup: matchedProfileGroup(target, this.profile),
      selector,
      exclusionReason: exclusion,
      typographyDecision: typoDecision,
      languageClassification: classification.language,
      languageConfidence: classification.confidence,
      detectedDirection: classification.detectedDirection,
      semanticBlock: Object.freeze({
        tag: target.tagName.toLowerCase(),
        role: target.getAttribute('role'),
        strategy: selectedBlock.strategy,
        depth: selectedBlock.depth,
        ancestorKinds: semanticAncestorKinds(target),
        directionTargetTag: directionTarget.element?.tagName.toLowerCase() ?? null,
        directionTargetRole: directionTarget.element?.getAttribute('role') ?? null,
        directionTargetStrategy: directionTarget.strategy,
        directionTargetDepth: directionTarget.depth,
        layoutSensitive: directionTarget.semanticLayout.layoutSensitive,
        layoutReason: directionTarget.semanticLayout.reason,
      }),
      semanticRegion: Object.freeze({
        tag: region.tagName.toLowerCase(),
        role: region.getAttribute('role'),
        strategy: semantic.strategy,
        depth: semantic.depth,
        textBlockCount: blocks.length,
      }),
      textBlock: Object.freeze({
        tag: target.tagName.toLowerCase(),
        role: target.getAttribute('role'),
        kind: selectedBlock.kind,
        depth: selectedBlock.depth,
      }),
      directionTarget: Object.freeze({
        tag: directionTarget.element?.tagName.toLowerCase() ?? null,
        role: directionTarget.element?.getAttribute('role') ?? null,
        strategy: directionTarget.strategy,
        depth: directionTarget.depth,
        explicitDir: directionTarget.element
          ? normalizeDir(directionTarget.element.getAttribute('dir'))
          : null,
        computedDirection: directionStyle?.direction ?? null,
      }),
      alignmentTarget: Object.freeze({
        tag: directionTarget.alignmentElement?.tagName.toLowerCase() ?? null,
        role: directionTarget.alignmentElement?.getAttribute('role') ?? null,
        computedTextAlign: alignmentStyle?.textAlign ?? null,
      }),
      typographyCoverage: Object.freeze({
        inspected: typographyPreview.inspectedNodes,
        eligible: typographyPreview.eligibleNodes,
        targets: typographyPreview.targets.length,
        continuationPending: typographyPreview.hasMore,
      }),
      directionDecision: Object.freeze({
        action: directionDecision.action,
        reason: directionDecision.reason,
        documentLangUsedAsStrongSignal: false,
      }),
      notModifiedReason,
      mutationStatus: Object.freeze({
        candidateOwned: (directionTarget.element ?? target).classList.contains(OWNED_CLASS),
        explicitDir: localDir,
        ownedWrappers: target.querySelectorAll(`.${OWNED_WRAPPER_CLASS}`).length,
        journalEntries: this.context.journal.size(),
      }),
    });
  }

  public runtimeSnapshot(
    stabilization: RuntimeSnapshot['captureStabilization'] | null = null
  ): RuntimeSnapshot {
    this.pruneDetachedWork();
    const healthRoots = this.roots.values().map((entry) => entry.root);
    if (this.degradation.allowsHealthRecalculation() || this.profileHealthCache === null)
      this.profileHealthCache = evaluateProfileHealth(
        healthRoots.length > 0 ? healthRoots : [document],
        this.profile
      );
    const streaming = this.streaming.snapshot();
    const backpressure = this.backpressure.snapshot();
    const evidence = this.evidence.snapshot(
      document.querySelectorAll(`.${OWNED_WRAPPER_CLASS}`).length,
      this.pendingTypographyContinuations.size,
      this.pendingTextBlockEnumerations.size,
      this.pendingTypographyProtectionReconciliations.size
    );
    const pendingCandidates = this.pending.size + this.backgroundPending.size;
    const captureReadiness = evaluateCaptureReadiness({
      runtimeState: this.context.state(),
      degradationLevel: this.degradation.level(),
      streaming,
      backpressure,
      pendingCandidates,
      pendingDiscoveryRoots: this.pendingDiscovery.size,
      activeDiscoveryCursors: this.discoveryCursors.size,
      textBlockEnumerationsPending: evidence.textBlockCoverage.textBlockEnumerationsPending,
      textBlocksProcessingPending: this.unprocessedTextBlocks.size,
      typographyContinuationsPending: evidence.textBlockCoverage.typographyContinuationsPending,
      typographyProtectionReconciliationsPending:
        evidence.textBlockCoverage.typographyProtectionReconciliationsPending,
    });
    return Object.freeze({
      schemaVersion: '1.10.0',
      processorVersion: PROCESSOR_VERSION,
      runtimeInstanceId: this.runtimeInstanceId,
      runtimeStartedAt: this.runtimeStartedAt,
      runtimeState: this.context.state(),
      lifecycleState: this.lifecycle.state(),
      lifecycleGeneration: this.lifecycle.generation(),
      degradationLevel: this.degradation.level(),
      degradation: this.degradation.snapshot(),
      provenance: Object.freeze({
        buildInputHash: BUILD_INPUT_HASH,
        profileHash: this.profileHash,
      }),
      captureReadiness,
      captureStabilization:
        stabilization ??
        Object.freeze({
          attempted: false,
          initialStatus: captureReadiness.status,
          finalStatus: captureReadiness.status,
          waitedMs: 0,
          attempts: 1,
          timedOut: false,
        }),
      startupReconciliation: this.startupReconciliation,
      detachedWorkPruned: Object.freeze({ ...this.detachedWorkPruned }),
      profileHealth: this.profileHealthCache,
      performance: this.performance.summary(),
      streaming,
      backpressure,
      delayedWork: this.delays.snapshot(),
      visibility: this.visibility.snapshot(),
      diagnosticBatch: this.diagnosticBatcher.snapshot(),
      pendingCandidates,
      pendingDiscoveryRoots: this.pendingDiscovery.size,
      queues: Object.freeze({
        visibleCandidates: this.pending.size,
        backgroundCandidates: this.backgroundPending.size,
        discoveryRoots: this.pendingDiscovery.size,
      }),
      discovery: Object.freeze({
        activeCursors: this.discoveryCursors.size,
        ...this.discoveryStats,
      }),
      typography: Object.freeze({ ...this.typographyStats }),
      processing: Object.freeze({ ...this.processingStats }),
      metricsScope: Object.freeze({
        discovery: 'runtime-lifetime',
        processing: 'runtime-lifetime',
        fixtureSummary: 'current-dom',
      }),
      ...evidence,
      fontDiagnostics: fontDiagnosticsSnapshot(this.fontSetReady),
      observedRoots: this.roots.size(),
      observedMutationRoots: this.observers.size(),
      ownedMutationSignatures: this.ownership.size(),
      wrapperCount: this.wrapperCount,
      journalEntries: this.context.journal.size(),
      pageDebug: runtimePageDebugSnapshot(this.settings, this.fontSetReady),
    });
  }

  public async captureSnapshot(): Promise<RuntimeSnapshot> {
    const startedAt = performance.now();
    let attempts = 1;
    this.recoverOrphanedTextBlockEnumerations();
    this.recoverUnprocessedTextBlocks();
    let snapshot = this.runtimeSnapshot();
    const initialStatus = snapshot.captureReadiness.status;
    const deadline = startedAt + LIMITS.captureStabilizationMaxWaitMs;
    while (
      snapshot.captureReadiness.status === 'partial' &&
      performance.now() < deadline &&
      this.lifecycle.canMutate() &&
      this.context.state() === 'ACTIVE'
    ) {
      this.pruneDetachedWork();
      this.recoverOrphanedTextBlockEnumerations();
      if (!this.processing) await this.flush();
      const remaining = Math.max(0, deadline - performance.now());
      if (remaining <= 0) break;
      await wait(Math.min(LIMITS.captureStabilizationPollMs, remaining));
      attempts += 1;
      snapshot = this.runtimeSnapshot();
    }
    const waitedMs = Math.max(0, Math.round(performance.now() - startedAt));
    const finalStatus = snapshot.captureReadiness.status;
    return this.runtimeSnapshot(
      Object.freeze({
        attempted: true,
        initialStatus,
        finalStatus,
        waitedMs,
        attempts,
        timedOut: finalStatus === 'partial' && waitedMs >= LIMITS.captureStabilizationMaxWaitMs,
      })
    );
  }

  public recordFixture(): RecordedFixtureSummary {
    return recordFixtureSummary(document, this.profile);
  }

  public async failureSnapshot(): Promise<
    Readonly<{
      runtimeSnapshot: RuntimeSnapshot;
      fixtureSummary: RecordedFixtureSummary;
    }>
  > {
    const snapshot = await this.captureSnapshot();
    if (
      snapshot.textBlockCoverage.typographyContinuationsPending > 0 &&
      !this.diagnostics.some((item) => item.code === 'RTLX-COVERAGE-001')
    )
      this.diagnostics.push(
        createDiagnostic('RTLX-COVERAGE-001', 'warning', 'TYPOGRAPHY-CONTINUATION-001', 'frame', {
          pendingContinuations: snapshot.textBlockCoverage.typographyContinuationsPending,
        })
      );
    if (
      snapshot.pendingCandidates === 0 &&
      snapshot.pendingDiscoveryRoots === 0 &&
      snapshot.textBlockCoverage.textBlocksProcessed <
        snapshot.textBlockCoverage.textBlocksDiscovered &&
      !this.diagnostics.some((item) => item.code === 'RTLX-COVERAGE-002')
    )
      this.diagnostics.push(
        createDiagnostic('RTLX-COVERAGE-002', 'warning', 'TEXT-BLOCK-COVERAGE-001', 'frame', {
          discoveredBlocks: snapshot.textBlockCoverage.textBlocksDiscovered,
          processedBlocks: snapshot.textBlockCoverage.textBlocksProcessed,
        })
      );
    if (
      snapshot.textBlockCoverage.textBlockEnumerationsPending > 0 &&
      !this.diagnostics.some((item) => item.code === 'RTLX-COVERAGE-003')
    )
      this.diagnostics.push(
        createDiagnostic('RTLX-COVERAGE-003', 'warning', 'TEXT-BLOCK-ENUMERATION-001', 'frame', {
          pendingEnumerations: snapshot.textBlockCoverage.textBlockEnumerationsPending,
        })
      );
    if (
      snapshot.textBlockCoverage.typographyProtectionReconciliationsPending > 0 &&
      !this.diagnostics.some((item) => item.code === 'RTLX-COVERAGE-004')
    )
      this.diagnostics.push(
        createDiagnostic(
          'RTLX-COVERAGE-004',
          'warning',
          'TYPOGRAPHY-PROTECTION-RECONCILIATION-001',
          'frame',
          {
            pendingReconciliations:
              snapshot.textBlockCoverage.typographyProtectionReconciliationsPending,
          }
        )
      );
    this.collectDiagnostics();
    this.reportDiagnostics();
    await this.diagnosticBatcher.flush(true).catch(() => undefined);
    return Object.freeze({
      runtimeSnapshot: snapshot,
      fixtureSummary: this.recordFixture(),
    });
  }

  public quickOverride(element: Element, mode: QuickOverrideMode): void {
    if (!element.isConnected || element.tagName === 'HTML' || element.tagName === 'BODY') return;
    const operations: MutationOperation[] = [];
    if (mode === 'ignore' && !element.classList.contains(SESSION_IGNORE_CLASS)) {
      operations.push({
        type: 'add-class',
        sequence: this.sequence++,
        target: element,
        owner: 'RTLX-15.9.11',
        requirementId: 'QUICK-OVERRIDE-001',
        className: SESSION_IGNORE_CLASS,
        expectedAbsent: true,
      });
    } else if (mode === 'ltr' && !element.hasAttribute('dir')) {
      operations.push({
        type: 'add-attribute',
        sequence: this.sequence++,
        target: element,
        owner: 'RTLX-15.9.11',
        requirementId: 'QUICK-OVERRIDE-001',
        name: 'dir',
        value: 'ltr',
        expectedCurrentValue: null,
      });
    } else if (mode === 'content' && !element.hasAttribute('dir')) {
      const sample = sampleCandidateText(
        element,
        LIMITS.maxSampleCodepointsPerCandidate,
        protectedTextSelectors(this.profile)
      );
      const classification = classifyLanguage(sample, nearestLang(element));
      const value =
        classification.language === 'persian'
          ? 'rtl'
          : classification.language === 'latin'
            ? 'ltr'
            : 'auto';
      operations.push({
        type: 'add-attribute',
        sequence: this.sequence++,
        target: element,
        owner: 'RTLX-15.9.11',
        requirementId: 'QUICK-OVERRIDE-001',
        name: 'dir',
        value,
        expectedCurrentValue: null,
      });
    }
    if (
      operations.some(
        (operation) =>
          (operation.type === 'add-attribute' || operation.type === 'replace-attribute') &&
          operation.name === 'dir'
      ) &&
      !element.hasAttribute(DIRECTION_OWNER_ATTRIBUTE)
    )
      operations.push({
        type: 'add-attribute',
        sequence: this.sequence++,
        target: element,
        owner: 'RTLX-15.9.11',
        requirementId: 'MUTATION-OWNERSHIP-002',
        name: DIRECTION_OWNER_ATTRIBUTE,
        value: this.runtimeOwnerToken,
        expectedCurrentValue: null,
      });
    if (operations.length > 0)
      applyMutationPlan(createPlan(operations), this.context.journal, this.applyOptions());
    if (mode === 'content') this.queue(element);
  }

  private registerRoot(root: Document | ShadowRoot, depth: number): void {
    if (!this.roots.add(root, depth) && root !== document) return;
    this.observers.observe(root, (records) => this.onMutations(root, records));
    this.registerSlots(root);
    if (
      this.profile?.features.shadowOpen !== false &&
      this.degradation.allowsDeepShadowDiscovery()
    ) {
      for (const shadow of this.shadowManager.discover(root))
        this.registerRoot(shadow.root, shadow.depth);
    }
  }

  private registerSlots(root: Document | ShadowRoot | Element): void {
    const rootNode = root instanceof Element ? root.getRootNode() : root;
    const registryRoot =
      rootNode instanceof ShadowRoot
        ? rootNode
        : root instanceof ShadowRoot || root instanceof Document
          ? root
          : null;
    const entry = registryRoot ? this.roots.get(registryRoot) : undefined;
    if (!entry) return;
    const slots = root instanceof HTMLSlotElement ? [root] : [...root.querySelectorAll('slot')];
    for (const slot of slots) {
      if (entry.slots.has(slot)) continue;
      slot.addEventListener('slotchange', this.onSlotChange);
      entry.slots.add(slot);
    }
  }

  private discoverAndQueue(root: DiscoveryRoot): void {
    const selectors = this.profile?.selectors.content ?? [];
    let cursor = this.discoveryCursors.get(root);
    if (!cursor) {
      cursor = createCandidateDiscoveryCursor(root, selectors);
      this.discoveryCursors.set(root, cursor);
    }
    const availableCapacity = Math.max(
      0,
      LIMITS.maxPendingRoots - (this.pending.size + this.backgroundPending.size)
    );
    if (availableCapacity === 0) {
      this.pendingDiscovery.add(root);
      this.recordCandidateQueueSaturation('discovery-capacity');
      return;
    }
    const result = this.performance.measure('discovery', 0, () =>
      cursor.nextBatch(
        Math.min(LIMITS.maxInitialRoots, availableCapacity),
        LIMITS.maxDiscoveryNodes
      )
    );
    this.discoveryStats.batches += 1;
    this.discoveryStats.visitedNodes += result.visitedNodes;
    this.discoveryStats.candidatesDiscovered += result.candidates.length;
    if (result.limitReached) {
      this.discoveryStats.limitHits += 1;
      this.diagnostics.push(
        createDiagnostic('RTLX-LIMIT-001', 'warning', 'CANDIDATE-LIMIT-001', 'frame', {
          visited: result.visitedNodes,
          candidateBudgetReached: result.stopReason === 'candidate_budget',
          visitBudgetReached: result.stopReason === 'visit_budget',
          continuationQueued: result.hasMore,
        })
      );
    }
    const candidates =
      this.resumeCandidateBudget === null
        ? result.candidates
        : result.candidates.slice(0, Math.max(0, this.resumeCandidateBudget));
    for (const candidate of candidates) this.queue(candidate);
    if (this.resumeCandidateBudget !== null)
      this.resumeCandidateBudget = Math.max(0, this.resumeCandidateBudget - candidates.length);
    if (result.hasMore) {
      this.discoveryStats.continuations += 1;
      this.pendingDiscovery.add(root);
    } else {
      this.discoveryStats.completedRoots += 1;
      this.discoveryCursors.delete(root);
    }
    if (
      this.profile?.features.shadowOpen !== false &&
      this.degradation.allowsDeepShadowDiscovery() &&
      !(root instanceof Element)
    ) {
      for (const shadow of this.shadowManager.discover(root))
        this.registerRoot(shadow.root, shadow.depth);
    }
    this.diagnostics.push(...this.shadowManager.diagnostics.splice(0));
  }

  private queue(candidate: Element): void {
    if (
      this.failures.isDisabled('frame', 'runtime') ||
      this.degradation.isPaused() ||
      !this.lifecycle.canMutate() ||
      !candidate.isConnected
    )
      return;
    if (this.pending.has(candidate) || this.backgroundPending.has(candidate)) return;
    if (!this.candidateWork.shouldAdmit(candidate, this.isCandidateContinuation(candidate))) return;
    const rule = matchedProfileRule(candidate, this.profile);
    if (rule && rule.initialDelayMs > 0 && !this.delayedReady.has(candidate)) {
      if (!this.delays.enqueue(candidate, rule.initialDelayMs, this.lifecycle.generation()))
        this.recordDegradation(this.degradation.recordFailure('delay-queue'));
      return;
    }
    if (this.pending.size + this.backgroundPending.size >= LIMITS.maxPendingRoots) {
      this.recordCandidateQueueSaturation('candidate-admission');
      this.collectDiagnostics();
      return;
    }
    if (isProbablyVisible(candidate)) {
      this.processingStats.queuedVisible += 1;
      this.enqueueReady(candidate);
      return;
    }
    this.visibility.defer(candidate);
    this.backgroundPending.add(candidate);
    this.processingStats.queuedBackground += 1;
  }

  private enqueueReady(candidate: Element): void {
    if (this.pending.has(candidate)) return;
    this.backgroundPending.delete(candidate);
    this.visibility.forget(candidate);
    if (this.pending.size + this.backgroundPending.size >= LIMITS.maxPendingRoots) {
      this.recordCandidateQueueSaturation('visibility-promotion');
      return;
    }
    this.pending.add(candidate);
  }

  private isCandidateContinuation(candidate: Element): boolean {
    return (
      this.pendingTextBlockEnumerations.has(candidate) ||
      this.unprocessedTextBlocks.has(candidate) ||
      this.pendingTypographyContinuations.has(candidate) ||
      this.pendingTypographyProtectionReconciliations.has(candidate)
    );
  }

  private markCandidateProcessedIfSettled(candidate: Element): void {
    if (!candidate.isConnected || this.isCandidateContinuation(candidate)) return;
    this.candidateWork.markProcessed(candidate);
  }

  private markMutationCandidateDirty(element: Element): Element | null {
    const candidate = nearestCandidate(element);
    if (!candidate) return null;
    this.candidateWork.markDirty(candidate);
    return candidate;
  }

  private recordCandidateQueueSaturation(source: CandidateQueueSaturationSource): void {
    const observation = this.candidateWork.observeSaturation(
      this.pending.size + this.backgroundPending.size,
      source
    );
    if (observation.episodeStarted)
      this.recordDegradation(this.degradation.recordFailure('candidate-queue'));
  }

  private queueDiscovery(root: DiscoveryRoot, restart = false): void {
    if (restart) this.discoveryCursors.delete(root);
    if (this.pendingDiscovery.has(root)) return;
    if (this.pendingDiscovery.size >= LIMITS.maxPendingRoots) {
      this.recordDegradation(this.degradation.recordFailure('discovery-queue'));
      this.collectDiagnostics();
      return;
    }
    this.pendingDiscovery.add(root);
  }

  private async flush(): Promise<void> {
    if (!this.ownsRuntimeLease()) {
      this.lifecycle.destroy();
      return;
    }
    this.pruneDetachedWork();
    if (!this.processing) this.recoverOrphanedTextBlockEnumerations();
    this.recordDegradation(this.degradation.maybeRecover());
    if (
      this.processing ||
      !this.lifecycle.canMutate() ||
      this.context.state() !== 'ACTIVE' ||
      this.failures.isDisabled('frame', 'runtime') ||
      this.degradation.isPaused()
    )
      return;
    const generation = this.lifecycle.generation();
    const budget = this.backpressure.budget();
    if (budget.level === 'hidden' || budget.nodesPerSlice === 0) return;
    this.processing = true;
    try {
      const priority =
        this.pending.size > 0 || this.pendingDiscovery.size > 0 ? 'user-visible' : 'background';
      await scheduleTask(
        async () => {
          let count = 0;
          let discoveryBatches = 0;
          const sliceStart = performance.now();
          while (
            this.lifecycle.isCurrentGeneration(generation) &&
            this.lifecycle.canMutate() &&
            (this.pendingDiscovery.size > 0 ||
              this.pending.size > 0 ||
              this.backgroundPending.size > 0) &&
            count < budget.nodesPerSlice &&
            performance.now() - sliceStart < budget.sliceMs
          ) {
            if (discoveryBatches === 0) {
              const discoveryRoot = this.pendingDiscovery.values().next().value;
              if (discoveryRoot) {
                this.pendingDiscovery.delete(discoveryRoot);
                this.discoverAndQueue(discoveryRoot);
                discoveryBatches += 1;
                count += 1;
                continue;
              }
            }
            const visibleCandidate = this.pending.values().next().value;
            if (visibleCandidate) {
              this.pending.delete(visibleCandidate);
              const processed = this.processCandidate(
                visibleCandidate,
                budget.nodesPerSlice - count,
                generation
              );
              this.markCandidateProcessedIfSettled(visibleCandidate);
              count += Math.max(1, processed);
              continue;
            }
            const backgroundCandidate = this.backgroundPending.values().next().value;
            if (backgroundCandidate) {
              this.backgroundPending.delete(backgroundCandidate);
              this.visibility.forget(backgroundCandidate);
              const processed = this.processCandidate(
                backgroundCandidate,
                budget.nodesPerSlice - count,
                generation
              );
              this.markCandidateProcessedIfSettled(backgroundCandidate);
              count += Math.max(1, processed);
              continue;
            }
            if (this.pendingDiscovery.size > 0) {
              discoveryBatches = 0;
              continue;
            }
            break;
          }
        },
        {
          signal: this.context.signal(),
          priority,
          generation,
          isCurrentGeneration: (candidateGeneration) =>
            this.lifecycle.isCurrentGeneration(candidateGeneration),
        }
      );
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.failures.trip('frame', 'runtime', 'uncaught_extension_exception');
        this.recordDegradation(
          this.degradation.recordFailure('runtime-exception', { terminal: true })
        );
      }
    } finally {
      this.processing = false;
      this.recoverOrphanedTextBlockEnumerations();
      if (this.pendingDiscovery.size === 0 && this.resumeCandidateBudget === 0)
        this.resumeCandidateBudget = null;
      this.candidateWork.observeQueueDepth(this.pending.size + this.backgroundPending.size);
      this.backpressure.recordQueueDepth(
        this.pending.size + this.backgroundPending.size + this.pendingDiscovery.size
      );
      this.backpressure.recordMutationBurst(0);
      this.collectDiagnostics();
      if (
        (this.pendingDiscovery.size > 0 ||
          this.pending.size > 0 ||
          this.backgroundPending.size > 0) &&
        this.lifecycle.canMutate() &&
        this.context.state() === 'ACTIVE' &&
        !this.failures.isDisabled('frame', 'runtime') &&
        !this.degradation.isPaused()
      )
        void this.continueFlush(generation);
      this.reportDiagnostics();
    }
  }

  private async continueFlush(generation: number): Promise<void> {
    try {
      await cooperativeYield({
        signal: this.context.signal(),
        priority:
          this.pending.size > 0 || this.pendingDiscovery.size > 0 ? 'user-visible' : 'background',
        generation,
        isCurrentGeneration: (candidateGeneration) =>
          this.lifecycle.isCurrentGeneration(candidateGeneration),
      });
      await this.flush();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.failures.trip('frame', 'runtime', 'uncaught_extension_exception');
        this.recordDegradation(
          this.degradation.recordFailure('runtime-exception', { terminal: true })
        );
      }
    }
  }

  private enumerateTextBlocksBounded(
    semanticRegion: Element,
    protectedSelectors: readonly string[]
  ): Readonly<{ blocks: readonly TextBlockResolution[]; complete: boolean }> {
    const completed = this.completedTextBlocks.get(semanticRegion);
    if (completed) return Object.freeze({ blocks: completed, complete: true });

    let cursor = this.textBlockEnumerationCursors.get(semanticRegion);
    if (!cursor) {
      cursor = createTextBlockEnumerationCursor(semanticRegion, protectedSelectors);
      this.textBlockEnumerationCursors.set(semanticRegion, cursor);
      this.textBlockEnumerationResults.set(semanticRegion, []);
      if (!this.recordedSemanticRegions.has(semanticRegion)) {
        this.recordedSemanticRegions.add(semanticRegion);
        this.evidence.recordSemanticRegion(0);
      }
    }

    const batch = cursor.nextBatch(DEFAULT_TEXT_BLOCK_ENUMERATION_LIMIT);
    this.evidence.recordTextBlockEnumerationBatch(batch.inspectedElements, batch.hasMore);
    const accumulated = this.textBlockEnumerationResults.get(semanticRegion) ?? [];
    for (const block of batch.blocks) {
      accumulated.push(block);
      if (this.recordedTextBlocks.has(block.element)) continue;
      this.recordedTextBlocks.add(block.element);
      this.unprocessedTextBlocks.set(block.element, block.kind);
      this.evidence.recordTextBlockDiscovered(block.kind);
    }
    this.textBlockEnumerationResults.set(semanticRegion, accumulated);

    if (batch.hasMore) {
      this.pendingTextBlockEnumerations.add(semanticRegion);
      this.evidence.recordTextBlockEnumerationContinuationQueued();
      this.queue(semanticRegion);
      return Object.freeze({ blocks: Object.freeze([]), complete: false });
    }

    const blocks = Object.freeze([...accumulated]);
    this.completedTextBlocks.set(semanticRegion, blocks);
    this.textBlockEnumerationCursors.delete(semanticRegion);
    this.textBlockEnumerationResults.delete(semanticRegion);
    this.pendingTextBlockEnumerations.delete(semanticRegion);
    this.evidence.recordTextBlockEnumerationComplete();
    return Object.freeze({ blocks, complete: true });
  }

  private reconcileTypographyProtection(
    sourceCandidate: Element,
    protectedSelectors: readonly string[],
    generation: number
  ): boolean {
    const selector = `.${TYPOGRAPHY_CLASS}`;
    let cursor = this.typographyProtectionCursors.get(sourceCandidate);
    if (
      !cursor &&
      !sourceCandidate.classList.contains(TYPOGRAPHY_CLASS) &&
      sourceCandidate.closest(selector) === null &&
      sourceCandidate.querySelector(selector) === null
    )
      return false;
    if (!cursor) {
      cursor = createTypographyProtectionCursor(sourceCandidate, protectedSelectors);
      this.typographyProtectionCursors.set(sourceCandidate, cursor);
    }
    const batch = cursor.nextBatch(LIMITS.maxTextNodesPerSlice);
    for (const target of batch.targets) {
      if (
        removeJournaledClass(
          target,
          TYPOGRAPHY_CLASS,
          this.context.journal,
          this.applyOptions(generation)
        )
      )
        this.typographyStats.targetsReconciled += 1;
    }
    if (batch.hasMore) {
      this.pendingTypographyProtectionReconciliations.add(sourceCandidate);
      this.queue(sourceCandidate);
      return true;
    }
    this.typographyProtectionCursors.delete(sourceCandidate);
    this.pendingTypographyProtectionReconciliations.delete(sourceCandidate);
    return false;
  }

  private invalidateTextBlockEnumeration(element: Element): void {
    const protectedSelectors = protectedTextSelectors(this.profile);
    const semanticRegion = resolveSemanticBlock(element, protectedSelectors).element;
    this.cancelUnprocessedTextBlocksForRegion(semanticRegion);
    this.textBlockEnumerationCursors.delete(semanticRegion);
    this.textBlockEnumerationResults.delete(semanticRegion);
    this.completedTextBlocks.delete(semanticRegion);
    this.pendingTextBlockEnumerations.delete(semanticRegion);
    this.expandedSemanticRegions.delete(semanticRegion);
  }

  private cancelUnprocessedTextBlock(element: Element): void {
    const kind = this.unprocessedTextBlocks.get(element);
    if (!kind) return;
    this.unprocessedTextBlocks.delete(element);
    this.recordedTextBlocks.delete(element);
    this.evidence.cancelTextBlockDiscovered(kind);
  }

  private cancelUnprocessedTextBlocksForRegion(semanticRegion: Element): void {
    const blocks = [
      ...(this.textBlockEnumerationResults.get(semanticRegion) ?? []),
      ...(this.completedTextBlocks.get(semanticRegion) ?? []),
    ];
    for (const block of blocks) this.cancelUnprocessedTextBlock(block.element);
    this.cancelUnprocessedTextBlock(semanticRegion);
  }

  private cancelAllUnprocessedTextBlocks(): void {
    for (const element of [...this.unprocessedTextBlocks.keys()])
      this.cancelUnprocessedTextBlock(element);
  }

  private recoverUnprocessedTextBlocks(): number {
    let recovered = 0;
    for (const element of [...this.unprocessedTextBlocks.keys()]) {
      if (!element.isConnected) {
        this.cancelUnprocessedTextBlock(element);
        continue;
      }
      if (this.pending.has(element) || this.backgroundPending.has(element)) continue;
      this.queue(element);
      if (this.pending.has(element) || this.backgroundPending.has(element)) recovered += 1;
    }
    return recovered;
  }

  private recoverOrphanedTextBlockEnumerations(): number {
    const recovery = inspectTextBlockContinuationRecovery({
      pending: this.pendingTextBlockEnumerations,
      visibleQueue: this.pending,
      backgroundQueue: this.backgroundPending,
      cursors: this.textBlockEnumerationCursors,
      isProcessable: (element) =>
        !isHardExcluded(element) && !isProfileExcluded(element, this.profile),
    });
    let recovered = 0;
    for (const element of recovery.invalid) {
      if (!element.isConnected) {
        this.pruneDetachedCandidateState(element);
        continue;
      }
      this.cancelUnprocessedTextBlocksForRegion(element);
      this.pendingTextBlockEnumerations.delete(element);
      this.textBlockEnumerationResults.delete(element);
      this.queue(element);
      recovered += 1;
    }
    for (const element of recovery.recoverable) {
      this.queue(element);
      recovered += 1;
    }
    return recovered;
  }

  private resetTextBlockEnumerationState(): void {
    this.textBlockEnumerationCursors.clear();
    this.textBlockEnumerationResults.clear();
    this.completedTextBlocks = new WeakMap<Element, readonly TextBlockResolution[]>();
    this.pendingTextBlockEnumerations.clear();
  }

  private processCandidate(
    sourceCandidate: Element,
    textNodeBudget: number,
    generation: number
  ): number {
    if (
      !this.lifecycle.isCurrentGeneration(generation) ||
      !this.lifecycle.canMutate() ||
      !sourceCandidate.isConnected ||
      sourceCandidate.tagName === 'HTML' ||
      sourceCandidate.tagName === 'BODY'
    ) {
      this.pruneDetachedCandidateState(sourceCandidate);
      this.incrementNotModified('invalid-or-detached');
      return 0;
    }
    const protectedSelectors = protectedTextSelectors(this.profile);
    if (this.reconcileTypographyProtection(sourceCandidate, protectedSelectors, generation))
      return 1;
    if (isHardExcluded(sourceCandidate)) {
      this.incrementNotModified('hard-excluded');
      return 0;
    }
    if (isProfileExcluded(sourceCandidate, this.profile)) {
      this.incrementNotModified('profile-excluded');
      return 0;
    }

    const semantic = resolveSemanticBlock(sourceCandidate, protectedSelectors);
    const semanticRegion = semantic.element;
    const textBlockEnumeration = this.enumerateTextBlocksBounded(
      semanticRegion,
      protectedSelectors
    );
    if (!textBlockEnumeration.complete) return 1;
    const textBlocks = textBlockEnumeration.blocks;
    if (textBlocks.length > 1 && !this.expandedSemanticRegions.has(semanticRegion)) {
      this.expandedSemanticRegions.add(semanticRegion);
      for (const block of textBlocks) this.queue(block.element);
      return 1;
    }
    const matchedTextBlock = textBlocks.find(
      (block) => block.element === sourceCandidate || block.element.contains(sourceCandidate)
    );
    if (textBlocks.length > 1 && !matchedTextBlock) {
      this.incrementNotModified('semantic-region-expanded');
      return 1;
    }
    const candidate = matchedTextBlock?.element ?? textBlocks[0]?.element ?? semanticRegion;
    if (!this.recordedTextBlocks.has(candidate)) {
      this.recordedTextBlocks.add(candidate);
      this.unprocessedTextBlocks.set(candidate, 'fallback-region');
      this.evidence.recordTextBlockDiscovered('fallback-region');
    }
    if (!this.processedTextBlocks.has(candidate)) {
      this.processedTextBlocks.add(candidate);
      this.unprocessedTextBlocks.delete(candidate);
      this.evidence.recordTextBlockProcessed();
    }
    const directionSource = candidate.contains(sourceCandidate) ? sourceCandidate : candidate;
    const directionTarget = resolveDirectionTarget(directionSource, candidate, protectedSelectors);
    if (directionTarget.semanticLayout.layoutSensitive)
      this.evidence.recordLayoutSensitiveSemanticBlock(candidate);
    if (directionTarget.element && directionTarget.element !== candidate)
      this.evidence.recordDirectionTargetRedirected(
        directionTarget.element,
        directionTarget.strategy
      );
    if (!candidate.isConnected || candidate.tagName === 'HTML' || candidate.tagName === 'BODY') {
      this.incrementNotModified('semantic-block-unavailable');
      return 0;
    }

    const codeSelectors = codeLikeSelectors(this.profile);
    const codeContext = classifyCodeContext(candidate, codeSelectors);
    const sample = sampleCandidateText(
      candidate,
      LIMITS.maxSampleCodepointsPerCandidate,
      protectedSelectors
    );
    if (sample.length === 0) {
      this.incrementNotModified(codeContext === 'block-code' ? 'block-code' : 'empty-text');
      return 0;
    }
    const lang = nearestLang(candidate);
    const classification = this.performance.measure('classification', sample.length, () =>
      classifyLanguage(sample, lang)
    );
    this.recordClassification(classification.language);
    this.processingStats.processedCandidates += 1;
    const decisionElement = directionTarget.element ?? candidate;
    const localDir = normalizeDir(decisionElement.getAttribute('dir'));
    if (
      localDir === 'ltr' &&
      (classification.language === 'persian' || classification.language === 'mixed')
    )
      this.processingStats.explicitLtrPersianCandidates += 1;

    const baseDecision = decideDirectionDetailed({
      localDir,
      nearestAncestorDir: nearestExplicitDir(decisionElement),
      documentDirDeclared: document.documentElement.hasAttribute('dir'),
      detectedDirection: classification.detectedDirection,
      language: classification.language,
      languageConfidence: classification.confidence,
      userMode: this.settings.siteMode,
      hardExcluded: false,
      codeZone: codeContext === 'block-code',
      isHtmlOrBody: false,
      userConfirmedSuspiciousDirection: this.confirmedSuspicious,
    });
    const ruleMatches = matchingProfileRules(candidate, this.profile);
    this.recordRuleMatches(ruleMatches);
    const activeRule = matchedProfileRule(candidate, this.profile);
    const simpleInteractive = isSimpleInteractiveText(candidate);
    const directionDecision = applyProfileDirectionDecision(
      baseDecision,
      activeRule,
      localDir,
      codeContext,
      simpleInteractive
    );
    const action = directionDecision.action;
    this.recordDirectionDecision(action);
    if (
      directionTarget.element === null &&
      (action === 'set-rtl-on-candidate' ||
        action === 'set-ltr-on-candidate' ||
        action === 'set-ltr-on-code-zone')
    )
      this.evidence.recordDirectionMutationSuppressed();
    if (action === 'request-user-confirmation') {
      this.incrementNotModified('user-confirmation-required');
      this.diagnostics.push(
        createDiagnostic('RTLX-DIR-001', 'info', 'DIRECTION-CONFIRMATION-001', 'candidate', {
          count: 1,
        })
      );
      void sendMessage(message('REPORT_SUSPICIOUS_DIRECTION', {})).catch(() => undefined);
    }

    const tokensByTextNode = new Map<Text, readonly BidiToken[]>();
    const evaluatedTextFingerprints = new Map<Text, ProcessedTextFingerprint>();
    let visitedTextNodes = 0;
    if (
      this.settings.bidiIsolation &&
      this.degradation.allowsBidiWrapping() &&
      !this.failures.isDisabled('feature', 'bidi') &&
      codeContext !== 'block-code' &&
      (classification.language === 'persian' || classification.language === 'mixed')
    ) {
      for (const textNode of eligibleTextNodes(
        candidate,
        protectedSelectors,
        this.profile?.selectors.mutationSensitive ?? []
      )) {
        if (visitedTextNodes >= textNodeBudget) break;
        visitedTextNodes += 1;
        const source = textNode.data;
        if (!/[A-Za-z]/u.test(source)) continue;
        const fingerprint = createProcessedTextFingerprint({
          sourceText: source,
          localDir,
          nearestLang: lang,
          profileId: this.profile?.profileId ?? null,
          profileVersion: this.profile?.profileVersion ?? null,
          processorVersion: PROCESSOR_VERSION,
          codeContext,
          matchedRuleId: activeRule?.ruleId ?? null,
          classificationLanguage: classification.language,
          aggressiveNaturalLanguageWrapping: this.settings.aggressiveNaturalLanguageWrapping,
          candidate,
          textNode,
        });
        const previous = this.processedTextNodes.get(textNode);
        if (previous && isProcessedTextFingerprintEqual(previous, fingerprint)) {
          this.evidence.recordTextDecisionCacheHit();
          continue;
        }
        this.evidence.recordTextDecisionCacheMiss();
        evaluatedTextFingerprints.set(textNode, fingerprint);
        const tokens = resolveOverlaps(
          tokenizeBidi(source, this.settings.aggressiveNaturalLanguageWrapping),
          source.length
        );
        if (tokens.length > 0)
          tokensByTextNode.set(textNode, tokens.slice(0, LIMITS.maxTokensPerTextNode));
      }
    }

    const codePlan = planCodeZones(candidate, this.sequence, codeSelectors, this.runtimeOwnerToken);
    this.sequence += codePlan.operations.length;
    const codeResult = applyMutationPlan(
      codePlan,
      this.context.journal,
      this.applyOptions(generation)
    );

    const profileTypographyPreserved =
      activeRule?.typographyMode === 'preserve' &&
      !(activeRule.category === 'mutationSensitive' && simpleInteractive);
    const typoDecision = typographyDecision(
      candidate,
      this.settings,
      this.profile,
      classification.language
    );
    const applyTypography =
      !profileTypographyPreserved &&
      codeContext !== 'block-code' &&
      (classification.language === 'persian' ||
        classification.language === 'mixed' ||
        classification.language === 'latin') &&
      typoDecision !== 'icon-protected' &&
      typoDecision !== 'hard-excluded' &&
      typoDecision !== 'math-zone' &&
      typoDecision !== 'editor-zone' &&
      typoDecision !== 'terminal-zone';

    const typographyBatch = applyTypography
      ? collectTypographyBatch(
          candidate,
          protectedSelectors,
          this.processedTypographyNodes,
          [
            PROCESSOR_VERSION,
            this.profile?.profileId ?? 'none',
            this.profile?.profileVersion ?? 'none',
            classification.language,
            this.settings.persianFont,
            this.settings.latinFont,
          ].join(':'),
          LIMITS.maxTextNodesPerSlice
        )
      : null;
    if (typographyBatch)
      this.evidence.recordTypographyBatch(
        typographyBatch.inspectedNodes,
        typographyBatch.eligibleNodes,
        typographyBatch.targets.length,
        typographyBatch.hasMore,
        typographyBatch.skipped
      );

    const plan = planMutations({
      candidate,
      directionTarget: directionTarget.element,
      alignmentTarget: directionTarget.alignmentElement,
      listMarkerTarget: directionTarget.listMarkerElement,
      action,
      settings: this.settings,
      tokensByTextNode,
      root:
        candidate.getRootNode() instanceof ShadowRoot
          ? (candidate.getRootNode() as ShadowRoot)
          : document,
      startSequence: this.sequence,
      applyTypography,
      alignmentMode:
        activeRule?.category === 'mutationSensitive' && simpleInteractive
          ? 'start'
          : (activeRule?.alignmentMode ?? 'start'),
      remainingWrapperBudget: Math.max(0, LIMITS.maxWrappersPerDocument - this.wrapperCount),
      directionOwnerToken: this.runtimeOwnerToken,
      typographyProtectedSelectors: protectedSelectors,
      ...(typographyBatch ? { typographyTargets: typographyBatch.targets } : {}),
    });
    this.sequence += plan.operations.length;
    const typographyTargetsPlanned = plan.operations.filter(
      (operation) => operation.type === 'add-class' && operation.className === TYPOGRAPHY_CLASS
    ).length;
    const result = applyMutationPlan(plan, this.context.journal, this.applyOptions(generation));
    this.wrapperCount += result.wrappersCommitted;
    this.evidence.recordWrappersCreated(result.wrappersCommitted);
    if (typographyTargetsPlanned > 0) {
      this.typographyStats.targetsApplied += typographyTargetsPlanned;
      this.verifyTypographyCascade(typographyBatch?.targets ?? []);
    }
    if (activeRule)
      this.evidence.recordRuleOutcome(
        activeRule.ruleId,
        result.committed + codeResult.committed,
        action === 'preserve' || action === 'no-op'
      );
    if (
      this.wrapperCount >= LIMITS.maxWrappersPerDocument &&
      [...tokensByTextNode.values()].some((tokens) => tokens.length > 0)
    ) {
      this.failures.trip('feature', 'bidi', 'hard_limit');
      this.recordDegradation(this.degradation.raiseTo(2, 'wrapper-limit'));
    }
    for (const [textNode, fingerprint] of evaluatedTextFingerprints) {
      this.processedTextNodes.set(textNode, fingerprint);
      this.evidence.recordTextDecisionCacheStore();
    }
    if (typographyBatch) {
      for (const [textNode, fingerprint] of typographyBatch.fingerprints)
        this.processedTypographyNodes.set(textNode, fingerprint);
      if (typographyBatch.hasMore) {
        this.pendingTypographyContinuations.add(candidate);
        this.evidence.recordTypographyContinuationQueued();
        this.queue(candidate);
      } else {
        this.pendingTypographyContinuations.delete(candidate);
        this.evidence.recordTypographyScanComplete();
      }
    }
    if (result.committed === 0 && codeResult.committed === 0) {
      this.incrementNotModified(
        explainNotModified(
          action,
          directionDecision.reason,
          exclusionReason(candidate, this.profile),
          typoDecision
        ) ?? 'already-correct'
      );
    }
    return Math.max(visitedTextNodes, 1);
  }

  private recordClassification(language: string): void {
    this.evidence.recordClassification(language);
  }

  private recordDirectionDecision(action: string): void {
    this.evidence.recordDirectionDecision(action);
  }

  private incrementNotModified(reason: string): void {
    this.evidence.incrementNotModified(reason);
  }

  private recordRuleMatches(matches: readonly { ruleId: string; accepted: boolean }[]): void {
    this.evidence.recordRuleMatches(matches);
  }

  private verifyTypographyCascade(targets: readonly Element[]): void {
    let failures = 0;
    for (const target of targets) {
      this.typographyStats.verificationChecks += 1;
      try {
        const family = getComputedStyle(target).fontFamily;
        if (!family.includes('RTLX Selected Text')) failures += 1;
      } catch {
        failures += 1;
      }
    }
    if (failures === 0) return;
    this.typographyStats.verificationFailures += failures;
    this.diagnostics.push(
      createDiagnostic('RTLX-FONT-001', 'warning', 'TYPOGRAPHY-CASCADE-001', 'candidate', {
        checkedTargets: targets.length,
        failedTargets: failures,
      })
    );
  }

  private onMutations(root: Document | ShadowRoot, records: readonly MutationRecord[]): void {
    if (!this.ownsRuntimeLease()) {
      this.lifecycle.destroy();
      return;
    }
    if (!this.lifecycle.canMutate()) return;
    const generation = this.lifecycle.generation();
    const externalRecords = records.filter((record) => !this.ownership.consume(record, generation));
    if (externalRecords.length === 0) return;
    this.backpressure.recordMutationBurst(externalRecords.length);
    this.visibility.pruneDisconnected(LIMITS.intersectionPruneBudget);
    this.typographyProtectionCursors.clear();
    this.pendingTypographyProtectionReconciliations.clear();
    if (location.href !== this.lastUrl) {
      this.lastUrl = location.href;
      this.streaming.cancel();
      this.candidateWork.resetAdmission();
      this.queueDiscovery(root, true);
    }
    let directWorkQueued = false;
    for (const record of externalRecords) {
      const plan = planMutationIntake(record);
      if (plan.invalidateTextBlockEnumeration && plan.mutationElement)
        this.invalidateTextBlockEnumeration(plan.mutationElement);
      if (record.type === 'childList') {
        for (const node of record.removedNodes)
          this.evidence.recordWrappersExternallyRemoved(countOwnedWrappers(node));
        for (const element of plan.addedElements) this.registerSlots(element);
      }
      for (const discoveryRoot of plan.discoveryRoots) {
        this.markMutationCandidateDirty(discoveryRoot);
        this.stageStreaming(discoveryRoot);
      }
      for (const directRoot of plan.directCandidates) {
        const candidate = this.markMutationCandidateDirty(directRoot);
        if (!candidate) continue;
        if (this.streaming.hasPendingRoots()) {
          this.stageStreaming(candidate);
          continue;
        }
        this.queue(candidate);
        directWorkQueued = true;
      }
    }
    if (directWorkQueued) void this.flush();
    this.pruneDetachedRoots();
  }

  private stageStreaming(root: Document | ShadowRoot | Element): void {
    const outcome = this.streaming.enqueue(root);
    if (this.degradation.level() > 0) this.scheduleDegradationRecovery();
    if (outcome.accepted) return;
    if (outcome.overflowEpisodeStarted)
      this.recordDegradation(this.degradation.recordFailure('streaming-queue'));
    this.collectDiagnostics();
  }

  private scheduleDegradationRecovery(): void {
    if (this.degradation.level() === 0 || this.degradation.isPaused()) {
      this.clearDegradationRecoveryTimer();
      return;
    }
    this.clearDegradationRecoveryTimer();
    this.degradationRecoveryTimer = window.setTimeout(
      () => this.attemptDegradationRecovery(),
      LIMITS.degradationStableRecoveryMs
    );
  }

  private attemptDegradationRecovery(): void {
    this.degradationRecoveryTimer = null;
    if (!this.lifecycle.canMutate() || this.degradation.isPaused()) return;
    this.candidateWork.observeQueueDepth(this.pending.size + this.backgroundPending.size);
    const streaming = this.streaming.snapshot();
    const backpressure = this.backpressure.snapshot();
    const quiescent =
      !this.processing &&
      !streaming.pending &&
      streaming.quietForMs >= LIMITS.degradationStableRecoveryMs &&
      this.pending.size === 0 &&
      this.backgroundPending.size === 0 &&
      this.pendingDiscovery.size === 0 &&
      this.discoveryCursors.size === 0 &&
      this.pendingTextBlockEnumerations.size === 0 &&
      this.pendingTypographyContinuations.size === 0 &&
      this.pendingTypographyProtectionReconciliations.size === 0 &&
      backpressure.level === 'normal' &&
      !backpressure.longTaskSignal;
    const transition = quiescent
      ? this.degradation.recoverAfterQuiescence()
      : this.degradation.maybeRecover();
    this.recordDegradation(transition);
    if (this.degradation.level() > 0 && !this.degradation.isPaused())
      this.scheduleDegradationRecovery();
  }

  private clearDegradationRecoveryTimer(): void {
    if (this.degradationRecoveryTimer !== null) window.clearTimeout(this.degradationRecoveryTimer);
    this.degradationRecoveryTimer = null;
  }

  private pruneDetachedRoots(): void {
    for (const entry of this.roots.values()) {
      if (!(entry.root instanceof ShadowRoot) || entry.root.host.isConnected) continue;
      for (const slot of entry.slots) slot.removeEventListener('slotchange', this.onSlotChange);
      this.observers.disconnect(entry.root);
      this.roots.delete(entry.root);
    }
  }

  private readonly onSlotChange = (event: Event): void => {
    const slot = event.currentTarget;
    if (!(slot instanceof HTMLSlotElement)) return;
    for (const node of slot.assignedNodes({ flatten: true })) {
      const element = node instanceof Element ? node : node.parentElement;
      if (element) {
        this.stageStreaming(element);
      }
    }
  };

  private readonly onRouteChange = (): void => {
    if (!this.lifecycle.canMutate()) return;
    this.lastUrl = location.href;
    this.candidateWork.resetAdmission();
    this.queueDiscovery(document, true);
    void this.flush();
  };
  private processEditableInput(target: HTMLElement, value: string): void {
    if (
      !this.lifecycle.canMutate() ||
      !this.settings.inputDirectionAssistant ||
      !this.settings.formFieldDirection ||
      !isEditableTarget(target)
    )
      return;
    const desired = directionForEditableText(value, target.getAttribute('lang'));
    const current = target.getAttribute('dir');
    if (current === desired) return;
    const operations: MutationOperation[] = [];
    if (current === null) {
      operations.push({
        type: 'add-attribute',
        sequence: this.sequence++,
        target,
        owner: 'RTLX-15.9.11',
        requirementId: 'INPUT-DIRECTION-001',
        name: 'dir',
        value: desired,
        expectedCurrentValue: null,
      });
      this.ownedInputDirections.set(target, desired);
    } else if (this.ownedInputDirections.get(target) === current) {
      operations.push({
        type: 'replace-attribute',
        sequence: this.sequence++,
        target,
        owner: 'RTLX-15.9.11',
        requirementId: 'INPUT-DIRECTION-001',
        name: 'dir',
        value: desired,
        expectedCurrentValue: current,
      });
    }
    if (operations.length > 0 && !target.hasAttribute(DIRECTION_OWNER_ATTRIBUTE)) {
      operations.push({
        type: 'add-attribute',
        sequence: this.sequence++,
        target,
        owner: 'RTLX-15.9.11',
        requirementId: 'MUTATION-OWNERSHIP-002',
        name: DIRECTION_OWNER_ATTRIBUTE,
        value: this.runtimeOwnerToken,
        expectedCurrentValue: null,
      });
    }
    if (operations.length > 0) {
      applyMutationPlan(
        createPlan(operations),
        this.context.journal,
        this.applyOptions(this.lifecycle.generation())
      );
      this.ownedInputDirections.set(target, desired);
    }
  }

  private cleanupListeners(): void {
    window.removeEventListener('hashchange', this.onRouteChange);
    window.removeEventListener('popstate', this.onRouteChange);
    this.inputCoalescer.destroy();
    for (const entry of this.roots.values()) {
      for (const slot of entry.slots) slot.removeEventListener('slotchange', this.onSlotChange);
      entry.slots.clear();
    }
    this.listenersRegistered = false;
  }

  private collectDiagnostics(): void {
    this.diagnostics.push(...this.failures.diagnostics.splice(0));
    this.diagnostics.push(...this.context.diagnostics.splice(0));
  }

  private reportDiagnostics(): void {
    if (this.diagnostics.length === 0) return;
    this.diagnosticBatcher.enqueue(this.diagnostics.splice(0));
  }

  private async sendDiagnosticBatch(diagnostics: readonly Diagnostic[]): Promise<void> {
    const stamped = diagnostics.map((diagnostic) =>
      Object.freeze({
        ...diagnostic,
        details: Object.freeze({
          ...diagnostic.details,
          runtimeInstanceId: this.runtimeInstanceId,
        }),
      })
    );
    const response = await sendMessage(message('REPORT_DIAGNOSTICS', { diagnostics: stamped }));
    if (!response.success) throw new Error(response.error.message);
  }

  private applyOptions(generation = this.lifecycle.generation()): Readonly<{
    ownership: OwnedMutationSuppression;
    generation: number;
  }> {
    return Object.freeze({ ownership: this.ownership, generation });
  }

  private async activateRuntime(resume: boolean): Promise<void> {
    this.context.start();
    if (this.context.state() !== 'ACTIVE' || !this.lifecycle.canMutate()) return;
    this.teardownComplete = false;
    this.backpressure.setHidden(false);
    this.backpressure.startLongTaskObserver();
    this.visibility.reset();
    if (resume) this.resumeCandidateBudget = LIMITS.lifecycleResumeDiscoveryLimit;
    this.registerRoot(document, 0);
    this.queueDiscovery(document, true);
    await this.flush();
    if (!this.listenersRegistered) {
      window.addEventListener('hashchange', this.onRouteChange);
      window.addEventListener('popstate', this.onRouteChange);
      this.inputCoalescer.start();
      this.listenersRegistered = true;
    }
  }

  private suspendForLifecycle(frozen: boolean): void {
    this.cancelAllUnprocessedTextBlocks();
    this.candidateWork.resetAdmission();
    this.candidateWork.resetSaturation();
    this.backpressure.setHidden(true);
    this.pending.clear();
    this.backgroundPending.clear();
    this.pendingDiscovery.clear();
    this.discoveryCursors.clear();
    this.resetTextBlockEnumerationState();
    this.typographyProtectionCursors.clear();
    this.pendingTypographyProtectionReconciliations.clear();
    this.pendingTypographyContinuations.clear();
    this.delays.cancel();
    this.streaming.cancel();
    this.clearDegradationRecoveryTimer();
    this.visibility.disconnect();
    this.ownership.clear();
    if (this.context.state() === 'ACTIVE') this.context.suspend();
    if (frozen) {
      this.disconnectObservedRoots();
      this.roots.clear();
    }
  }

  private resumeFromLifecycle(): void {
    this.visibility.pruneDisconnected(LIMITS.intersectionPruneBudget);
    void this.activateRuntime(true);
  }

  private abortWork(disconnectRoots: boolean): void {
    this.cancelAllUnprocessedTextBlocks();
    this.candidateWork.resetAdmission();
    this.candidateWork.resetSaturation();
    this.pending.clear();
    this.backgroundPending.clear();
    this.pendingDiscovery.clear();
    this.discoveryCursors.clear();
    this.resetTextBlockEnumerationState();
    this.typographyProtectionCursors.clear();
    this.pendingTypographyProtectionReconciliations.clear();
    this.pendingTypographyContinuations.clear();
    this.delays.cancel();
    this.streaming.cancel();
    this.clearDegradationRecoveryTimer();
    this.visibility.disconnect();
    this.ownership.clear();
    if (disconnectRoots) {
      this.disconnectObservedRoots();
      this.roots.clear();
    } else this.observers.disconnect();
  }

  private disconnectObservedRoots(): void {
    for (const entry of this.roots.values()) {
      for (const slot of entry.slots) slot.removeEventListener('slotchange', this.onSlotChange);
      entry.slots.clear();
    }
    this.observers.disconnect();
  }

  private teardownRuntime(): void {
    if (this.teardownComplete) return;
    this.teardownComplete = true;
    this.abortWork(true);
    this.backpressure.stop();
    this.inputCoalescer.destroy();
    if (this.ownsRuntimeLease()) document.documentElement.removeAttribute(RUNTIME_OWNER_ATTRIBUTE);
    this.context.destroy();
    this.processedTextNodes = new WeakMap<Text, ProcessedTextFingerprint>();
    this.processedTypographyNodes = new WeakMap<Text, string>();
    this.resetTextBlockEnumerationState();
    this.typographyProtectionCursors.clear();
    this.pendingTypographyProtectionReconciliations.clear();
    this.expandedSemanticRegions = new WeakSet<Element>();
    this.recordedSemanticRegions = new WeakSet<Element>();
    this.recordedTextBlocks = new WeakSet<Element>();
    this.processedTextBlocks = new WeakSet<Element>();
    this.pendingTypographyContinuations.clear();
    this.wrapperCount = 0;
    this.cleanupListeners();
    this.collectDiagnostics();
    this.reportDiagnostics();
    void this.diagnosticBatcher.destroy();
  }

  private ownsRuntimeLease(): boolean {
    return (
      document.documentElement.getAttribute(RUNTIME_OWNER_ATTRIBUTE) === this.runtimeOwnerToken
    );
  }

  private pruneDetachedCandidateState(candidate: Element): void {
    if (candidate.isConnected) return;
    this.cancelUnprocessedTextBlock(candidate);
    if (this.pendingTextBlockEnumerations.delete(candidate))
      this.detachedWorkPruned.textBlockEnumerations += 1;
    this.textBlockEnumerationCursors.delete(candidate);
    this.textBlockEnumerationResults.delete(candidate);
    if (this.pendingTypographyContinuations.delete(candidate))
      this.detachedWorkPruned.typographyContinuations += 1;
    if (this.pendingTypographyProtectionReconciliations.delete(candidate))
      this.detachedWorkPruned.typographyProtectionReconciliations += 1;
    this.typographyProtectionCursors.delete(candidate);
  }

  private pruneDetachedWork(): void {
    this.detachedWorkPruned.textBlockEnumerations += pruneDetachedTextBlockState({
      pending: this.pendingTextBlockEnumerations,
      cursors: this.textBlockEnumerationCursors,
      results: this.textBlockEnumerationResults,
    });
    for (const candidate of [...this.pendingTypographyContinuations]) {
      if (candidate.isConnected) continue;
      this.pendingTypographyContinuations.delete(candidate);
      this.detachedWorkPruned.typographyContinuations += 1;
    }
    for (const candidate of [...this.pendingTypographyProtectionReconciliations]) {
      if (candidate.isConnected) continue;
      this.pendingTypographyProtectionReconciliations.delete(candidate);
      this.typographyProtectionCursors.delete(candidate);
      this.detachedWorkPruned.typographyProtectionReconciliations += 1;
    }
    for (const candidate of [...this.unprocessedTextBlocks.keys()]) {
      if (!candidate.isConnected) this.cancelUnprocessedTextBlock(candidate);
    }
  }

  private recordDegradation(transition: DegradationTransition | null): void {
    if (transition) {
      const backpressure = this.backpressure.snapshot();
      this.diagnostics.push(
        createDiagnostic(
          'RTLX-DEGRADE-001',
          transition.to === 4 ? 'fatal' : 'warning',
          'BH-008',
          'frame',
          {
            fromLevel: transition.from,
            toLevel: transition.to,
            recovery: transition.recovery,
            terminal: transition.terminal,
            failureKey: transition.failureKey,
            pendingVisible: this.pending.size,
            pendingBackground: this.backgroundPending.size,
            pendingDiscovery: this.pendingDiscovery.size,
            visibilityTargets: this.visibility.size(),
            queueDepth: backpressure.queueDepth,
            mutationBurst: backpressure.mutationBurst,
            longTaskSignal: backpressure.longTaskSignal,
          }
        )
      );
    }
    if (this.degradation.level() > 0 && !this.degradation.isPaused())
      this.scheduleDegradationRecovery();
    else this.clearDegradationRecoveryTimer();
  }
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, delayMs)));
}

function applyProfileDirectionDecision(
  base: DirectionDecision,
  rule: SiteProfile['rules'][number] | null,
  localDir: 'rtl' | 'ltr' | 'auto' | null,
  codeContext: ReturnType<typeof classifyCodeContext>,
  simpleInteractive: boolean
): DirectionDecision {
  if (!rule) return base;
  if (rule.directionMode === 'preserve') {
    if (rule.category === 'mutationSensitive' && simpleInteractive) return base;
    return Object.freeze({ action: 'preserve', reason: 'profile-preserve' });
  }
  if (localDir !== null) return base;
  if (rule.directionMode === 'force-rtl')
    return Object.freeze({ action: 'set-rtl-on-candidate', reason: 'profile-force-rtl' });
  if (rule.directionMode === 'force-ltr') {
    if (rule.category === 'code' && codeContext !== 'block-code') return base;
    return Object.freeze({ action: 'set-ltr-on-candidate', reason: 'profile-force-ltr' });
  }
  return base;
}

function explainNotModified(
  action: string,
  reason: string,
  exclusion: string | null,
  typography: string
): string | null {
  if (exclusion) return exclusion;
  if (reason === 'explicit-direction-preserved') return 'explicit-direction';
  if (reason === 'profile-preserve') return 'profile-preserve';
  if (reason === 'block-code-forced-ltr') return 'block-code';
  if (action === 'request-user-confirmation') return 'user-confirmation-required';
  if (typography === 'icon-protected') return 'icon-protected';
  if (typography === 'not-persian' && action === 'no-op') return 'language-not-actionable';
  if (action === 'preserve') return 'already-correct';
  if (action === 'no-op') return reason || 'insufficient-evidence';
  return null;
}

function fontDiagnosticsSnapshot(fontSetReady: boolean): RuntimeSnapshot['fontDiagnostics'] {
  if (!('fonts' in document) || !document.fonts)
    return Object.freeze({
      fontSetStatus: 'unsupported',
      fontSetReady: false,
      buildFlavor: BUILD_FLAVOR,
      declaredFaces: 0,
      loadedFaces: 0,
      errorFaces: 0,
      exactLocalFontUsed: 'unknown',
    });
  const faces = [...document.fonts].filter((face) =>
    /RTLX Selected Text|RTLX Local Persian|RTLX Mixed Text/u.test(face.family)
  );
  return Object.freeze({
    fontSetStatus: document.fonts.status,
    fontSetReady,
    buildFlavor: BUILD_FLAVOR,
    declaredFaces: faces.length,
    loadedFaces: faces.filter((face) => face.status === 'loaded').length,
    errorFaces: faces.filter((face) => face.status === 'error').length,
    exactLocalFontUsed: 'unknown',
  });
}

function countOwnedWrappers(node: Node): number {
  if (!(node instanceof Element)) return 0;
  return (
    (node.classList.contains(OWNED_WRAPPER_CLASS) ? 1 : 0) +
    node.querySelectorAll(`.${OWNED_WRAPPER_CLASS}`).length
  );
}

function runtimePageDebugSnapshot(
  settings: Settings,
  fontSetReady: boolean
): RuntimeSnapshot['pageDebug'] {
  const style = document.getElementById(STYLE_ELEMENT_ID);
  const firstOwned = document.querySelector(`.${OWNED_CLASS}`);
  const firstTypography = document.querySelector(`.${TYPOGRAPHY_CLASS}`);
  return Object.freeze({
    schemaVersion: '1.2.0',
    buildFlavor: BUILD_FLAVOR,
    htmlDir: normalizeDir(document.documentElement.getAttribute('dir')),
    bodyDir: normalizeDir(document.body?.getAttribute('dir') ?? null),
    documentLang: document.documentElement.getAttribute('lang'),
    styleElementPresent: style !== null,
    styleElementHasBundledFontFace: style?.textContent?.includes('RTLX Selected Text') === true,
    fontSetStatus: 'fonts' in document && document.fonts ? document.fonts.status : 'unsupported',
    fontSetReady,
    declaredFontFaces: fontDiagnosticsSnapshot(fontSetReady).declaredFaces,
    loadedFontFaces: fontDiagnosticsSnapshot(fontSetReady).loadedFaces,
    errorFontFaces: fontDiagnosticsSnapshot(fontSetReady).errorFaces,
    ownedCandidates: document.querySelectorAll(`.${OWNED_CLASS}`).length,
    ownedTypographyTargets: document.querySelectorAll(`.${TYPOGRAPHY_CLASS}`).length,
    ownedWrappers: document.querySelectorAll(`.${OWNED_WRAPPER_CLASS}`).length,
    firstOwnedCandidate: firstOwned ? firstOwnedCandidateDebug(firstOwned) : null,
    firstTypographyTarget: firstTypography ? firstOwnedCandidateDebug(firstTypography) : null,
    effectiveSettings: Object.freeze({
      siteMode: settings.siteMode,
      directionCorrection: settings.directionCorrection,
      bidiIsolation: settings.bidiIsolation,
      typography: settings.typography,
      latinFont: settings.latinFont,
      persianFont: settings.persianFont,
    }),
  });
}

function firstOwnedCandidateDebug(
  element: Element
): RuntimeSnapshot['pageDebug']['firstOwnedCandidate'] {
  const computed = getComputedStyle(element);
  return Object.freeze({
    tag: element.tagName.toLowerCase(),
    dir: normalizeDir(element.getAttribute('dir')),
    role: element.getAttribute('role'),
    computedDirection: computed.direction,
    computedTextAlign: computed.textAlign,
    computedFontFamily: computed.fontFamily,
  });
}

function isProbablyVisible(element: Element): boolean {
  if (!element.isConnected || element.closest('[hidden],[inert]')) return false;
  try {
    const rect = element.getBoundingClientRect();
    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    const height = window.innerHeight || document.documentElement.clientHeight || 0;
    return rect.bottom >= 0 && rect.right >= 0 && rect.top <= height && rect.left <= width;
  } catch {
    return true;
  }
}

function sampleCandidateText(
  candidate: Element,
  limit: number,
  protectedSelectors: readonly string[]
): string {
  let output = '';
  const walker = document.createTreeWalker(candidate, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (
        !parent ||
        isHardExcluded(parent) ||
        matchesAny(parent, protectedSelectors) ||
        parent.closest('[hidden],[inert],template')
      )
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node && Array.from(output).length < limit) {
    output += (node.nodeValue ?? '').slice(0, limit - output.length);
    node = walker.nextNode();
  }
  return output.normalize('NFKC');
}

function* eligibleTextNodes(
  candidate: Element,
  protectedSelectors: readonly string[],
  mutationSensitiveSelectors: readonly string[]
): Generator<Text> {
  const walker = document.createTreeWalker(candidate, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node as Text;
    const parent = text.parentElement;
    if (
      parent &&
      !isHardExcluded(parent) &&
      !matchesAny(parent, protectedSelectors) &&
      (!isMutationSensitive(parent, mutationSensitiveSelectors) ||
        isSimpleInteractiveText(
          parent.closest(
            'a,button,label,summary,[role=button],[role=link],[role=menuitem],[role=tab]'
          ) ?? parent
        )) &&
      !hasExistingIsolation(parent) &&
      !parent.closest('[hidden],[inert],template')
    )
      yield text;
    node = walker.nextNode();
  }
}

function nearestCandidate(element: Element): Element | null {
  return element.closest(
    'main,article,[role="main"],p,div,section,li,td,th,blockquote,h1,h2,h3,h4,h5,h6'
  );
}
function nearestLang(element: Element): string | null {
  let current: Element | null = element;
  while (current) {
    const lang = current.getAttribute('lang');
    if (lang) return lang;
    current = current.parentElement;
  }
  return document.documentElement.getAttribute('lang');
}
function safeInspectionStyle(element: Element): CSSStyleDeclaration | null {
  try {
    return getComputedStyle(element);
  } catch {
    return null;
  }
}

function normalizeDir(value: string | null): 'rtl' | 'ltr' | 'auto' | null {
  return value === 'rtl' || value === 'ltr' || value === 'auto' ? value : null;
}

function isEditableTarget(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement)
    return (
      element.type === 'text' ||
      element.type === 'search' ||
      element.type === 'email' ||
      element.type === 'url'
    );
  return (
    element instanceof HTMLTextAreaElement ||
    element.isContentEditable ||
    element.getAttribute('role') === 'textbox'
  );
}
