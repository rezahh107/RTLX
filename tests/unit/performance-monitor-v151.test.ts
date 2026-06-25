import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../src/shared/constants';
import { PerformanceMonitor } from '../../src/content/performance-monitor';

describe('BH-001 bounded performance monitor', () => {
  it('keeps deterministic online aggregates while bounding raw samples', () => {
    const monitor = new PerformanceMonitor();
    for (let index = 0; index < 100_000; index += 1)
      monitor.record('classification', index % 10, 1);
    const summary = monitor.summary(() => new Date(0));
    expect(monitor.rawSampleCount()).toBe(LIMITS.performanceRawSamplesPerPhaseMax);
    expect(monitor.snapshot()).toHaveLength(LIMITS.performanceRawSamplesPerPhaseMax);
    expect(summary.phases[0]).toMatchObject({
      phase: 'classification',
      samples: 100_000,
      minDurationMs: 0,
      maxDurationMs: 9,
      averageDurationMs: 4.5,
      totalCount: 100_000,
      p95SampleWindow: LIMITS.performanceRawSamplesPerPhaseMax,
    });
    expect(monitor.summary(() => new Date(0))).toEqual(summary);
  });

  it('rejects non-finite samples and resets idempotently', () => {
    const monitor = new PerformanceMonitor();
    expect(() => monitor.record('x', Number.NaN, 1)).toThrow();
    expect(() => monitor.record('x', Number.POSITIVE_INFINITY, 1)).toThrow();
    monitor.record('x', 1, 1);
    monitor.reset();
    monitor.reset();
    expect(monitor.snapshot()).toEqual([]);
  });
});
