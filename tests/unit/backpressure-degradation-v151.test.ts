import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../src/shared/constants';
import { AdaptiveBackpressure } from '../../src/content/adaptive-backpressure';
import { DegradationController } from '../../src/content/degradation-controller';

describe('BH-007 adaptive backpressure', () => {
  it('uses deterministic hidden > pressure > normal tie-breaking', () => {
    const controller = new AdaptiveBackpressure(() => 0);
    expect(controller.budget().level).toBe('normal');
    controller.recordQueueDepth(LIMITS.pressureQueueThreshold);
    expect(controller.budget()).toMatchObject({ level: 'pressure', sliceMs: 4, nodesPerSlice: 20 });
    controller.setHidden(true);
    expect(controller.budget()).toMatchObject({ level: 'hidden', sliceMs: 0, nodesPerSlice: 0 });
  });
});

describe('BH-008 graceful degradation', () => {
  it('caps repeat bounded-resource failures below the terminal pause level', () => {
    let now = 0;
    const controller = new DegradationController(() => now);
    expect(controller.recordFailure('queue')?.to).toBe(1);
    expect(controller.recordFailure('queue')?.to).toBe(2);
    expect(controller.recordFailure('queue')?.to).toBe(3);
    expect(controller.recordFailure('queue')).toBeNull();
    expect(controller.isPaused()).toBe(false);
    now += LIMITS.degradationQuietPeriodMs + 1;
    expect(controller.maybeRecover()).toMatchObject({ from: 3, to: 2, recovery: true });
  });

  it('reserves level four for repeated terminal failures', () => {
    const controller = new DegradationController(() => 0);
    expect(controller.recordFailure('runtime-exception', { terminal: true })?.to).toBe(1);
    expect(controller.recordFailure('runtime-exception', { terminal: true })?.to).toBe(2);
    expect(controller.recordFailure('runtime-exception', { terminal: true })?.to).toBe(4);
    expect(controller.isPaused()).toBe(true);
    expect(controller.maybeRecover()).toBeNull();
  });

  it('recovers non-fatal levels one step per quiet period', () => {
    let now = 0;
    const controller = new DegradationController(() => now);
    controller.raiseTo(2);
    now += LIMITS.degradationQuietPeriodMs + 1;
    expect(controller.maybeRecover()).toMatchObject({ from: 2, to: 1, recovery: true });
  });

  it('re-enables bidi immediately after stable quiescence without waiting three quiet periods', () => {
    let now = 0;
    const controller = new DegradationController(() => now);
    controller.recordFailure('queue');
    controller.recordFailure('queue');
    controller.recordFailure('queue');
    expect(controller.level()).toBe(3);
    now += LIMITS.degradationStableRecoveryMs;
    expect(controller.recoverAfterQuiescence()).toMatchObject({
      from: 3,
      to: 1,
      recovery: true,
      failureKey: 'quiescent',
    });
    expect(controller.allowsBidiWrapping()).toBe(true);
    now += LIMITS.degradationStableRecoveryMs;
    expect(controller.recoverAfterQuiescence()).toMatchObject({ from: 1, to: 0 });
    expect(controller.snapshot()).toMatchObject({
      level: 0,
      transitions: 5,
      recoveryTransitions: 2,
    });
  });
});
