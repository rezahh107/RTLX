import { LIMITS } from '../shared/constants';
import type { Diagnostic } from '../shared/types';

interface PendingDiagnostic {
  diagnostic: Diagnostic;
  occurrences: number;
}

export class DiagnosticBatcher {
  private readonly pending = new Map<string, PendingDiagnostic>();
  private readonly sentAt: number[] = [];
  private timer: number | null = null;
  private destroyed = false;
  private operation: Promise<void> = Promise.resolve();

  public constructor(
    private readonly transport: (diagnostics: readonly Diagnostic[]) => void | Promise<void>,
    private readonly now: () => number = () => Date.now()
  ) {}

  public enqueue(values: readonly Diagnostic[]): void {
    if (this.destroyed) return;
    let urgent = false;
    for (const diagnostic of values) {
      const key = stableDiagnosticKey(diagnostic);
      const current = this.pending.get(key);
      if (current) current.occurrences += occurrenceCount(diagnostic);
      else this.pending.set(key, { diagnostic, occurrences: occurrenceCount(diagnostic) });
      if (diagnostic.severity === 'fatal' || diagnostic.requirementId.includes('ROLLBACK'))
        urgent = true;
    }
    if (urgent || this.pending.size >= LIMITS.diagnosticBatchItemsMax) {
      void this.flush(urgent);
      return;
    }
    this.ensureTimer(LIMITS.diagnosticBatchFlushMs);
  }

  public flush(urgent = false): Promise<void> {
    const result = this.operation.then(() => this.flushOnce(urgent));
    this.operation = result.catch(() => undefined);
    return result;
  }

  public async destroy(): Promise<void> {
    if (this.destroyed) return;
    await this.flush(true).catch(() => undefined);
    this.destroyed = true;
    this.clearTimer();
    this.pending.clear();
  }

  public snapshot(): Readonly<{ pending: number; timerActive: boolean; batchesInWindow: number }> {
    this.pruneRateWindow();
    return Object.freeze({
      pending: this.pending.size,
      timerActive: this.timer !== null,
      batchesInWindow: this.sentAt.length,
    });
  }

  private async flushOnce(urgent: boolean): Promise<void> {
    if (this.pending.size === 0) {
      this.clearTimer();
      return;
    }
    this.pruneRateWindow();
    if (!urgent && this.sentAt.length >= LIMITS.diagnosticRateBatchesMax) {
      const first = this.sentAt[0] ?? this.now();
      this.ensureTimer(Math.max(1, first + LIMITS.diagnosticRateWindowMs - this.now()));
      return;
    }

    this.clearTimer();
    const selected: Array<readonly [string, PendingDiagnostic, Diagnostic]> = [];
    let bytes = 2;
    for (const key of [...this.pending.keys()].sort((a, b) => a.localeCompare(b, 'en'))) {
      if (selected.length >= LIMITS.diagnosticBatchItemsMax) break;
      const pending = this.pending.get(key);
      if (!pending) continue;
      const diagnostic = withOccurrences(pending.diagnostic, pending.occurrences);
      const encoded = new TextEncoder().encode(JSON.stringify(diagnostic)).byteLength + 1;
      if (encoded > LIMITS.diagnosticPayloadBytesMax) {
        this.pending.delete(key);
        continue;
      }
      if (selected.length > 0 && bytes + encoded > LIMITS.diagnosticPayloadBytesMax) break;
      selected.push([key, pending, diagnostic]);
      bytes += encoded;
      this.pending.delete(key);
    }
    if (selected.length === 0) return;
    try {
      await this.transport(Object.freeze(selected.map(([, , diagnostic]) => diagnostic)));
      this.sentAt.push(this.now());
    } catch {
      for (const [key, pending] of selected) {
        const current = this.pending.get(key);
        if (current) current.occurrences += pending.occurrences;
        else this.pending.set(key, pending);
      }
      this.ensureTimer(LIMITS.diagnosticBatchFlushMs);
      return;
    }
    if (this.pending.size > 0) this.ensureTimer(LIMITS.diagnosticBatchFlushMs);
  }

  private ensureTimer(delayMs: number): void {
    if (this.timer !== null || this.destroyed) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      void this.flush(false);
    }, delayMs);
  }

  private clearTimer(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  private pruneRateWindow(): void {
    const cutoff = this.now() - LIMITS.diagnosticRateWindowMs;
    while ((this.sentAt[0] ?? Number.POSITIVE_INFINITY) <= cutoff) this.sentAt.shift();
  }
}

function stableDiagnosticKey(diagnostic: Diagnostic): string {
  return JSON.stringify([
    diagnostic.code,
    diagnostic.severity,
    diagnostic.requirementId,
    diagnostic.scope,
    Object.entries(diagnostic.details)
      .filter(([key]) => key !== 'occurrences')
      .sort(([a], [b]) => a.localeCompare(b, 'en')),
  ]);
}

function occurrenceCount(diagnostic: Diagnostic): number {
  const value = diagnostic.details.occurrences;
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : 1;
}

function withOccurrences(diagnostic: Diagnostic, occurrences: number): Diagnostic {
  if (occurrences <= 1) return diagnostic;
  return Object.freeze({
    ...diagnostic,
    details: Object.freeze({ ...diagnostic.details, occurrences }),
  });
}
