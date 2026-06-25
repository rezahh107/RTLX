import { LIMITS, OWNED_WRAPPER_CLASS } from '../shared/constants';
import type { MutationPlan, MutationOperation } from './mutation-plan';
import type { JournalEntry, MutationJournal } from './mutation-journal';
import type { OwnedMutationSuppression } from './owned-mutation-suppression';

export interface ApplyResult {
  committed: number;
  skipped: number;
  wrappersCommitted: number;
}

export interface ApplyOptions {
  ownership?: OwnedMutationSuppression;
  generation?: number;
}

export function applyMutationPlan(
  plan: MutationPlan,
  journal: MutationJournal,
  options: ApplyOptions = {}
): ApplyResult {
  if (plan.operations.length > LIMITS.maxMutationsPerBatch)
    throw new Error('Mutation batch limit exceeded');
  let committed = 0;
  let skipped = 0;
  let wrappersCommitted = 0;
  for (const operation of plan.operations) {
    const entry = prepareEntry(operation);
    if (!entry) {
      skipped += 1;
      continue;
    }
    journal.append(entry);
    execute(operation, entry, options);
    journal.markCommitted(operation.sequence);
    committed += 1;
    if (operation.type === 'insert-bdi-wrapper') wrappersCommitted += 1;
  }
  return Object.freeze({ committed, skipped, wrappersCommitted });
}

function prepareEntry(operation: MutationOperation): JournalEntry | null {
  switch (operation.type) {
    case 'add-attribute':
      if (operation.target.getAttribute(operation.name) !== operation.expectedCurrentValue)
        return null;
      return entry(operation, null, []);
    case 'replace-attribute': {
      const current = operation.target.getAttribute(operation.name);
      if (current !== operation.expectedCurrentValue) return null;
      return entry(operation, current, []);
    }
    case 'add-class':
      if (operation.target.classList.contains(operation.className)) return null;
      return entry(operation, false, []);
    case 'insert-bdi-wrapper':
      if (
        !operation.target.parentNode ||
        operation.expectedSourceText !== operation.target.data ||
        operation.token.end > operation.target.data.length
      )
        return null;
      return entry(operation, operation.target.data, []);
    case 'inject-style': {
      const container = operation.target instanceof Document ? operation.target : operation.target;
      if (container.querySelector(`#${CSS.escape(operation.styleId)}`)) return null;
      return entry(operation, null, []);
    }
  }
}

function execute(
  operation: MutationOperation,
  journalEntry: JournalEntry,
  options: ApplyOptions
): void {
  const generation = options.generation ?? 0;
  switch (operation.type) {
    case 'add-attribute':
    case 'replace-attribute':
      options.ownership?.expectAttribute(
        operation.target,
        operation.name,
        operation.value,
        generation
      );
      operation.target.setAttribute(operation.name, operation.value);
      break;
    case 'add-class': {
      const current = operation.target.getAttribute('class');
      const expected =
        current && current.trim().length > 0
          ? `${current} ${operation.className}`
          : operation.className;
      options.ownership?.expectAttribute(operation.target, 'class', expected, generation);
      operation.target.classList.add(operation.className);
      break;
    }
    case 'inject-style': {
      const style = document.createElement('style');
      style.id = operation.styleId;
      style.textContent = operation.cssText;
      const container =
        operation.target instanceof Document
          ? (operation.target.head ?? operation.target.documentElement)
          : operation.target;
      if (!container) throw new Error('Style target unavailable before commit');
      options.ownership?.expectChildList(container, [style], [], generation);
      container.appendChild(style);
      journalEntry.createdNodes.push(style);
      break;
    }
    case 'insert-bdi-wrapper': {
      const { target, token } = operation;
      const parent = target.parentNode;
      if (!parent) throw new Error('Text target detached before commit');
      const current = target.data;
      const before = current.slice(0, token.start);
      const middleText = current.slice(token.start, token.end);
      const afterText = current.slice(token.end);
      options.ownership?.expectCharacterData(target, before, generation);
      target.data = before;
      const wrapper = document.createElement('bdi');
      wrapper.setAttribute('dir', token.direction);
      wrapper.classList.add(OWNED_WRAPPER_CLASS);
      wrapper.appendChild(document.createTextNode(middleText));
      const after = document.createTextNode(afterText);
      options.ownership?.expectChildList(parent, [after], [], generation);
      parent.insertBefore(after, target.nextSibling);
      options.ownership?.expectChildList(parent, [wrapper], [], generation);
      parent.insertBefore(wrapper, after);
      journalEntry.createdNodes.push(wrapper, after);
      break;
    }
  }
}

function entry(
  operation: MutationOperation,
  previousValue: unknown,
  createdNodes: Node[]
): JournalEntry {
  return {
    sequence: operation.sequence,
    operationType: operation.type,
    target: operation.target,
    preconditionSnapshot: snapshot(operation),
    previousValue,
    createdNodes,
    committed: false,
  };
}
function snapshot(operation: MutationOperation): unknown {
  if (operation.type === 'insert-bdi-wrapper') return operation.expectedSourceText;
  if (operation.type === 'add-class') return operation.className;
  if (operation.type === 'inject-style') return operation.styleId;
  return {
    name: operation.name,
    expected: operation.expectedCurrentValue,
    applied: operation.value,
  };
}
export function removeJournaledClass(
  target: Element,
  className: string,
  journal: MutationJournal,
  options: ApplyOptions = {}
): boolean {
  const entry = journal.findCommittedClassAddition(target, className);
  if (!entry) return false;
  if (!target.classList.contains(className)) {
    journal.remove(new Set([entry.sequence]));
    return false;
  }
  const current = target.getAttribute('class') ?? '';
  const tokens = current.split(/\s+/u).filter((token) => token.length > 0 && token !== className);
  const expected = tokens.join(' ');
  options.ownership?.expectAttribute(target, 'class', expected, options.generation ?? 0);
  target.classList.remove(className);
  journal.remove(new Set([entry.sequence]));
  return true;
}
