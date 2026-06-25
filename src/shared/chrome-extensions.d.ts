declare namespace chrome {
  namespace dom {
    function openOrClosedShadowRoot(element: Element): ShadowRoot | null;
  }
  namespace sidebarAction {
    function open(): Promise<void>;
  }
}
declare const __RTLX_CLOSED_SHADOW_API__: boolean;

declare const __RTLX_FIREFOX__: boolean;
