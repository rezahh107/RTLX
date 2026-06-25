export type MutationBatchHandler = (records: readonly MutationRecord[]) => void;
export class ObserverManager {
  private readonly observers = new Map<Document | ShadowRoot, MutationObserver>();
  public observe(root: Document | ShadowRoot, handler: MutationBatchHandler): void {
    if (this.observers.has(root)) return;
    const observer = new MutationObserver((records) => handler(records));
    observer.observe(root, {
      childList: true,
      characterData: true,
      attributes: true,
      subtree: true,
      attributeFilter: [
        'dir',
        'lang',
        'class',
        'role',
        'aria-live',
        'aria-atomic',
        'contenteditable',
        'hidden',
        'inert',
      ],
    });
    this.observers.set(root, observer);
  }
  public size(): number {
    return this.observers.size;
  }
  public disconnect(root?: Document | ShadowRoot): void {
    if (root) {
      this.observers.get(root)?.disconnect();
      this.observers.delete(root);
      return;
    }
    for (const observer of this.observers.values()) observer.disconnect();
    this.observers.clear();
  }
}
