import { afterEach, describe, expect, it, vi } from 'vitest';
import { installDom } from '../dom-test-setup';
import { VisibilityRegistry } from '../../src/content/visibility-registry';

afterEach(() => vi.unstubAllGlobals());

describe('visibility registry', () => {
  it('uses the 300px observer margin and emits visible elements once', () => {
    installDom('<html><body><main></main></body></html>');
    const callbacks: IntersectionObserverCallback[] = [];
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    class FakeObserver {
      public constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        callbacks.push(cb);
        expect(options?.rootMargin).toBe('300px');
      }
      public observe = observe;
      public unobserve = unobserve;
      public disconnect = disconnect;
      public takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
      public root = null;
      public rootMargin = '300px';
      public thresholds = [0];
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const visible: Element[] = [];
    const registry = new VisibilityRegistry((element) => visible.push(element));
    const main = document.querySelector('main')!;
    expect(registry.defer(main)).toBe(true);
    const callback = callbacks[0];
    expect(callback).toBeDefined();
    callback?.(
      [
        {
          target: main,
          isIntersecting: true,
          intersectionRatio: 1,
        } as unknown as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver
    );
    expect(visible).toEqual([main]);
    expect(unobserve).toHaveBeenCalledWith(main);
  });
});
