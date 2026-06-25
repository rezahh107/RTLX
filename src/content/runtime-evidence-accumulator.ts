import type { RuntimeSnapshot } from '../shared/types';

interface MutableRuleEffectiveness {
  evaluated: number;
  accepted: number;
  suppressed: number;
  mutationsApplied: number;
  preserved: number;
}

export type RuntimeEvidenceSnapshot = Pick<
  RuntimeSnapshot,
  | 'classifications'
  | 'directionDecisions'
  | 'notModifiedReasons'
  | 'ruleEffectiveness'
  | 'wrapperLifecycle'
  | 'textDecisionCache'
  | 'layoutSafety'
  | 'textBlockCoverage'
  | 'processedTextFingerprintCache'
>;

export class RuntimeEvidenceAccumulator {
  private readonly classificationStats = {
    persian: 0,
    mixed: 0,
    latin: 0,
    arabicScriptNonPersian: 0,
    unknown: 0,
  };
  private readonly directionDecisionStats = {
    rtl: 0,
    ltr: 0,
    preserve: 0,
    noOp: 0,
    confirmation: 0,
  };
  private readonly notModifiedReasons = new Map<string, number>();
  private readonly ruleEffectiveness = new Map<string, MutableRuleEffectiveness>();
  private readonly wrapperLifecycle = {
    created: 0,
    externallyRemoved: 0,
  };
  private readonly textDecisionCache = {
    hits: 0,
    misses: 0,
    stores: 0,
  };
  private readonly layoutSafety = {
    semanticLayoutContainers: 0,
    uniqueSemanticLayoutContainers: 0,
    directionTargetsRedirected: 0,
    uniqueDirectionTargetsRedirected: 0,
    directionMutationsSuppressed: 0,
    directionTargetRedirectReasons: new Map<string, number>(),
  };
  private readonly seenSemanticLayoutContainers = new WeakSet<Element>();
  private readonly seenRedirectedDirectionTargets = new WeakSet<Element>();
  private readonly textBlockCoverage = {
    semanticRegions: 0,
    textBlocksDiscovered: 0,
    textBlocksProcessed: 0,
    textBlockKinds: new Map<string, number>(),
    textBlockElementsInspected: 0,
    textBlockEnumerationContinuationsQueued: 0,
    textBlockEnumerationsCompleted: 0,
    typographyNodesInspected: 0,
    typographyNodesEligible: 0,
    typographyTargetsPlanned: 0,
    typographyContinuationsQueued: 0,
    typographyScansCompleted: 0,
    typographySkipped: new Map<string, number>(),
  };

  public recordClassification(language: string): void {
    if (language === 'persian') this.classificationStats.persian += 1;
    else if (language === 'mixed') this.classificationStats.mixed += 1;
    else if (language === 'latin') this.classificationStats.latin += 1;
    else if (language === 'arabic-script-non-persian')
      this.classificationStats.arabicScriptNonPersian += 1;
    else this.classificationStats.unknown += 1;
  }

  public recordDirectionDecision(action: string): void {
    if (action === 'set-rtl-on-candidate') this.directionDecisionStats.rtl += 1;
    else if (action === 'set-ltr-on-candidate' || action === 'set-ltr-on-code-zone')
      this.directionDecisionStats.ltr += 1;
    else if (action === 'preserve') this.directionDecisionStats.preserve += 1;
    else if (action === 'request-user-confirmation') this.directionDecisionStats.confirmation += 1;
    else this.directionDecisionStats.noOp += 1;
  }

  public incrementNotModified(reason: string): void {
    this.notModifiedReasons.set(reason, (this.notModifiedReasons.get(reason) ?? 0) + 1);
  }

  public recordRuleMatches(matches: readonly { ruleId: string; accepted: boolean }[]): void {
    for (const match of matches) {
      const stats = this.ruleEffectiveness.get(match.ruleId) ?? {
        evaluated: 0,
        accepted: 0,
        suppressed: 0,
        mutationsApplied: 0,
        preserved: 0,
      };
      stats.evaluated += 1;
      if (match.accepted) stats.accepted += 1;
      else stats.suppressed += 1;
      this.ruleEffectiveness.set(match.ruleId, stats);
    }
  }

