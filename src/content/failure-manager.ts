import { createDiagnostic } from '../shared/diagnostics';
import type { Diagnostic } from '../shared/types';

export type FailureScope = 'feature' | 'candidate' | 'frame' | 'site';

export class FailureManager {
  private readonly disabled = new Set<string>();
  public readonly diagnostics: Diagnostic[] = [];

  public trip(scope: FailureScope, key: string, reason: string): boolean {
    const identity = `${scope}:${key}`;
    if (this.disabled.has(identity)) return false;
    this.disabled.add(identity);
    this.diagnostics.push(
      createDiagnostic(
        reason === 'hard_limit' ? 'RTLX-LIMIT-001' : 'RTLX-SECURITY-001',
        scope === 'candidate' || scope === 'feature' ? 'error' : 'fatal',
        'FAILURE-MANAGER-001',
        scope === 'candidate' ? 'candidate' : scope === 'feature' ? 'feature' : scope,
        { reason, count: 1 }
      )
    );
    return true;
  }

  public isDisabled(scope: FailureScope, key: string): boolean {
    return this.disabled.has(`${scope}:${key}`);
  }

  public reset(scope?: FailureScope, key?: string): void {
    if (scope && key) this.disabled.delete(`${scope}:${key}`);
    else this.disabled.clear();
  }
}
