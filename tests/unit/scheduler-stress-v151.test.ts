import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleTask } from '../../src/content/scheduler';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BH-002 scheduler 10000-cycle stress', () => {
  it('has zero abort-listener growth after 10000 timeout completions', async () => {
    const callbacks: Array<() => void> = [];
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, 'addEventListener');
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    vi.stubGlobal('window', {});
    vi.stubGlobal('MessageChannel', undefined);
    vi.stubGlobal('setTimeout', (callback: () => void) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    vi.stubGlobal('clearTimeout', vi.fn());
    const tasks = Array.from({ length: 10_000 }, (_, index) =>
      scheduleTask(() => index, { signal: controller.signal })
    );
    for (const callback of callbacks) callback();
    await Promise.all(tasks);
    expect(add).toHaveBeenCalledTimes(10_000);
    expect(remove).toHaveBeenCalledTimes(10_000);
  });

  it('cleans requestIdleCallback resources on success and abort', async () => {
    let callback: (() => void) | null = null;
    const cancel = vi.fn();
    vi.stubGlobal('window', {
      requestIdleCallback: (value: () => void) => {
        callback = value;
        return 7;
      },
      cancelIdleCallback: cancel,
    });
    const first = new AbortController();
    const success = scheduleTask(() => 1, { signal: first.signal });
    (callback as (() => void) | null)?.();
    await expect(success).resolves.toBe(1);
    const second = new AbortController();
    const aborted = scheduleTask(() => 2, { signal: second.signal });
    second.abort();
    await expect(aborted).rejects.toMatchObject({ name: 'AbortError' });
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it('closes MessageChannel ports after successful completion', async () => {
    const close = vi.fn();
    class FakeChannel {
      public readonly port1 = { onmessage: null as null | (() => void), close };
      public readonly port2 = {
        postMessage: () => queueMicrotask(() => this.port1.onmessage?.()),
        close,
      };
    }
    vi.stubGlobal('window', {});
    vi.stubGlobal('MessageChannel', FakeChannel);
    await expect(scheduleTask(() => 3, { signal: new AbortController().signal })).resolves.toBe(3);
    expect(close).toHaveBeenCalledTimes(2);
  });
});
