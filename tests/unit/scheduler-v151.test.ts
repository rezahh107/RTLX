import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleTask } from '../../src/content/scheduler';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BH-002 scheduler cleanup', () => {
  it('removes abort listeners after repeated timeout completion', async () => {
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, 'addEventListener');
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    vi.stubGlobal('MessageChannel', undefined);
    for (let index = 0; index < 100; index += 1)
      await scheduleTask(() => index, { signal: controller.signal });
    expect(add).toHaveBeenCalledTimes(100);
    expect(remove).toHaveBeenCalledTimes(100);
  });

  it('closes MessageChannel ports on abort', async () => {
    const close = vi.fn();
    class FakeChannel {
      public readonly port1 = { onmessage: null as null | (() => void), close };
      public readonly port2 = { postMessage: vi.fn(), close };
    }
    vi.stubGlobal('window', {});
    vi.stubGlobal('MessageChannel', FakeChannel);
    const controller = new AbortController();
    const task = scheduleTask(() => 1, { signal: controller.signal });
    controller.abort();
    await expect(task).rejects.toMatchObject({ name: 'AbortError' });
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('rejects stale generations before callback execution', async () => {
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    vi.stubGlobal('MessageChannel', undefined);
    const callback = vi.fn();
    await expect(
      scheduleTask(callback, {
        signal: new AbortController().signal,
        generation: 1,
        isCurrentGeneration: () => false,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(callback).not.toHaveBeenCalled();
  });
});
