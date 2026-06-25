import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDiagnostic } from '../../src/shared/diagnostics';
import { DiagnosticBatcher } from '../../src/content/diagnostic-batcher';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { setTimeout, clearTimeout });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BH-009 diagnostic batching', () => {
  it('deduplicates stable diagnostics and flushes on the bounded timer', async () => {
    const batches: readonly unknown[][] = [];
    const mutable = batches as unknown as unknown[][];
    const batcher = new DiagnosticBatcher(
      (values) => {
        mutable.push([...values]);
      },
      () => 0
    );
    const value = createDiagnostic(
      'RTLX-LIMIT-001',
      'warning',
      'QUEUE-LIMIT-001',
      'frame',
      { count: 1 },
      { now: () => new Date(0) }
    );
    batcher.enqueue([value, value, value]);
    expect(batcher.snapshot().pending).toBe(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(batches).toHaveLength(1);
    expect((batches[0]?.[0] as { details: { occurrences: number } }).details.occurrences).toBe(3);
  });

  it('flushes fatal diagnostics immediately', async () => {
    const transport = vi.fn();
    const batcher = new DiagnosticBatcher(transport, () => 0);
    batcher.enqueue([
      createDiagnostic('RTLX-STATE-001', 'fatal', 'LIFECYCLE-001', 'frame', { count: 1 }),
    ]);
    await Promise.resolve();
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('retains a failed batch for deterministic retry', async () => {
    const transport = vi
      .fn()
      .mockRejectedValueOnce(new Error('worker unavailable'))
      .mockResolvedValue(undefined);
    const batcher = new DiagnosticBatcher(transport, () => Date.now());
    batcher.enqueue([
      createDiagnostic('RTLX-DIR-001', 'warning', 'DIRECTION-001', 'frame', { count: 1 }),
    ]);
    await batcher.flush(true);
    expect(batcher.snapshot().pending).toBe(1);
    await batcher.flush(true);
    expect(batcher.snapshot().pending).toBe(0);
    expect(transport).toHaveBeenCalledTimes(2);
  });
});
