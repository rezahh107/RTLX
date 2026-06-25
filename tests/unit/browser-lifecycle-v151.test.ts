import { describe, expect, it, vi } from 'vitest';
import { BrowserLifecycleCoordinator } from '../../src/content/browser-lifecycle';

class FakeTarget extends EventTarget {
  public visibilityState: DocumentVisibilityState = 'visible';
  public prerendering = false;
}

describe('BH-003 browser lifecycle coordinator', () => {
  it('coordinates hidden, frozen, BFCache resume and destroy idempotently', () => {
    const documentTarget = new FakeTarget();
    const windowTarget = new FakeTarget();
    const calls: string[] = [];
    const lifecycle = new BrowserLifecycleCoordinator(
      {
        onSuspend: (reason) => calls.push(`suspend:${reason}`),
        onFreeze: (reason) => calls.push(`freeze:${reason}`),
        onResume: (reason) => calls.push(`resume:${reason}`),
        onDestroy: () => calls.push('destroy'),
      },
      documentTarget as unknown as Document,
      windowTarget as unknown as Window
    );
    lifecycle.start();
    expect(lifecycle.state()).toBe('active');
    documentTarget.visibilityState = 'hidden';
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    expect(lifecycle.state()).toBe('hidden');
    const hiddenGeneration = lifecycle.generation();
    const hiddenPage = new Event('pagehide') as Event & { persisted: boolean };
    Object.defineProperty(hiddenPage, 'persisted', { value: true });
    windowTarget.dispatchEvent(hiddenPage);
    expect(lifecycle.state()).toBe('frozen');
    const shownPage = new Event('pageshow') as Event & { persisted: boolean };
    Object.defineProperty(shownPage, 'persisted', { value: true });
    documentTarget.visibilityState = 'visible';
    windowTarget.dispatchEvent(shownPage);
    expect(lifecycle.state()).toBe('active');
    expect(lifecycle.generation()).toBeGreaterThan(hiddenGeneration);
    lifecycle.destroy();
    lifecycle.destroy();
    expect(calls).toEqual(['suspend:hidden', 'freeze:pagehide', 'resume:pageshow', 'destroy']);
  });

  it('does not activate or mutate during prerender', () => {
    const documentTarget = new FakeTarget();
    documentTarget.prerendering = true;
    const onResume = vi.fn();
    const lifecycle = new BrowserLifecycleCoordinator(
      { onSuspend: vi.fn(), onFreeze: vi.fn(), onResume, onDestroy: vi.fn() },
      documentTarget as unknown as Document,
      new FakeTarget() as unknown as Window
    );
    lifecycle.start();
    expect(lifecycle.state()).toBe('passive');
    expect(lifecycle.canMutate()).toBe(false);
    documentTarget.prerendering = false;
    documentTarget.dispatchEvent(new Event('prerenderingchange'));
    expect(lifecycle.state()).toBe('active');
    expect(onResume).toHaveBeenCalledWith('activation');
  });
});
