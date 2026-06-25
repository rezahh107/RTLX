export interface TextBlockContinuationRecoveryInput {
  readonly pending: ReadonlySet<Element>;
  readonly visibleQueue: ReadonlySet<Element>;
  readonly backgroundQueue: ReadonlySet<Element>;
  readonly cursors: ReadonlyMap<Element, unknown>;
  readonly isProcessable?: (element: Element) => boolean;
}

export interface TextBlockContinuationRecoveryResult {
  readonly recoverable: readonly Element[];
  readonly invalid: readonly Element[];
}

export function inspectTextBlockContinuationRecovery(
  input: TextBlockContinuationRecoveryInput
): TextBlockContinuationRecoveryResult {
  const recoverable: Element[] = [];
  const invalid: Element[] = [];
  for (const element of input.pending) {
    if (
      !element.isConnected ||
      !input.cursors.has(element) ||
      (input.isProcessable && !input.isProcessable(element))
    ) {
      invalid.push(element);
      continue;
    }
    if (input.visibleQueue.has(element) || input.backgroundQueue.has(element)) continue;
    recoverable.push(element);
  }
  return Object.freeze({
    recoverable: Object.freeze(recoverable),
    invalid: Object.freeze(invalid),
  });
}
