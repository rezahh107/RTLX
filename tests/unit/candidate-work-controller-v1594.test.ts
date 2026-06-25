import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import { CandidateWorkController } from '../../src/content/candidate-work-controller';

describe('RTLX 15.9.11 candidate admission and saturation episodes', () => {
  beforeEach(() => {
    installDom('<html><body><p id="candidate">سلام</p></body></html>');
  });

  it('skips unchanged processed candidates and admits them after a mutation revision', () => {
    const candidate = document.querySelector('#candidate')!;
    const controller = new CandidateWorkController();
    expect(controller.shouldAdmit(candidate)).toBe(true);
    controller.markProcessed(candidate);
    expect(controller.shouldAdmit(candidate)).toBe(false);
    controller.markDirty(candidate);
    expect(controller.shouldAdmit(candidate)).toBe(true);
    controller.markProcessed(candidate);
    expect(controller.shouldAdmit(candidate)).toBe(false);
    // Required follow-up work, including a newly discovered unprocessed text block, bypasses revision dedupe.
    expect(controller.shouldAdmit(candidate, true)).toBe(true);
  });

  it('counts repeated full-queue observations as one saturation episode', () => {
    const controller = new CandidateWorkController(200, 1000, () => 0);
    const first = controller.observeSaturation(500, 'discovery-capacity');
    const second = controller.observeSaturation(500, 'candidate-admission');
    const third = controller.observeSaturation(499, 'visibility-promotion');
    expect(first).toMatchObject({ episodeId: 1, episodeStarted: true, occurrences: 1 });
    expect(second).toMatchObject({ episodeId: 1, episodeStarted: false, occurrences: 2 });
    expect(third).toMatchObject({ episodeId: 1, episodeStarted: false, occurrences: 3 });
    expect(controller.activeSaturationEpisodeId()).toBe(1);
  });

  it('opens a new episode only after the queue remains below the low watermark', () => {
    let now = 0;
    const controller = new CandidateWorkController(200, 1000, () => now);
    controller.observeSaturation(500, 'candidate-admission');
    expect(controller.observeQueueDepth(200)).toBe(false);
    now = 999;
    expect(controller.observeQueueDepth(150)).toBe(false);
    now = 1000;
    expect(controller.observeQueueDepth(150)).toBe(true);
    expect(controller.activeSaturationEpisodeId()).toBeNull();
    expect(controller.observeSaturation(500, 'candidate-admission')).toMatchObject({
      episodeId: 2,
      episodeStarted: true,
    });
  });
});
