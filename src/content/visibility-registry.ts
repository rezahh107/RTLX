import { LIMITS } from '../shared/constants';

export type VisibleHandler = (element: Element) => void;

export class VisibilityRegistry {
  private observer: IntersectionObserver | null = null;
  private readonly observed = new Set<Element>();
  private capacityFallbacks = 0;

  public constructor(
    private readonly onVisible: VisibleHandler,
    private readonly rootMargin = '300px',
    private readonly maxTargets = LIMITS.intersectionTargetsMax
  ) {
    this.createObserver();
  }

  public defer(element: Element): boolean {
    if (!this.observer || !element.isConnected) return false;
    if (this.observed.has(element)) return true;
    if (this.observed.size >= this.maxTargets) {
      this.pruneDisconnected(LIMITS.intersectionPruneBudget);
      if (this.observed.size >= this.maxTargets) {
        this.capacityFallbacks += 1;
        return false;
      }
    }
    this.observed.add(element);
    this.observer.observe(element);
    return true;
  }

  public forget(element: Element): void {
    this.observer?.unobserve(element);
    this.observed.delete(element);
  }

  public pruneDisconnected(budget = LIMITS.intersectionPruneBudget): number {
    let inspected = 0;
    let removed = 0;
    for (const element of this.observed) {
      if (inspected >= budget) break;
      inspected += 1;
      if (element.isConnected) continue;
      this.forget(element);
      removed += 1;
    }
    return removed;
  }

  public disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.observed.clear();
  }

  public reset(): void {
    this.disconnect();
    this.createObserver();
  }

  public hasObserver(): boolean {
    return this.observer !== null;
  }

  public size(): number {
    return this.observed.size;
  }

  public snapshot(): Readonly<{ targets: number; capacityFallbacks: number }> {
    return Object.freeze({
      targets: this.observed.size,
      capacityFallbacks: this.capacityFallbacks,
    });
  }

  private createObserver(): void {
    if (typeof IntersectionObserver !== 'function') {
      this.observer = null;
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.target.isConnected) {
            this.forget(entry.target);
            continue;
          }
          if (!entry.isIntersecting && entry.intersectionRatio <= 0) continue;
          this.forget(entry.target);
          this.onVisible(entry.target);
        }
      },
      { root: null, rootMargin: this.rootMargin, threshold: 0 }
    );
  }
}
