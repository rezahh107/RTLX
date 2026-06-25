import { LIMITS } from '../shared/constants';

export type EditableProcessor = (target: HTMLElement, analysisWindow: string) => void;

export class InputEventCoalescer {
  private readonly composing = new WeakSet<HTMLElement>();
  private readonly pending = new Set<HTMLElement>();
  private frameId: number | null = null;
  private timerId: number | null = null;
  private registered = false;

  public constructor(
    private readonly process: EditableProcessor,
    private readonly documentRef: Document = document,
    private readonly windowRef: Window = window
  ) {}

  public start(): void {
    if (this.registered) return;
    this.documentRef.addEventListener('compositionstart', this.onCompositionStart, true);
    this.documentRef.addEventListener('compositionend', this.onCompositionEnd, true);
    this.documentRef.addEventListener('input', this.onInput, true);
    this.registered = true;
  }

  public destroy(): void {
    if (this.registered) {
      this.documentRef.removeEventListener('compositionstart', this.onCompositionStart, true);
      this.documentRef.removeEventListener('compositionend', this.onCompositionEnd, true);
      this.documentRef.removeEventListener('input', this.onInput, true);
      this.registered = false;
    }
    if (this.frameId !== null && typeof this.windowRef.cancelAnimationFrame === 'function')
      this.windowRef.cancelAnimationFrame(this.frameId);
    if (this.timerId !== null) this.windowRef.clearTimeout(this.timerId);
    this.frameId = null;
    this.timerId = null;
    this.pending.clear();
  }

  public pendingCount(): number {
    return this.pending.size;
  }

  private readonly onCompositionStart = (event: Event): void => {
    const target = editableTarget(event.target);
    if (target) this.composing.add(target);
  };

  private readonly onCompositionEnd = (event: Event): void => {
    const target = editableTarget(event.target);
    if (!target) return;
    this.composing.delete(target);
    this.enqueue(target);
  };

  private readonly onInput = (event: Event): void => {
    const target = editableTarget(event.target);
    if (!target || this.composing.has(target) || (event instanceof InputEvent && event.isComposing))
      return;
    this.enqueue(target);
  };

  private enqueue(target: HTMLElement): void {
    if (this.pending.size >= LIMITS.maxPendingRoots && !this.pending.has(target)) return;
    this.pending.add(target);
    if (this.frameId !== null || this.timerId !== null) return;
    if (typeof this.windowRef.requestAnimationFrame === 'function') {
      this.frameId = this.windowRef.requestAnimationFrame(() => {
        this.frameId = null;
        this.flush();
      });
    } else {
      this.timerId = this.windowRef.setTimeout(() => {
        this.timerId = null;
        this.flush();
      }, 0);
    }
  }

  private flush(): void {
    const targets = [...this.pending];
    this.pending.clear();
    for (const target of targets) {
      if (!target.isConnected || this.composing.has(target)) continue;
      this.process(target, analysisWindow(target, this.documentRef));
    }
  }
}

export function analysisWindow(target: HTMLElement, documentRef: Document = document): string {
  const value = editableValue(target);
  const caret = caretOffset(target, value.length, documentRef);
  const half = Math.floor(LIMITS.inputAnalysisWindowCodeUnitsMax / 2);
  let start = Math.max(0, caret - half);
  const end = Math.min(value.length, start + LIMITS.inputAnalysisWindowCodeUnitsMax);
  start = Math.max(0, end - LIMITS.inputAnalysisWindowCodeUnitsMax);
  return value.slice(start, end);
}

function editableTarget(value: EventTarget | null): HTMLElement | null {
  if (!(value instanceof HTMLElement)) return null;
  if (
    value instanceof HTMLInputElement ||
    value instanceof HTMLTextAreaElement ||
    value.isContentEditable
  )
    return value;
  return null;
}

function editableValue(target: HTMLElement): string {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
    return target.value;
  return target.textContent ?? '';
}

function caretOffset(target: HTMLElement, fallback: number, documentRef: Document): number {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
    return target.selectionStart ?? fallback;
  const selection = documentRef.getSelection?.();
  if (!selection?.anchorNode || !target.contains(selection.anchorNode)) return fallback;
  try {
    const range = documentRef.createRange();
    range.selectNodeContents(target);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    return range.toString().length;
  } catch {
    return fallback;
  }
}