  public recordRuleOutcome(ruleId: string, mutationsApplied: number, preserved: boolean): void {
    const stats = this.ruleEffectiveness.get(ruleId);
    if (!stats) return;
    stats.mutationsApplied += mutationsApplied;
    if (preserved) stats.preserved += 1;
  }

  public recordTextDecisionCacheHit(): void {
    this.textDecisionCache.hits += 1;
  }

  public recordTextDecisionCacheMiss(): void {
    this.textDecisionCache.misses += 1;
  }

  public recordTextDecisionCacheStore(): void {
    this.textDecisionCache.stores += 1;
  }

  public recordLayoutSensitiveSemanticBlock(element?: Element): void {
    this.layoutSafety.semanticLayoutContainers += 1;
    if (!element || !this.seenSemanticLayoutContainers.has(element)) {
      if (element) this.seenSemanticLayoutContainers.add(element);
      this.layoutSafety.uniqueSemanticLayoutContainers += 1;
    }
  }

  public recordDirectionTargetRedirected(element?: Element, reason = 'unspecified'): void {
    this.layoutSafety.directionTargetsRedirected += 1;
    if (!element || !this.seenRedirectedDirectionTargets.has(element)) {
      if (element) this.seenRedirectedDirectionTargets.add(element);
      this.layoutSafety.uniqueDirectionTargetsRedirected += 1;
    }
    this.layoutSafety.directionTargetRedirectReasons.set(
      reason,
      (this.layoutSafety.directionTargetRedirectReasons.get(reason) ?? 0) + 1
    );
  }

  public recordDirectionMutationSuppressed(): void {
    this.layoutSafety.directionMutationsSuppressed += 1;
  }

  public recordSemanticRegion(blockCount: number): void {
    void blockCount;
    this.textBlockCoverage.semanticRegions += 1;
  }

  public recordTextBlockDiscovered(kind: string): void {
    this.textBlockCoverage.textBlocksDiscovered += 1;
    this.textBlockCoverage.textBlockKinds.set(
      kind,
      (this.textBlockCoverage.textBlockKinds.get(kind) ?? 0) + 1
    );
  }

  public recordTextBlockProcessed(): void {
    this.textBlockCoverage.textBlocksProcessed += 1;
  }

  public cancelTextBlockDiscovered(kind: string): void {
    this.textBlockCoverage.textBlocksDiscovered = Math.max(
      0,
      this.textBlockCoverage.textBlocksDiscovered - 1
    );
    const count = this.textBlockCoverage.textBlockKinds.get(kind) ?? 0;
    if (count <= 1) this.textBlockCoverage.textBlockKinds.delete(kind);
    else this.textBlockCoverage.textBlockKinds.set(kind, count - 1);
  }

  public recordTextBlockEnumerationBatch(inspected: number, hasMore: boolean): void {
    void hasMore;
    this.textBlockCoverage.textBlockElementsInspected += Math.max(0, inspected);
  }

  public recordTextBlockEnumerationContinuationQueued(): void {
    this.textBlockCoverage.textBlockEnumerationContinuationsQueued += 1;
  }

  public recordTextBlockEnumerationComplete(): void {
    this.textBlockCoverage.textBlockEnumerationsCompleted += 1;
  }

  public recordTypographyBatch(
    inspected: number,
    eligible: number,
    targets: number,
    _hasMore: boolean,
    skipped: Readonly<Record<string, number>>
  ): void {
    this.textBlockCoverage.typographyNodesInspected += Math.max(0, inspected);
    this.textBlockCoverage.typographyNodesEligible += Math.max(0, eligible);
    this.textBlockCoverage.typographyTargetsPlanned += Math.max(0, targets);
    for (const [reason, count] of Object.entries(skipped)) {
      if (count <= 0) continue;
      this.textBlockCoverage.typographySkipped.set(
        reason,
        (this.textBlockCoverage.typographySkipped.get(reason) ?? 0) + count
      );
    }
  }

  public recordTypographyContinuationQueued(): void {
    this.textBlockCoverage.typographyContinuationsQueued += 1;
  }

  public recordTypographyScanComplete(): void {
    this.textBlockCoverage.typographyScansCompleted += 1;
  }

