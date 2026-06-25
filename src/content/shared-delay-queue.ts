import { LIMITS } from '../shared/constants';

interface DelayedCandidate {
  element: Element;
  generation: number;
  dueAt: number;
}

interface DelayBucket {
  id: number;
  dueAt: number;
  timer: number;
  candidates: Map<Element, DelayedCandidate>;
}

export interface DelayQueueSnapshot {
  buckets: number;
  candidates: number;
  rejected: number;
}

export class SharedDelayQueue {
  private readonly buckets = new Map<number, DelayBucket>();
  private readonly candidateBuckets = new Map<Element, number>();
  private nextBucketId = 1;
  private rejected = 0;

  public constructor(
    private readonly onReady: (element: Element) => void,
    private readonly isCurrentGeneration: (generation: number) => boolean,
    private readonly now: () => number = () => performance.now()
  ) {}

  public enqueue(element: Element, delayMs: number, generation: number): boolean {
    if (!element.isConnected) return false;
    if (!Number.isFinite(delayMs) || delayMs < 0) throw new TypeError('Invalid delay');
    if (!Number.isSafeInteger(generation) || generation < 0)
      throw new TypeError('Invalid lifecycle generation');
    if (this.candidateBuckets.has(element)) return true;
    if (this.candidateBuckets.size >= LIMITS.sharedDelayedCandidatesMax) {
      this.rejected += 1;
      return false;
    }

    const dueAt = this.now() + normalizeDelay(delayMs);
    if (!Number.isFinite(dueAt)) throw new RangeError('Delay due time exceeded numeric bounds');
    const bucket = this.selectBucket(dueAt);
    bucket.candidates.set(element, { element, generation, dueAt });
    this.candidateBuckets.set(element, bucket.id);
    if (dueAt < bucket.dueAt) this.reschedule(bucket, dueAt);
    return true;
  }

  public cancel(): void {
    for (const bucket of this.buckets.values()) window.clearTimeout(bucket.timer);
    this.buckets.clear();
    this.candidateBuckets.clear();
  }

  public snapshot(): DelayQueueSnapshot {
    return Object.freeze({
      buckets: this.buckets.size,
      candidates: this.candidateBuckets.size,
      rejected: this.rejected,
    });
  }

  private selectBucket(dueAt: number): DelayBucket {
    const exact = [...this.buckets.values()].find(
      (bucket) => Math.abs(bucket.dueAt - dueAt) < LIMITS.sharedDelayBucketWidthMs
    );
    if (exact) return exact;
    if (this.buckets.size < LIMITS.sharedDelayBucketsMax) return this.createBucket(dueAt);
    const selected = [...this.buckets.values()].sort(
      (a, b) => Math.abs(a.dueAt - dueAt) - Math.abs(b.dueAt - dueAt) || a.id - b.id
    )[0];
    return selected ?? this.createBucket(dueAt);
  }

  private createBucket(dueAt: number): DelayBucket {
    const id = this.nextBucketId++;
    const bucket: DelayBucket = { id, dueAt, timer: 0, candidates: new Map() };
    bucket.timer = window.setTimeout(() => this.flush(id), Math.max(0, dueAt - this.now()));
    this.buckets.set(id, bucket);
    return bucket;
  }

  private reschedule(bucket: DelayBucket, dueAt: number): void {
    window.clearTimeout(bucket.timer);
    bucket.dueAt = dueAt;
    bucket.timer = window.setTimeout(() => this.flush(bucket.id), Math.max(0, dueAt - this.now()));
  }

  private flush(id: number): void {
    const bucket = this.buckets.get(id);
    if (!bucket) return;
    const now = this.now();
    const ready: DelayedCandidate[] = [];
    let nextDueAt = Number.POSITIVE_INFINITY;
    for (const candidate of bucket.candidates.values()) {
      if (!candidate.element.isConnected || !this.isCurrentGeneration(candidate.generation)) {
        bucket.candidates.delete(candidate.element);
        this.candidateBuckets.delete(candidate.element);
      } else if (candidate.dueAt <= now) {
        ready.push(candidate);
        bucket.candidates.delete(candidate.element);
        this.candidateBuckets.delete(candidate.element);
      } else {
        nextDueAt = Math.min(nextDueAt, candidate.dueAt);
      }
    }
    if (bucket.candidates.size === 0) this.buckets.delete(id);
    else this.reschedule(bucket, nextDueAt);
    for (const candidate of ready) this.onReady(candidate.element);
  }
}

function normalizeDelay(delayMs: number): number {
  if (delayMs === 0) return 0;
  return Math.ceil(delayMs / LIMITS.sharedDelayBucketWidthMs) * LIMITS.sharedDelayBucketWidthMs;
}
