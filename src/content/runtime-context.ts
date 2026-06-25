import { createDiagnostic } from '../shared/diagnostics';
import type { Diagnostic } from '../shared/types';
import { MutationJournal } from './mutation-journal';
import { rollbackJournal, type RollbackResult } from './rollback-manager';

export type RuntimeState =
  | 'UNINITIALIZED'
  | 'BOOTSTRAPPING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'ROLLING_BACK'
  | 'DISABLED'
  | 'DESTROYED';
const ALLOWED: Readonly<Record<RuntimeState, readonly RuntimeState[]>> = Object.freeze({
  UNINITIALIZED: ['BOOTSTRAPPING', 'DESTROYED'],
  BOOTSTRAPPING: ['ACTIVE', 'DISABLED', 'DESTROYED'],
  ACTIVE: ['SUSPENDED', 'ROLLING_BACK', 'DISABLED', 'DESTROYED'],
  SUSPENDED: ['ACTIVE', 'ROLLING_BACK', 'DISABLED', 'DESTROYED'],
  ROLLING_BACK: ['DISABLED', 'ACTIVE', 'DESTROYED'],
  DISABLED: ['BOOTSTRAPPING', 'DESTROYED'],
  DESTROYED: [],
});

export class RuntimeContext {
  private stateValue: RuntimeState = 'UNINITIALIZED';
  private abortControllerValue = new AbortController();
  public readonly journal = new MutationJournal();
  public readonly diagnostics: Diagnostic[] = [];
  public state(): RuntimeState {
    return this.stateValue;
  }
  public signal(): AbortSignal {
    return this.abortControllerValue.signal;
  }
  public start(): void {
    if (this.stateValue === 'ACTIVE' || this.stateValue === 'BOOTSTRAPPING') return;
    if (this.stateValue === 'SUSPENDED') {
      this.abortControllerValue = new AbortController();
      this.transition('ACTIVE');
      return;
    }
    if (this.stateValue === 'DESTROYED') {
      this.invalid('BOOTSTRAPPING');
      return;
    }
    this.abortControllerValue = new AbortController();
    this.transition('BOOTSTRAPPING');
    this.transition('ACTIVE');
  }
  public suspend(): void {
    if (this.stateValue === 'SUSPENDED') return;
    if (this.stateValue === 'ACTIVE') this.abortControllerValue.abort();
    this.transition('SUSPENDED');
  }
  public rollback(resume = false): RollbackResult {
    if (this.stateValue === 'DESTROYED' || this.stateValue === 'UNINITIALIZED')
      return Object.freeze({ restored: 0, skipped: 0, failed: 0 });
    this.abortControllerValue.abort();
    this.transition('ROLLING_BACK');
    const result = rollbackJournal(this.journal);
    if (resume && result.failed === 0 && result.skipped === 0)
      this.abortControllerValue = new AbortController();
    this.transition(resume && result.failed === 0 && result.skipped === 0 ? 'ACTIVE' : 'DISABLED');
    return result;
  }
  public destroy(): void {
    if (this.stateValue === 'DESTROYED') return;
    this.abortControllerValue.abort();
    if (this.journal.size() > 0) rollbackJournal(this.journal);
    this.transition('DESTROYED');
  }
  private transition(next: RuntimeState): void {
    if (!ALLOWED[this.stateValue].includes(next)) {
      this.invalid(next);
      return;
    }
    this.stateValue = next;
  }
  private invalid(next: RuntimeState): void {
    this.diagnostics.push(
      createDiagnostic('RTLX-STATE-001', 'error', 'RUNTIME-STATE-001', 'frame', {
        from: this.stateValue,
        to: next,
      })
    );
  }
}
