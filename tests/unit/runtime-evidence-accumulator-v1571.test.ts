import { describe, expect, it } from 'vitest';
import { RuntimeEvidenceAccumulator } from '../../src/content/runtime-evidence-accumulator';

describe('v15.9.1 runtime evidence accumulator', () => {
  it('produces deterministic aggregate evidence without candidate records', () => {
    const evidence = new RuntimeEvidenceAccumulator();
    evidence.recordClassification('mixed');
    evidence.recordClassification('persian');
    evidence.recordClassification('unknown-value');
    evidence.recordDirectionDecision('set-rtl-on-candidate');
    evidence.recordDirectionDecision('preserve');
    evidence.incrementNotModified('already-correct');
    evidence.incrementNotModified('profile-preserve');
    evidence.incrementNotModified('already-correct');
    evidence.recordRuleMatches([
      { ruleId: 'z-rule', accepted: false },
      { ruleId: 'a-rule', accepted: true },
    ]);
    evidence.recordRuleOutcome('a-rule', 3, false);
    evidence.recordRuleOutcome('z-rule', 0, true);
    evidence.recordTextDecisionCacheHit();
    evidence.recordTextDecisionCacheMiss();
    evidence.recordTextDecisionCacheStore();
    evidence.recordLayoutSensitiveSemanticBlock();
    evidence.recordDirectionTargetRedirected();
    evidence.recordDirectionMutationSuppressed();
    evidence.recordSemanticRegion(2);
    evidence.recordTextBlockDiscovered('heading');
    evidence.recordTextBlockDiscovered('paragraph');
    evidence.recordTextBlockProcessed();
    evidence.recordTypographyBatch(50, 47, 45, true, {
      'code-zone': 2,
      'icon-boundary': 1,
    });
    evidence.recordTypographyContinuationQueued();
    evidence.recordTypographyScanComplete();
    evidence.recordWrappersCreated(2);
    evidence.recordWrappersExternallyRemoved(1);

    expect(evidence.snapshot(1)).toEqual({
      classifications: {
        persian: 1,
        mixed: 1,
        latin: 0,
        arabicScriptNonPersian: 0,
        unknown: 1,
      },
      directionDecisions: {
        rtl: 1,
        ltr: 0,
        preserve: 1,
        noOp: 0,
        confirmation: 0,
      },
      notModifiedReasons: {
        'already-correct': 2,
        'profile-preserve': 1,
      },
      ruleEffectiveness: [
        {
          ruleId: 'a-rule',
          evaluated: 1,
          accepted: 1,
          suppressed: 0,
          mutationsApplied: 3,
          preserved: 0,
          selectorMatched: 1,
          ruleAccepted: 1,
          ruleSuppressed: 0,
          mutationOperationsCommitted: 3,
          directionPreserved: 0,
        },
        {
          ruleId: 'z-rule',
          evaluated: 1,
          accepted: 0,
          suppressed: 1,
          mutationsApplied: 0,
          preserved: 1,
          selectorMatched: 1,
          ruleAccepted: 0,
          ruleSuppressed: 1,
          mutationOperationsCommitted: 0,
          directionPreserved: 1,
        },
      ],
      textDecisionCache: {
        hits: 1,
        misses: 1,
        stores: 1,
      },
      processedTextFingerprintCache: {
        hits: 1,
        misses: 1,
        stores: 1,
      },
      layoutSafety: {
        semanticLayoutContainers: 1,
        uniqueSemanticLayoutContainers: 1,
        directionTargetsRedirected: 1,
        uniqueDirectionTargetsRedirected: 1,
        directionMutationsSuppressed: 1,
        directionTargetRedirectReasons: { unspecified: 1 },
      },
      textBlockCoverage: {
        semanticRegions: 1,
        textBlocksDiscovered: 2,
        textBlocksProcessed: 1,
        textBlockKinds: { heading: 1, paragraph: 1 },
        textBlockElementsInspected: 0,
        textBlockEnumerationContinuationsQueued: 0,
        textBlockEnumerationsCompleted: 0,
        textBlockEnumerationsPending: 0,
        typographyNodesInspected: 50,
        typographyNodesEligible: 47,
        typographyTargetsPlanned: 45,
        typographyContinuationsQueued: 1,
        typographyScansCompleted: 1,
        typographyContinuationsPending: 0,
        typographyProtectionReconciliationsPending: 0,
        typographySkipped: { 'code-zone': 2, 'icon-boundary': 1 },
      },
      wrapperLifecycle: {
        created: 2,
        externallyRemoved: 1,
        current: 1,
      },
    });
  });

  it('ignores negative wrapper deltas', () => {
    const evidence = new RuntimeEvidenceAccumulator();
    evidence.recordWrappersCreated(-3);
    evidence.recordWrappersExternallyRemoved(-2);
    expect(evidence.snapshot(-1).wrapperLifecycle).toEqual({
      created: 0,
      externallyRemoved: 0,
      current: 0,
    });
  });
});
