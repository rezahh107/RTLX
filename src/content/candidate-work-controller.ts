import { LIMITS } from '../shared/constants';

export type CandidateQueueSaturationSource =
  | 'discovery-capacity'
  | 'candidate-admission'
  | 'visibility-promotion';

export interface CandidateQueueSaturationObservation {
  episodeId: number;
  episodeStarted: boolean;
  occurrences: number;
  highWatermark: number;
  source: CandidateQueueSaturationSource;
}

/**
 * Keeps candidate admission and queue-saturation state local to one FrameRuntime.
 * It deliberately does not alter global degradation behavior for other failure keys.
 */
export class CandidateWorkController {
  private revisions = new WeakMap<Element, number>();
  private processedRevisions = new WeakMap<Element, number>();
  private revisionSequence = 0;
  private activeEpisodeId: number | null = null;
  private nextEpisodeId = 1;
  private episodeOccurrences = 0;
  private episodeHighWatermark = 0;
  private belowLowWatermarkAt: number | null = null;

  public constructor(
    private readonly lowWatermark: number = LIMITS.pressureQueueThreshold,
    private readonly stableRecoveryMs: number = LIMITS.degradationStableRecoveryMs,
    private readonly now: () => number = () => performance.now()
  ) {}

  public markDirty(candidate: Element): void {
    this.revisionSequence += 1;
    this.revisions.set(candidate, this.revisionSequence);
  }

  public shouldAdmit(candidate: Element, continuation = false): boolean {
    if (continuation) return true;
    const revision = this.revisions.get(candidate) ?? 0;
    return this.processedRevisions.get(candidate) !== revision;
  }

  public markProcessed(candidate: Element): void {
    this.processedRevisions.set(candidate, this.revisions.get(candidate) ?? 0);
  }

  public resetAdmission(): void {
    this.revisions = new WeakMap<Element, number>();
    this.processedRevisions = new WeakMap<Element, number>();
    this.revisionSequence = 0;
  }

  public observeSaturation(
    queueDepth: number,
    source: CandidateQueueSaturationSource
  ): CandidateQueueSaturationObservation {
    const boundedDepth = Math.max(0, Math.trunc(queueDepth));
    const episodeStarted = this.activeEpisodeId === null;
    if (episodeStarted) {
      this.activeEpisodeId = this.nextEpisodeId;
      this.nextEpisodeId += 1;
      this.episodeOccurrences = 0;
      this.episodeHighWatermark = 0;
    }
    this.episodeOccurrences += 1;
    this.episodeHighWatermark = Math.max(this.episodeHighWatermark, boundedDepth);
    this.belowLowWatermarkAt = null;
    return Object.freeze({
      episodeId: this.activeEpisodeId!,
      episodeStarted,
      occurrences: this.episodeOccurrences,
      highWatermark: this.episodeHighWatermark,
      source,
    });
  }

  public observeQueueDepth(queueDepth: number): boolean {
    if (this.activeEpisodeId === null) return false;
    const boundedDepth = Math.max(0, Math.trunc(queueDepth));
    if (boundedDepth > this.lowWatermark) {
      this.belowLowWatermarkAt = null;
      return false;
    }
    const now = this.now();
    this.belowLowWatermarkAt ??= now;
    if (now - this.belowLowWatermarkAt < this.stableRecoveryMs) return false;
    this.clearSaturationEpisode();
    return true;
  }

  public resetSaturation(): void {
    this.clearSaturationEpisode();
  }

  public activeSaturationEpisodeId(): number | null {
    return this.activeEpisodeId;
  }

  private clearSaturationEpisode(): void {
    this.activeEpisodeId = null;
    this.episodeOccurrences = 0;
    this.episodeHighWatermark = 0;
    this.belowLowWatermarkAt = null;
  }
}
