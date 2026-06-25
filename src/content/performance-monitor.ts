import { LIMITS } from '../shared/constants';
import type { PerformancePhaseSummary, RuntimePerformanceSnapshot } from '../shared/types';

export interface PerformanceSample {
  phase: string;
  durationMs: number;
  count: number;
}

interface OnlineAggregate {
  samples: number;
  minDurationMs: number;
  maxDurationMs: number;
  totalDurationMs: number;
  totalCount: number;
  ring: PerformanceSample[];
  ringCursor: number;
}

export class PerformanceMonitor {
  private readonly phases = new Map<string, OnlineAggregate>();

  public measure<T>(phase: string, count: number, operation: () => T): T {
    const start = performance.now();
    try {
      return operation();
    } finally {
      this.record(phase, Math.max(0, performance.now() - start), count);
    }
  }

  public record(phase: string, durationMs: number, count: number): void {
    if (!isValidPhase(phase)) throw new TypeError('Performance phase must be non-empty');
    if (!Number.isFinite(durationMs) || durationMs < 0)
      throw new TypeError('Performance duration must be finite and non-negative');
    if (!Number.isSafeInteger(count) || count < 0)
      throw new TypeError('Performance count must be a safe non-negative integer');

    const aggregate = this.phases.get(phase) ?? createAggregate();
    const nextDurationTotal = aggregate.totalDurationMs + durationMs;
    const nextCountTotal = aggregate.totalCount + count;
    if (!Number.isFinite(nextDurationTotal) || !Number.isSafeInteger(nextCountTotal))
      throw new RangeError('Performance aggregate exceeded its numeric bounds');
    if (!Number.isSafeInteger(aggregate.samples + 1))
      throw new RangeError('Performance sample count exceeded its numeric bounds');
    aggregate.samples += 1;
    aggregate.minDurationMs = Math.min(aggregate.minDurationMs, durationMs);
    aggregate.maxDurationMs = Math.max(aggregate.maxDurationMs, durationMs);
    aggregate.totalDurationMs = nextDurationTotal;
    aggregate.totalCount = nextCountTotal;

    const sample = Object.freeze({ phase, durationMs, count });
    if (aggregate.ring.length < LIMITS.performanceRawSamplesPerPhaseMax) {
      aggregate.ring.push(sample);
    } else {
      aggregate.ring[aggregate.ringCursor] = sample;
      aggregate.ringCursor = (aggregate.ringCursor + 1) % LIMITS.performanceRawSamplesPerPhaseMax;
    }
    this.phases.set(phase, aggregate);
  }

  public snapshot(): readonly PerformanceSample[] {
    const samples: PerformanceSample[] = [];
    for (const [phase, aggregate] of sortedEntries(this.phases)) {
      for (const sample of orderedRing(aggregate))
        samples.push(Object.freeze({ phase, durationMs: sample.durationMs, count: sample.count }));
    }
    return Object.freeze(samples);
  }

  public summary(now: () => Date = () => new Date()): RuntimePerformanceSnapshot {
    const phases: PerformancePhaseSummary[] = [];
    for (const [phase, aggregate] of sortedEntries(this.phases)) {
      const ringDurations = orderedRing(aggregate)
        .map((sample) => sample.durationMs)
        .sort((a, b) => a - b);
      const p95Index = Math.max(0, Math.ceil(ringDurations.length * 0.95) - 1);
      phases.push(
        Object.freeze({
          phase,
          samples: aggregate.samples,
          minDurationMs: round(
            aggregate.minDurationMs === Number.POSITIVE_INFINITY ? 0 : aggregate.minDurationMs
          ),
          maxDurationMs: round(aggregate.maxDurationMs),
          totalDurationMs: round(aggregate.totalDurationMs),
          averageDurationMs: round(
            aggregate.samples === 0 ? 0 : aggregate.totalDurationMs / aggregate.samples
          ),
          p95DurationMs: round(ringDurations[p95Index] ?? 0),
          p95SampleWindow: ringDurations.length,
          totalCount: aggregate.totalCount,
        })
      );
    }
    return Object.freeze({
      schemaVersion: '1.1.0',
      generatedAt: now().toISOString(),
      phases: Object.freeze(phases),
    });
  }

  public reset(): void {
    this.phases.clear();
  }

  public clear(): void {
    this.reset();
  }

  public rawSampleCount(): number {
    let count = 0;
    for (const aggregate of this.phases.values()) count += aggregate.ring.length;
    return count;
  }
}

function createAggregate(): OnlineAggregate {
  return {
    samples: 0,
    minDurationMs: Number.POSITIVE_INFINITY,
    maxDurationMs: 0,
    totalDurationMs: 0,
    totalCount: 0,
    ring: [],
    ringCursor: 0,
  };
}

function orderedRing(aggregate: OnlineAggregate): readonly PerformanceSample[] {
  if (aggregate.ring.length < LIMITS.performanceRawSamplesPerPhaseMax || aggregate.ringCursor === 0)
    return aggregate.ring;
  return [
    ...aggregate.ring.slice(aggregate.ringCursor),
    ...aggregate.ring.slice(0, aggregate.ringCursor),
  ];
}

function sortedEntries<T>(map: ReadonlyMap<string, T>): readonly (readonly [string, T])[] {
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'));
}

function isValidPhase(value: string): boolean {
  return value.trim().length > 0 && value.length <= 128;
}

function round(value: number): number {
  return Number(value.toFixed(3));
}
