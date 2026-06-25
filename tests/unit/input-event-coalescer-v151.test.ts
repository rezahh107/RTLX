import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDom } from '../dom-test-setup';
import { LIMITS } from '../../src/shared/constants';
import { InputEventCoalescer, analysisWindow } from '../../src/content/input-event-coalescer';

beforeEach(() => {
  installDom('<html><body><textarea id="input"></textarea></body></html>');
  const win = window as unknown as Record<string, unknown>;
  Object.assign(globalThis, {
    HTMLElement: win.HTMLElement,
    HTMLInputElement: win.HTMLInputElement,
    HTMLTextAreaElement: win.HTMLTextAreaElement,
    InputEvent: win.InputEvent ?? Event,
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BH-010 IME-safe input coalescing', () => {
  it('suppresses composition input and processes once after compositionend', async () => {
    const target = document.querySelector('#input') as HTMLTextAreaElement;
    const process = vi.fn();
    const coalescer = new InputEventCoalescer(process);
    coalescer.start();
    target.dispatchEvent(new window.Event('compositionstart', { bubbles: true }));
    target.value = 'متن در حال ترکیب';
    target.dispatchEvent(new window.Event('input', { bubbles: true }));
    await vi.runAllTimersAsync();
    expect(process).not.toHaveBeenCalled();
    target.dispatchEvent(new window.Event('compositionend', { bubbles: true }));
    target.dispatchEvent(new window.Event('input', { bubbles: true }));
    await vi.runAllTimersAsync();
    expect(process).toHaveBeenCalledTimes(1);
    coalescer.destroy();
  });

  it('limits analysis to 512 code units around the caret without editing the value', () => {
    const target = document.querySelector('#input') as HTMLTextAreaElement;
    target.value = 'a'.repeat(2000);
    target.selectionStart = 1000;
    const before = target.value;
    expect(analysisWindow(target)).toHaveLength(LIMITS.inputAnalysisWindowCodeUnitsMax);
    expect(target.value).toBe(before);
  });
});
