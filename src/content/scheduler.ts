export interface ScheduleOptions {
  signal: AbortSignal;
  priority?: 'user-visible' | 'background';
  generation?: number;
  isCurrentGeneration?: (generation: number) => boolean;
}
interface SchedulerLike {
  postTask?<T>(
    callback: () => T | Promise<T>,
    options: { signal: AbortSignal; priority?: string }
  ): Promise<T>;
  yield?(): Promise<void>;
}

declare global {
  interface Window {
    scheduler?: SchedulerLike;
  }
}

export async function cooperativeYield(options: ScheduleOptions): Promise<void> {
  assertRunnable(options);
  if (window.scheduler?.yield) {
    await window.scheduler.yield();
    assertRunnable(options);
    return;
  }
  await scheduleTask(() => undefined, { ...options, priority: options.priority ?? 'background' });
}

export async function scheduleTask<T>(
  callback: () => T | Promise<T>,
  options: ScheduleOptions
): Promise<T> {
  assertRunnable(options);
  const guarded = async (): Promise<T> => {
    assertRunnable(options);
    const result = await callback();
    assertRunnable(options);
    return result;
  };

  if (window.scheduler?.postTask)
    return window.scheduler.postTask(guarded, {
      signal: options.signal,
      ...(options.priority ? { priority: options.priority } : {}),
    });
  if ('requestIdleCallback' in window) return scheduleIdle(guarded, options);
  if (typeof MessageChannel !== 'undefined') return scheduleMessageChannel(guarded, options);
  return scheduleTimeout(guarded, options);
}

function scheduleIdle<T>(callback: () => T | Promise<T>, options: ScheduleOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let cleaned = false;
    const id = window.requestIdleCallback(() => void run(), { timeout: 100 });
    const onAbort = (): void => {
      window.cancelIdleCallback(id);
      finishReject(abortError());
    };
    options.signal.addEventListener('abort', onAbort, { once: true });

    async function run(): Promise<void> {
      try {
        assertRunnable(options);
        finishResolve(await callback());
      } catch (error) {
        finishReject(asError(error));
      } finally {
        cleanup();
      }
    }
    function finishResolve(value: T): void {
      if (settled) return;
      settled = true;
      resolve(value);
      cleanup();
    }
    function finishReject(error: Error): void {
      if (settled) return;
      settled = true;
      reject(error);
      cleanup();
    }
    function cleanup(): void {
      if (cleaned) return;
      cleaned = true;
      options.signal.removeEventListener('abort', onAbort);
    }
  });
}

function scheduleMessageChannel<T>(
  callback: () => T | Promise<T>,
  options: ScheduleOptions
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const channel = new MessageChannel();
    let settled = false;
    let cleaned = false;
    const onAbort = (): void => finishReject(abortError());
    options.signal.addEventListener('abort', onAbort, { once: true });
    channel.port1.onmessage = () => void run();
    channel.port2.postMessage(null);

    async function run(): Promise<void> {
      try {
        assertRunnable(options);
        finishResolve(await callback());
      } catch (error) {
        finishReject(asError(error));
      } finally {
        cleanup();
      }
    }
    function finishResolve(value: T): void {
      if (settled) return;
      settled = true;
      resolve(value);
      cleanup();
    }
    function finishReject(error: Error): void {
      if (settled) return;
      settled = true;
      reject(error);
      cleanup();
    }
    function cleanup(): void {
      if (cleaned) return;
      cleaned = true;
      options.signal.removeEventListener('abort', onAbort);
      channel.port1.onmessage = null;
      channel.port1.close();
      channel.port2.close();
    }
  });
}

function scheduleTimeout<T>(callback: () => T | Promise<T>, options: ScheduleOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let cleaned = false;
    const id = setTimeout(() => void run(), 0);
    const onAbort = (): void => {
      clearTimeout(id);
      finishReject(abortError());
    };
    options.signal.addEventListener('abort', onAbort, { once: true });

    async function run(): Promise<void> {
      try {
        assertRunnable(options);
        finishResolve(await callback());
      } catch (error) {
        finishReject(asError(error));
      } finally {
        cleanup();
      }
    }
    function finishResolve(value: T): void {
      if (settled) return;
      settled = true;
      resolve(value);
      cleanup();
    }
    function finishReject(error: Error): void {
      if (settled) return;
      settled = true;
      reject(error);
      cleanup();
    }
    function cleanup(): void {
      if (cleaned) return;
      cleaned = true;
      options.signal.removeEventListener('abort', onAbort);
    }
  });
}

function assertRunnable(options: ScheduleOptions): void {
  if (options.signal.aborted) throw abortError();
  if (
    options.generation !== undefined &&
    options.isCurrentGeneration &&
    !options.isCurrentGeneration(options.generation)
  )
    throw abortError();
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}
