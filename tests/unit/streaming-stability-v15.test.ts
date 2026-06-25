import { afterEach, describe, expect, it, vi } from 'vitest';
import { StreamingStabilityController } from '../../src/content/streaming-stability';
import { installDom } from '../dom-test-setup';

afterEach(() => vi.useRealTimers());

describe('Streaming Stability Engine v15', () => {
  it('coalesces repeated roots until the quiet window', () => {
    vi.useFakeTimers();
    const document = installDom('<html><body><main></main><article></article></body></html>');
    const batches: number[] = [];
    const controller = new StreamingStabilityController(
      (roots) => batches.push(roots.length),
      80,
      400
    );
    const main = document.querySelector('main')!;
    const article = document.querySelector('article')!;
    expect(controller.enqueue(main).accepted).toBe(true);
    expect(controller.enqueue(main).accepted).toBe(true);
    expect(controller.enqueue(article).accepted).toBe(true);
    vi.advanceTimersByTime(79);
    expect(batches).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(batches).toEqual([2]);
    expect(controller.snapshot()).toMatchObject({
      batchesFlushed: 1,
      rootsFlushed: 2,
      pending: false,
    });
  });

  it('flushes at the maximum wait boundary during a continuous burst', () => {
    vi.useFakeTimers();
    const document = installDom('<html><body><main></main></body></html>');
    let flushes = 0;
    const controller = new StreamingStabilityController(() => flushes++, 80, 400);
    const main = document.querySelector('main')!;
    for (let elapsed = 0; elapsed < 400; elapsed += 50) {
      controller.enqueue(main);
      vi.advanceTimersByTime(50);
    }
    expect(flushes).toBe(1);
  });

  it('cancels pending work without flushing', () => {
    vi.useFakeTimers();
    const document = installDom('<html><body><main></main></body></html>');
    let flushes = 0;
    const controller = new StreamingStabilityController(() => flushes++);
    controller.enqueue(document.querySelector('main')!);
    controller.cancel();
    vi.runAllTimers();
    expect(flushes).toBe(0);
    expect(controller.snapshot().pending).toBe(false);
  });

  it('reports whether a streaming batch is pending', () => {
    vi.useFakeTimers();
    const document = installDom('<html><body><main></main></body></html>');
    const controller = new StreamingStabilityController(() => undefined);
    expect(controller.hasPendingRoots()).toBe(false);
    controller.enqueue(document.querySelector('main')!);
    expect(controller.hasPendingRoots()).toBe(true);
    controller.flush();
    expect(controller.hasPendingRoots()).toBe(false);
  });
});
