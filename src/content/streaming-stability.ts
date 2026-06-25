import { LIMITS } from '../shared/constants';
import type { StreamingSnapshot } from '../shared/types';

export type StreamingRoot = Document | ShadowRoot | Element;
export type StreamingFlushHandler = (roots: readonly StreamingRoot[]) => void;
export type StreamingFlushReason = 'quiet-window' | 'max-wait' | 'capacity' | 'manual';
export type StreamingEnqueueStatus =
  | 'accepted'
  | 'duplicate'
  | 'coalesced'
  | 'forced-flush'
  | 'rejected';

export interface StreamingEnqueueResult {
  accepted: boolean;
  status: StreamingEnqueueStatus;
  overflowEpisodeId: number | null;
  overflowEpisodeStarted: boolean;
}

export class StreamingStabilityController {
  private readonly roots = new Set<StreamingRoot>();
  private quietTimer: number | null = null;
  private maxTimer: number | null = null;
  private batchesFlushed = 0;
  private rootsFlushed = 0;
  private maxBurstSize = 0;
  private acceptedRoots = 0;
  private duplicateRoots = 0;
  private coalescedRoots = 0;
  private rejectedRoots = 0;
  private forcedFlushes = 0;
  private overflowEpisodes = 0;
  private flushFailures = 0;
  private activeOverflowEpisodeId: number | null = null;
  private nextOverflowEpisodeId = 1;
  private lastFlushReason: StreamingFlushReason | null = null;
  private lastActivityAt: number;

  public constructor(
    private readonly onFlush: StreamingFlushHandler,
    private readonly quietWindowMs: number = LIMITS.streamingQuietWindowMs,
    private readonly maxWaitMs: number = LIMITS.streamingMaxWaitMs,
    private readonly maxQueuedRoots: number = LIMITS.streamingMaxQueuedRoots,
    private readonly now: () => number = () => performance.now()
  ) {
    this.lastActivityAt = this.now();
  }

  public enqueue(root: StreamingRoot): StreamingEnqueueResult {
    this.lastActivityAt = this.now();

    if (this.roots.has(root)) {
      this.duplicateRoots += 1;
      this.refreshQuietTimer();
      return result(true, 'duplicate', this.activeOverflowEpisodeId, false);
    }

    for (const existing of this.roots) {
      if (!rootCovers(existing, root)) continue;
      this.coalescedRoots += 1;
      this.refreshQuietTimer();
      return result(true, 'coalesced', this.activeOverflowEpisodeId, false);
    }

    let descendantsRemoved = 0;
    for (const existing of [...this.roots]) {
      if (!rootCovers(root, existing)) continue;
      this.roots.delete(existing);
      descendantsRemoved += 1;
    }
    this.coalescedRoots += descendantsRemoved;

    let status: StreamingEnqueueStatus = 'accepted';
    let overflowEpisodeStarted = false;
    if (this.roots.size >= this.maxQueuedRoots) {
      overflowEpisodeStarted = this.startOverflowEpisode();
      this.forcedFlushes += 1;
      if (!this.flush('capacity')) {
        this.rejectedRoots += 1;
        return result(false, 'rejected', this.activeOverflowEpisodeId, overflowEpisodeStarted);
      }
      status = 'forced-flush';
    }

    this.roots.add(root);
    this.acceptedRoots += 1;
    this.maxBurstSize = Math.max(this.maxBurstSize, this.roots.size);
    this.scheduleTimers();
    return result(true, status, this.activeOverflowEpisodeId, overflowEpisodeStarted);
  }

  public flush(reason: StreamingFlushReason = 'manual'): boolean {
    if (this.roots.size === 0) {
      this.clearTimers();
      if (reason !== 'capacity') this.activeOverflowEpisodeId = null;
      return true;
    }

    const roots = Object.freeze([...this.roots]);
    this.roots.clear();
    this.clearTimers();
    try {
      this.onFlush(roots);
    } catch {
      this.flushFailures += 1;
      for (const root of roots) this.roots.add(root);
      this.scheduleTimers();
      return false;
    }

    this.batchesFlushed += 1;
    this.rootsFlushed += roots.length;
    this.lastFlushReason = reason;
    if (reason !== 'capacity') this.activeOverflowEpisodeId = null;
    return true;
  }

  public cancel(): void {
    this.roots.clear();
    this.clearTimers();
    this.activeOverflowEpisodeId = null;
  }

  public hasPendingRoots(): boolean {
    return this.roots.size > 0;
  }

  public snapshot(): StreamingSnapshot {
    return Object.freeze({
      queuedRoots: this.roots.size,
      batchesFlushed: this.batchesFlushed,
      rootsFlushed: this.rootsFlushed,
      maxBurstSize: this.maxBurstSize,
      pending: this.roots.size > 0,
      acceptedRoots: this.acceptedRoots,
      duplicateRoots: this.duplicateRoots,
      coalescedRoots: this.coalescedRoots,
      rejectedRoots: this.rejectedRoots,
      forcedFlushes: this.forcedFlushes,
      overflowEpisodes: this.overflowEpisodes,
      flushFailures: this.flushFailures,
      activeOverflowEpisodeId: this.activeOverflowEpisodeId,
      lastFlushReason: this.lastFlushReason,
      quietForMs: Math.max(0, Math.floor(this.now() - this.lastActivityAt)),
    });
  }

  private startOverflowEpisode(): boolean {
    if (this.activeOverflowEpisodeId !== null) return false;
    this.activeOverflowEpisodeId = this.nextOverflowEpisodeId;
    this.nextOverflowEpisodeId += 1;
    this.overflowEpisodes += 1;
    return true;
  }

  private refreshQuietTimer(): void {
    if (this.roots.size === 0) return;
    if (this.quietTimer !== null) window.clearTimeout(this.quietTimer);
    this.quietTimer = window.setTimeout(() => this.flush('quiet-window'), this.quietWindowMs);
  }

  private scheduleTimers(): void {
    this.refreshQuietTimer();
    if (this.maxTimer === null)
      this.maxTimer = window.setTimeout(() => this.flush('max-wait'), this.maxWaitMs);
  }

  private clearTimers(): void {
    if (this.quietTimer !== null) window.clearTimeout(this.quietTimer);
    if (this.maxTimer !== null) window.clearTimeout(this.maxTimer);
    this.quietTimer = null;
    this.maxTimer = null;
  }
}

function result(
  accepted: boolean,
  status: StreamingEnqueueStatus,
  overflowEpisodeId: number | null,
  overflowEpisodeStarted: boolean
): StreamingEnqueueResult {
  return Object.freeze({ accepted, status, overflowEpisodeId, overflowEpisodeStarted });
}

function rootCovers(container: StreamingRoot, candidate: StreamingRoot): boolean {
  if (container === candidate) return true;
  if (container instanceof Document) {
    return candidate instanceof Element && candidate.ownerDocument === container;
  }
  if (container instanceof ShadowRoot) {
    return candidate instanceof Element && candidate.getRootNode() === container;
  }
  if (!(candidate instanceof Element)) return false;
  return container.contains(candidate);
}
