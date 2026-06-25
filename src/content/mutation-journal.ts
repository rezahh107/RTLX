import type { MutationOperation } from './mutation-plan';

export interface JournalEntry {
  sequence: number;
  operationType: MutationOperation['type'];
  target: Node;
  preconditionSnapshot: unknown;
  previousValue: unknown;
  createdNodes: Node[];
  committed: boolean;
}

export class MutationJournal {
  private readonly entries: JournalEntry[] = [];
  public append(entry: JournalEntry): void {
    if (this.entries.some((existing) => existing.sequence === entry.sequence))
      throw new Error('Duplicate journal sequence');
    this.entries.push(entry);
    this.entries.sort((a, b) => a.sequence - b.sequence);
  }
  public markCommitted(sequence: number): void {
    const entry = this.entries.find((candidate) => candidate.sequence === sequence);
    if (!entry) throw new Error(`Missing journal entry ${sequence}`);
    entry.committed = true;
  }
  public findCommittedClassAddition(target: Element, className: string): JournalEntry | null {
    return (
      this.entries
        .filter(
          (entry) =>
            entry.committed &&
            entry.operationType === 'add-class' &&
            entry.target === target &&
            entry.preconditionSnapshot === className
        )
        .sort((a, b) => b.sequence - a.sequence)[0] ?? null
    );
  }
  public committedReverse(): readonly JournalEntry[] {
    return Object.freeze(
      this.entries.filter((entry) => entry.committed).sort((a, b) => b.sequence - a.sequence)
    );
  }
  public remove(sequences: ReadonlySet<number>): void {
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries.at(index);
      if (entry && sequences.has(entry.sequence)) this.entries.splice(index, 1);
    }
  }
  public clear(): void {
    this.entries.length = 0;
  }
  public size(): number {
    return this.entries.length;
  }
}