  public recordWrappersCreated(count: number): void {
    this.wrapperLifecycle.created += Math.max(0, count);
  }

  public recordWrappersExternallyRemoved(count: number): void {
    this.wrapperLifecycle.externallyRemoved += Math.max(0, count);
  }

  public snapshot(
    currentWrappers: number,
    pendingTypographyContinuations = 0,
    pendingTextBlockEnumerations = 0,
    pendingTypographyProtectionReconciliations = 0
  ): RuntimeEvidenceSnapshot {
    return Object.freeze({
      classifications: Object.freeze({ ...this.classificationStats }),
      directionDecisions: Object.freeze({ ...this.directionDecisionStats }),
      notModifiedReasons: Object.freeze(
        Object.fromEntries(
          [...this.notModifiedReasons.entries()].sort(([a], [b]) => a.localeCompare(b))
        )
      ),
      ruleEffectiveness: Object.freeze(
        [...this.ruleEffectiveness.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([ruleId, stats]) =>
            Object.freeze({
              ruleId,
              ...stats,
              selectorMatched: stats.evaluated,
              ruleAccepted: stats.accepted,
              ruleSuppressed: stats.suppressed,
              mutationOperationsCommitted: stats.mutationsApplied,
              directionPreserved: stats.preserved,
            })
          )
      ),
      textDecisionCache: Object.freeze({ ...this.textDecisionCache }),
      processedTextFingerprintCache: Object.freeze({ ...this.textDecisionCache }),
      layoutSafety: Object.freeze({
        semanticLayoutContainers: this.layoutSafety.semanticLayoutContainers,
        uniqueSemanticLayoutContainers: this.layoutSafety.uniqueSemanticLayoutContainers,
        directionTargetsRedirected: this.layoutSafety.directionTargetsRedirected,
        uniqueDirectionTargetsRedirected: this.layoutSafety.uniqueDirectionTargetsRedirected,
        directionMutationsSuppressed: this.layoutSafety.directionMutationsSuppressed,
        directionTargetRedirectReasons: Object.freeze(
          Object.fromEntries(
            [...this.layoutSafety.directionTargetRedirectReasons.entries()].sort(([a], [b]) =>
              a.localeCompare(b)
            )
          )
        ),
      }),
      textBlockCoverage: Object.freeze({
        semanticRegions: this.textBlockCoverage.semanticRegions,
        textBlocksDiscovered: this.textBlockCoverage.textBlocksDiscovered,
        textBlocksProcessed: this.textBlockCoverage.textBlocksProcessed,
        textBlockKinds: Object.freeze(
          Object.fromEntries(
            [...this.textBlockCoverage.textBlockKinds.entries()].sort(([a], [b]) =>
              a.localeCompare(b)
            )
          )
        ),
        textBlockElementsInspected: this.textBlockCoverage.textBlockElementsInspected,
        textBlockEnumerationContinuationsQueued:
          this.textBlockCoverage.textBlockEnumerationContinuationsQueued,
        textBlockEnumerationsCompleted: this.textBlockCoverage.textBlockEnumerationsCompleted,
        textBlockEnumerationsPending: Math.max(0, pendingTextBlockEnumerations),
        typographyNodesInspected: this.textBlockCoverage.typographyNodesInspected,
        typographyNodesEligible: this.textBlockCoverage.typographyNodesEligible,
        typographyTargetsPlanned: this.textBlockCoverage.typographyTargetsPlanned,
        typographyContinuationsQueued: this.textBlockCoverage.typographyContinuationsQueued,
        typographyScansCompleted: this.textBlockCoverage.typographyScansCompleted,
        typographyContinuationsPending: Math.max(0, pendingTypographyContinuations),
        typographyProtectionReconciliationsPending: Math.max(
          0,
          pendingTypographyProtectionReconciliations
        ),
        typographySkipped: Object.freeze(
          Object.fromEntries(
            [...this.textBlockCoverage.typographySkipped.entries()].sort(([a], [b]) =>
              a.localeCompare(b)
            )
          )
        ),
      }),
      wrapperLifecycle: Object.freeze({
        created: this.wrapperLifecycle.created,
        externallyRemoved: this.wrapperLifecycle.externallyRemoved,
        current: Math.max(0, currentWrappers),
      }),
    });
  }
}
