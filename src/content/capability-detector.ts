export interface Capabilities {
  schedulerPostTask: boolean;
  requestIdleCallback: boolean;
  intersectionObserver: boolean;
  openShadowRoot: boolean;
  closedShadowRootApi: boolean;
}
export function detectCapabilities(): Capabilities {
  return Object.freeze({
    schedulerPostTask: typeof window.scheduler?.postTask === 'function',
    requestIdleCallback: 'requestIdleCallback' in window,
    intersectionObserver: 'IntersectionObserver' in window,
    openShadowRoot: 'attachShadow' in Element.prototype,
    closedShadowRootApi:
      __RTLX_CLOSED_SHADOW_API__ && typeof chrome.dom?.openOrClosedShadowRoot === 'function',
  });
}
