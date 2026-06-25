import { parseHTML } from 'linkedom';
export function installDom(html = '<html><body></body></html>'): Document {
  const parsed = parseHTML(html);
  const window = parsed.window;
  Object.assign(globalThis, {
    window,
    document: window.document,
    Node: window.Node,
    Element: window.Element,
    Text: window.Text,
    Document: window.Document,
    ShadowRoot: window.ShadowRoot,
    HTMLPreElement: window.HTMLPreElement,
    NodeFilter: window.NodeFilter,
    DOMException: window.DOMException,
    CSS: window.CSS ?? { escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/gu, '\\$&') },
    getComputedStyle: () => ({ fontFamily: 'system-ui', content: 'none' }),
  });
  return window.document;
}
