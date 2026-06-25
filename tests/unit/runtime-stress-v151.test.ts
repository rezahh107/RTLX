import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDom } from '../dom-test-setup';
import { LIMITS } from '../../src/shared/constants';
import { BrowserLifecycleCoordinator } from '../../src/content/browser-lifecycle';
import { MutationJournal } from '../../src/content/mutation-journal';
import { applyMutationPlan } from '../../src/content/mutation-applier';
import { createPlan } from '../../src/content/mutation-plan';
import { OwnedMutationSuppression } from '../../src/content/owned-mutation-suppression';
import { rollbackJournal } from '../../src/content/rollback-manager';
import { SharedDelayQueue } from '../../src/content/shared-delay-queue';
import { StreamingStabilityController } from '../../src/content/streaming-stability';
import { VisibilityRegistry } from '../../src/content/visibility-registry';

class CountingTarget extends EventTarget {
  public visibilityState: DocumentVisibilityState = 'visible';
  public prerendering = false;
  public added = 0;
  public removed = 0;

  public override addEventListener(...args: Parameters<EventTarget['addEventListener']>): void {
    this.added += 1;
    super.addEventListener(...args);
  }

  public override removeEventListener(
    ...args: Parameters<EventTarget['removeEventListener']>
  ): void {
    this.removed += 1;
    super.removeEventListener(...args);
  }
}

beforeEach(() => {
  installDom('<html><body></body></html>');
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BH-012 lifecycle and leak stress', () => {
  it('completes 100 hidden/visible, 50 BFCache, and 100 enable/disable cycles without listener growth', () => {
    const documentTarget = new CountingTarget();
    const windowTarget = new CountingTarget();
    const lifecycle = new BrowserLifecycleCoordinator(
      { onSuspend: vi.fn(), onFreeze: vi.fn(), onResume: vi.fn(), onDestroy: vi.fn() },
      documentTarget as unknown as Document,
      windowTarget as unknown as Window
    );
    lifecycle.start();
    for (let index = 0; index < 100; index += 1) {
      documentTarget.visibilityState = 'hidden';
      documentTarget.dispatchEvent(new Event('visibilitychange'));
      documentTarget.visibilityState = 'visible';
      documentTarget.dispatchEvent(new Event('visibilitychange'));
    }
    for (let index = 0; index < 50; index += 1) {
      const hide = new Event('pagehide');
      Object.defineProperty(hide, 'persisted', { value: true });
      windowTarget.dispatchEvent(hide);
      const show = new Event('pageshow');
      Object.defineProperty(show, 'persisted', { value: true });
      windowTarget.dispatchEvent(show);
    }
    lifecycle.destroy();
    expect(documentTarget.added).toBe(documentTarget.removed);
    expect(windowTarget.added).toBe(windowTarget.removed);

    let totalAdded = 0;
    let totalRemoved = 0;
    for (let index = 0; index < 100; index += 1) {
      const doc = new CountingTarget();
      const win = new CountingTarget();
      const cycle = new BrowserLifecycleCoordinator(
        { onSuspend: vi.fn(), onFreeze: vi.fn(), onResume: vi.fn(), onDestroy: vi.fn() },
        doc as unknown as Document,
        win as unknown as Window
      );
      cycle.start();
      cycle.destroy();
      totalAdded += doc.added + win.added;
      totalRemoved += doc.removed + win.removed;
    }
    expect(totalAdded).toBe(totalRemoved);
  });

  it('completes 100 SPA cycles and clears all shared timers on destroy', async () => {
    const streaming = new StreamingStabilityController(() => undefined);
    const delays = new SharedDelayQueue(
      () => undefined,
      () => true,
      () => Date.now()
    );
    for (let index = 0; index < 100; index += 1) {
      const root = document.createElement('section');
      document.body.append(root);
      expect(streaming.enqueue(root).accepted).toBe(true);
      streaming.flush();
    }
    for (let index = 0; index < LIMITS.sharedDelayedCandidatesMax; index += 1) {
      const element = document.createElement('div');
      document.body.append(element);
      delays.enqueue(element, 100 + index, 1);
    }
    streaming.cancel();
    delays.cancel();
    await vi.runAllTimersAsync();
    expect(streaming.snapshot().pending).toBe(false);
    expect(delays.snapshot()).toMatchObject({ buckets: 0, candidates: 0 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds a 10000-record mutation burst and releases detached intersection targets', () => {
    const target = document.createElement('div');
    document.body.append(target);
    const ownership = new OwnedMutationSuppression(() => 0);
    for (let index = 0; index < 10_000; index += 1)
      ownership.expectAttribute(target, 'dir', index % 2 === 0 ? 'rtl' : 'ltr', 1);
    expect(ownership.size()).toBe(LIMITS.ownedMutationSignaturesMax);

    const observed = new Set<Element>();
    class FakeIntersectionObserver {
      public constructor(private readonly callback: IntersectionObserverCallback) {
        void this.callback;
      }
      public observe(element: Element): void {
        observed.add(element);
      }
      public unobserve(element: Element): void {
        observed.delete(element);
      }
      public disconnect(): void {
        observed.clear();
      }
    }
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    const visibility = new VisibilityRegistry(() => undefined);
    const elements = Array.from({ length: 1000 }, () => {
      const element = document.createElement('div');
      document.body.append(element);
      visibility.defer(element);
      return element;
    });
    expect(visibility.size()).toBeLessThanOrEqual(LIMITS.intersectionTargetsMax);
    for (const element of elements) element.remove();
    while (visibility.pruneDisconnected(LIMITS.intersectionPruneBudget) > 0) {
      // Budgeted deterministic pruning until quiescent.
    }
    expect(visibility.size()).toBe(0);
    expect(observed.size).toBe(0);
    visibility.disconnect();
  });

  it('leaves zero journal entries after 100 successful ownership-checked rollbacks', () => {
    for (let index = 0; index < 100; index += 1) {
      const element = document.createElement('p');
      document.body.append(element);
      const journal = new MutationJournal();
      applyMutationPlan(
        createPlan([
          {
            type: 'add-attribute',
            sequence: index + 1,
            target: element,
            owner: 'RTLX-15.9.11',
            requirementId: 'DIRECTION-DECISION-001',
            name: 'dir',
            value: 'rtl',
            expectedCurrentValue: null,
          },
        ]),
        journal
      );
      expect(rollbackJournal(journal).failed).toBe(0);
      expect(journal.size()).toBe(0);
      element.remove();
    }
  });
});
