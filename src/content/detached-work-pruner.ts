export interface DetachedTextBlockState {
  pending: Set<Element>;
  cursors: Map<Element, unknown>;
  results: Map<Element, unknown>;
}

export function pruneDetachedTextBlockState(state: DetachedTextBlockState): number {
  const candidates = new Set<Element>([
    ...state.pending,
    ...state.cursors.keys(),
    ...state.results.keys(),
  ]);
  let removed = 0;
  for (const element of candidates) {
    if (element.isConnected) continue;
    const existed =
      state.pending.has(element) || state.cursors.has(element) || state.results.has(element);
    state.pending.delete(element);
    state.cursors.delete(element);
    state.results.delete(element);
    if (existed) removed += 1;
  }
  return removed;
}
