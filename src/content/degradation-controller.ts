import { LIMITS } from '../shared/constants';

export type DegradationLevel = 0 | 1 | 2 | 3 | 4;
export interface DegradationTransition {
  from: DegradationLevel;
  to: DegradationLevel;
  recovery: boolean;
  failureKey: string | null;
  terminal: boolean;
}

export interface DegradationSnapshot {
  level: DegradationLevel;
  transitions: number;
  recoveryTransitions: number;
  lastTransitionReason: string | null;
  dwellTimeMsByLevel: Readonly<Record<'0' | '1' | '2' | '3' | '4', number>>;
}

export class DegradationController {
  private levelValue: DegradationLevel = 0;
  private lastFailureAt = Number.NEGATIVE_INFINITY;
  private readonly failures = new Map<string, number>();
  private readonly dwellTimeMs = [0, 0, 0, 0, 0];
  private enteredLevelAt: number;
  private transitionCount = 0;
  private recoveryTransitionCount = 0;
  private lastTransitionReason: string | null = null;

  public constructor(private readonly now: () => number = () => performance.now()) {
    this.enteredLevelAt = this.now();
  }

  public level(): DegradationLevel {
    return this.levelValue;
  }

  public recordFailure(
    key: string,
    options: Readonly<{ terminal?: boolean }> = {}
  ): DegradationTransition | null {
    const count = (this.failures.get(key) ?? 0) + 1;
    this.failures.set(key, count);
    this.lastFailureAt = this.now();
    const terminal = options.terminal === true;
    const ceiling: DegradationLevel = terminal ? 4 : 3;
    const target = count >= 3 ? ceiling : Math.min(ceiling, this.levelValue + 1);
    return this.transition(target as DegradationLevel, false, key, terminal);
  }

  public raiseTo(
    level: DegradationLevel,
    failureKey: string | null = null,
    terminal = level === 4
  ): DegradationTransition | null {
    this.lastFailureAt = this.now();
    return this.transition(
      Math.max(level, this.levelValue) as DegradationLevel,
      false,
      failureKey,
      terminal
    );
  }

  public maybeRecover(): DegradationTransition | null {
    if (this.levelValue === 0 || this.levelValue === 4) return null;
    if (this.now() - this.lastFailureAt < LIMITS.degradationQuietPeriodMs) return null;
    const transition = this.transition(
      (this.levelValue - 1) as DegradationLevel,
      true,
      'quiet-period',
      false
    );
    this.lastFailureAt = this.now();
    return transition;
  }

  public recoverAfterQuiescence(): DegradationTransition | null {
    if (this.levelValue === 0 || this.levelValue === 4) return null;
    const target: DegradationLevel = this.levelValue >= 2 ? 1 : 0;
    const transition = this.transition(target, true, 'quiescent', false);
    this.lastFailureAt = this.now();
    if (target === 0) this.failures.clear();
    return transition;
  }

  public snapshot(): DegradationSnapshot {
    const dwell = [...this.dwellTimeMs];
    dwell[this.levelValue] = (dwell[this.levelValue] ?? 0) + (this.now() - this.enteredLevelAt);
    return Object.freeze({
      level: this.levelValue,
      transitions: this.transitionCount,
      recoveryTransitions: this.recoveryTransitionCount,
      lastTransitionReason: this.lastTransitionReason,
      dwellTimeMsByLevel: Object.freeze({
        '0': finiteDuration(dwell[0]),
        '1': finiteDuration(dwell[1]),
        '2': finiteDuration(dwell[2]),
        '3': finiteDuration(dwell[3]),
        '4': finiteDuration(dwell[4]),
      }),
    });
  }

  public allowsHealthRecalculation(): boolean {
    return this.levelValue === 0;
  }

  public allowsBidiWrapping(): boolean {
    return this.levelValue < 2;
  }

  public allowsDeepShadowDiscovery(): boolean {
    return this.levelValue < 2;
  }

  public visibleCandidatesOnly(): boolean {
    return false;
  }

  public isPaused(): boolean {
    return this.levelValue >= 4;
  }

  private transition(
    target: DegradationLevel,
    recovery: boolean,
    failureKey: string | null,
    terminal: boolean
  ): DegradationTransition | null {
    if (target === this.levelValue) return null;
    const now = this.now();
    this.dwellTimeMs[this.levelValue] =
      (this.dwellTimeMs[this.levelValue] ?? 0) + (now - this.enteredLevelAt);
    this.enteredLevelAt = now;
    const from = this.levelValue;
    this.levelValue = target;
    this.transitionCount += 1;
    if (recovery) this.recoveryTransitionCount += 1;
    this.lastTransitionReason = failureKey;
    return Object.freeze({ from, to: target, recovery, failureKey, terminal });
  }
}

function finiteDuration(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}
