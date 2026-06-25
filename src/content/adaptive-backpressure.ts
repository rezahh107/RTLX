import { LIMITS } from '../shared/constants';

export type BackpressureLevel = 'normal' | 'pressure' | 'hidden';
export interface WorkBudget {
  level: BackpressureLevel;
  sliceMs: number;
  nodesPerSlice: number;
}
export interface BackpressureSnapshot extends WorkBudget {
  queueDepth: number;
  mutationBurst: number;
  longTaskSignal: boolean;
}

export class AdaptiveBackpressure {
  private hidden = false;
  private queueDepth = 0;
  private mutationBurst = 0;
  private longTaskUntil = 0;
  private observer: PerformanceObserver | null = null;

  public constructor(private readonly now: () => number = () => performance.now()) {}

  public startLongTaskObserver(): void {
    if (this.observer || typeof PerformanceObserver !== 'function') return;
    try {
      const supported = PerformanceObserver.supportedEntryTypes ?? [];
      if (!supported.includes('longtask')) return;
      this.observer = new PerformanceObserver((list) => {
        if (list.getEntries().some((entry) => entry.duration >= 50)) this.recordLongTask();
      });
      this.observer.observe({ entryTypes: ['longtask'] });
    } catch {
      this.observer = null;
    }
  }

  public stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.hidden = false;
    this.queueDepth = 0;
    this.mutationBurst = 0;
    this.longTaskUntil = 0;
  }

  public setHidden(hidden: boolean): void {
    this.hidden = hidden;
  }

  public recordQueueDepth(depth: number): void {
    this.queueDepth = finiteNonNegativeInteger(depth);
  }

  public recordMutationBurst(records: number): void {
    this.mutationBurst = finiteNonNegativeInteger(records);
  }

  public recordLongTask(): void {
    this.longTaskUntil = this.now() + 5000;
  }

  public budget(): WorkBudget {
    const level = this.level();
    if (level === 'hidden') return Object.freeze({ level, sliceMs: 0, nodesPerSlice: 0 });
    if (level === 'pressure')
      return Object.freeze({
        level,
        sliceMs: LIMITS.pressureSliceMs,
        nodesPerSlice: LIMITS.pressureNodesPerSlice,
      });
    return Object.freeze({
      level,
      sliceMs: LIMITS.normalSliceMs,
      nodesPerSlice: LIMITS.normalNodesPerSlice,
    });
  }

  public snapshot(): BackpressureSnapshot {
    const budget = this.budget();
    return Object.freeze({
      ...budget,
      queueDepth: this.queueDepth,
      mutationBurst: this.mutationBurst,
      longTaskSignal: this.longTaskUntil > this.now(),
    });
  }

  private level(): BackpressureLevel {
    if (this.hidden) return 'hidden';
    if (
      this.queueDepth >= LIMITS.pressureQueueThreshold ||
      this.mutationBurst >= LIMITS.pressureMutationBurstThreshold ||
      this.longTaskUntil > this.now()
    )
      return 'pressure';
    return 'normal';
  }
}

function finiteNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}
