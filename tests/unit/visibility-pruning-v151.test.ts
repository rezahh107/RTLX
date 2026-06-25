import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installDom } from '../dom-test-setup';
import { VisibilityRegistry } from '../../src/content/visibility-registry';

beforeEach(() => {
  installDom('<html><body></body></html>');
  class FakeObserver {
    public constructor(public readonly callback: IntersectionObserverCallback) {}
    public observe = vi.fn();
    public unobserve = vi.fn();
    public disconnect = vi.fn();
    public takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    public readonly root = null;
    public readonly rootMargin = '';
    public readonly thresholds = [0];
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

describe('BH-004 Intersection target pruning', () => {
  it('bounds targets and prunes disconnected elements', () => {
    const registry = new VisibilityRegistry(() => undefined, '0px', 2);
    const first = document.createElement('div');
    const second = document.createElement('div');
    const third = document.createElement('div');
    document.body.append(first, second, third);
    expect(registry.defer(first)).toBe(true);
    expect(registry.defer(second)).toBe(true);
    expect(registry.defer(third)).toBe(false);
    first.remove();
    expect(registry.pruneDisconnected(2)).toBe(1);
    expect(registry.defer(third)).toBe(true);
    expect(registry.size()).toBe(2);
    registry.disconnect();
    expect(registry.size()).toBe(0);
  });
});
