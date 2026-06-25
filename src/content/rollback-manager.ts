import { OWNED_WRAPPER_CLASS } from '../shared/constants';
import type { JournalEntry, MutationJournal } from './mutation-journal';

export interface RollbackResult {
  restored: number;
  skipped: number;
  failed: number;
}

export function rollbackJournal(journal: MutationJournal): RollbackResult {
  let restored = 0;
  let skipped = 0;
  let failed = 0;
  const completed = new Set<number>();
  for (const entry of journal.committedReverse()) {
    try {
      if (rollbackEntry(entry)) {
        restored += 1;
        completed.add(entry.sequence);
      } else skipped += 1;
    } catch {
      failed += 1;
    }
  }
  journal.remove(completed);
  return Object.freeze({ restored, skipped, failed });
}

function rollbackEntry(entry: JournalEntry): boolean {
  if (entry.operationType === 'add-attribute' || entry.operationType === 'replace-attribute') {
    if (!(entry.target instanceof Element)) return false;
    const snapshot = entry.preconditionSnapshot as {
      name: string;
      expected: string | null;
      applied: string;
    };
    if (entry.target.getAttribute(snapshot.name) !== snapshot.applied) return false;
    if (entry.previousValue === null) entry.target.removeAttribute(snapshot.name);
    else entry.target.setAttribute(snapshot.name, String(entry.previousValue));
    return true;
  }
  if (entry.operationType === 'add-class') {
    if (!(entry.target instanceof Element)) return false;
    const className = String(entry.preconditionSnapshot);
    if (!entry.target.classList.contains(className)) return false;
    entry.target.classList.remove(className);
    return true;
  }
  if (entry.operationType === 'inject-style') {
    if (entry.createdNodes.length === 0 || entry.createdNodes.some((node) => !node.parentNode))
      return false;
    for (const node of entry.createdNodes) node.parentNode?.removeChild(node);
    return true;
  }
  if (entry.operationType === 'insert-bdi-wrapper') {
    const wrapper = entry.createdNodes.find(
      (node) => node instanceof Element && node.classList.contains(OWNED_WRAPPER_CLASS)
    );
    const after = entry.createdNodes.find((node) => node instanceof Text);
    const source = String(entry.previousValue);
    const snapshot = String(entry.preconditionSnapshot);
    if (
      !(wrapper instanceof Element) ||
      !(after instanceof Text) ||
      !wrapper.parentNode ||
      entry.target.parentNode !== wrapper.parentNode ||
      entry.target.nextSibling !== wrapper ||
      wrapper.nextSibling !== after ||
      (entry.target.textContent ?? '') + (wrapper.textContent ?? '') + after.data !== snapshot ||
      snapshot !== source
    )
      return false;
    const parent = wrapper.parentNode;
    entry.target.textContent = source;
    parent.removeChild(wrapper);
    parent.removeChild(after);
    return true;
  }
  return false;
}
