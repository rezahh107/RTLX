export interface RootEntry {
  root: Document | ShadowRoot;
  depth: number;
  slots: Set<HTMLSlotElement>;
}
export class RootRegistry {
  private readonly entries = new Map<Document | ShadowRoot, RootEntry>();
  public add(root: Document | ShadowRoot, depth: number): boolean {
    if (this.entries.has(root)) return false;
    this.entries.set(root, { root, depth, slots: new Set() });
    return true;
  }
  public has(root: Document | ShadowRoot): boolean {
    return this.entries.has(root);
  }
  public get(root: Document | ShadowRoot): RootEntry | undefined {
    return this.entries.get(root);
  }
  public values(): readonly RootEntry[] {
    return Object.freeze([...this.entries.values()].sort((a, b) => a.depth - b.depth));
  }
  public delete(root: Document | ShadowRoot): void {
    this.entries.delete(root);
  }
  public clear(): void {
    this.entries.clear();
  }
  public size(): number {
    return this.entries.size;
  }
}
