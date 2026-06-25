import { LIMITS } from '../shared/constants';
import { createDiagnostic } from '../shared/diagnostics';
import type { Diagnostic } from '../shared/types';
import type { RootRegistry } from './root-registry';

export interface DiscoveredShadowRoot {
  root: ShadowRoot;
  depth: number;
}

export class ShadowRootManager {
  public readonly diagnostics: Diagnostic[] = [];
  public constructor(
    private readonly registry: RootRegistry,
    private readonly allowClosed: boolean
  ) {}
  public discover(start: Document | ShadowRoot): readonly DiscoveredShadowRoot[] {
    const found: DiscoveredShadowRoot[] = [];
    const discovered = new Set<ShadowRoot>();
    const queue: Array<{ node: ParentNode; depth: number }> = [
      { node: start, depth: this.registry.get(start)?.depth ?? 0 },
    ];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || current.depth >= LIMITS.maxNestedShadowDepth) continue;
      for (const element of current.node.querySelectorAll('*')) {
        let shadow = element.shadowRoot;
        if (
          !shadow &&
          this.allowClosed &&
          __RTLX_CLOSED_SHADOW_API__ &&
          typeof chrome.dom?.openOrClosedShadowRoot === 'function'
        ) {
          try {
            shadow = chrome.dom.openOrClosedShadowRoot(element) ?? null;
          } catch {
            this.diagnostics.push(
              createDiagnostic('RTLX-SHADOW-001', 'info', 'SHADOW-CLOSED-001', 'frame', {
                count: 1,
              })
            );
          }
        }
        if (!shadow || this.registry.has(shadow) || discovered.has(shadow)) continue;
        if (this.registry.size() + found.length >= LIMITS.maxShadowRootsPerFrame) {
          this.diagnostics.push(
            createDiagnostic('RTLX-LIMIT-001', 'warning', 'SHADOW-LIMIT-001', 'frame', {
              limit: LIMITS.maxShadowRootsPerFrame,
            })
          );
          return Object.freeze(found);
        }
        const depth = current.depth + 1;
        discovered.add(shadow);
        found.push(Object.freeze({ root: shadow, depth }));
        queue.push({ node: shadow, depth });
      }
    }
    return Object.freeze(found);
  }
}
