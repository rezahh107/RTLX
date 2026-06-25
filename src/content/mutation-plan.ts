import type { BidiToken } from '../shared/types';

export type MutationOperation =
  | AddAttributeOperation
  | ReplaceAttributeOperation
  | AddClassOperation
  | InsertBdiWrapperOperation
  | InjectStyleOperation;

interface BaseOperation {
  sequence: number;
  target: Node;
  owner: 'RTLX-15.9.11';
  requirementId: string;
}
export interface AddAttributeOperation extends BaseOperation {
  type: 'add-attribute';
  target: Element;
  name: string;
  value: string;
  expectedCurrentValue: null;
}
export interface ReplaceAttributeOperation extends BaseOperation {
  type: 'replace-attribute';
  target: Element;
  name: string;
  value: string;
  expectedCurrentValue: string;
}
export interface AddClassOperation extends BaseOperation {
  type: 'add-class';
  target: Element;
  className: string;
  expectedAbsent: true;
}
export interface InsertBdiWrapperOperation extends BaseOperation {
  type: 'insert-bdi-wrapper';
  target: Text;
  token: BidiToken;
  expectedSourceText: string;
}
export interface InjectStyleOperation extends BaseOperation {
  type: 'inject-style';
  target: Document | ShadowRoot;
  styleId: string;
  cssText: string;
}

export interface MutationPlan {
  operations: readonly MutationOperation[];
  createdAtSequence: number;
}

export function createPlan(operations: readonly MutationOperation[]): MutationPlan {
  const sorted = [...operations].sort((a, b) => a.sequence - b.sequence);
  if (new Set(sorted.map((operation) => operation.sequence)).size !== sorted.length) {
    throw new Error('Mutation plan sequence values must be unique');
  }
  return Object.freeze({
    operations: Object.freeze(sorted),
    createdAtSequence: sorted.at(-1)?.sequence ?? 0,
  });
}
