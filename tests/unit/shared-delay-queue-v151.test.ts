import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDom } from '../dom-test-setup';
import { LIMITS } from '../../src/shared/constants';
import { SharedDelayQueue } from '../../src/content/shared-delay-queue';

beforeEach(() => {
  installDom('<html><body></body></html>');
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BH-005 shared delay queue', () => {
  it('bounds timers and candidates and discards detached elements', () => {
    const ready: Element[] = [];
    const queue = new SharedDelayQueue(
      (element) => ready.push(element),
      () => true,
      () => Date.now()
    );
    const elements = Array.from({ length: LIMITS.sharedDelayedCandidatesMax }, () => {
      const element = document.createElement('div');
      document.body.append(element);
      return element;
    });
    elements.forEach((element, index) => queue.enqueue(element, 100 + index * 37, 1));
    expect(queue.snapshot().buckets).toBeLessThanOrEqual(LIMITS.sharedDelayBucketsMax);
    expect(queue.snapshot().candidates).toBe(LIMITS.sharedDelayedCandidatesMax);
    const overflow = document.createElement('div');
    document.body.append(overflow);
    expect(queue.enqueue(overflow, 100, 1)).toBe(false);
    elements[0]?.remove();
    vi.runAllTimers();
    expect(ready).not.toContain(elements[0]);
    expect(queue.snapshot().candidates).toBe(0);
  });

  it('clears every bucket on freeze, rollback, or destroy', () => {
    const queue = new SharedDelayQueue(
      () => undefined,
      () => true,
      () => Date.now()
    );
    const element = document.createElement('div');
    document.body.append(element);
    queue.enqueue(element, 1000, 1);
    queue.cancel();
    vi.runAllTimers();
    expect(queue.snapshot()).toMatchObject({ buckets: 0, candidates: 0 });
  });
});
