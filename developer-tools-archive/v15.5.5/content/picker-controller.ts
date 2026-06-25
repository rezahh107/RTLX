import { PICKER_HOST_ID } from '../shared/constants';
import { message } from '../shared/messages';
import { sendMessage } from '../shared/api-adapter';
import type {
  ElementInspection,
  ElementKind,
  PickerSelection,
  RuleAlignmentMode,
  RuleDirectionMode,
  RuleTypographyMode,
} from '../shared/types';
import { generateStableSelectorCandidates, type GeneratedSelector } from './selector-generator';
export type ElementInspector = (element: Element, selector: string) => ElementInspection;
export class PickerController {
  private host: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private activeKind: ElementKind | null = null;
  public constructor(private readonly inspect: ElementInspector) {}
  public start(kind: ElementKind): void {
    this.stop();
    this.activeKind = kind;
    const host = document.createElement('div');
    host.id = PICKER_HOST_ID;
    host.setAttribute('data-rtlx-owned-ui', 'true');
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = pickerCss();
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.hidden = true;
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', i18n('pickerTitle', 'RTLX Smart Element Picker'));
    const heading = document.createElement('h2');
    heading.textContent = i18n('pickerTitle', 'RTLX Smart Element Picker');
    const instruction = document.createElement('p');
    instruction.textContent = `${i18n('pickerInstruction', 'Select an element on the page.')} (${kind})`;
    const cancel = button(i18n('cancel', 'Cancel'), () => this.stop());
    panel.append(heading, instruction, cancel);
    shadow.append(style, overlay, panel);
    document.documentElement.append(host);
    this.host = host;
    this.overlay = overlay;
    this.panel = panel;
    document.addEventListener('pointermove', this.onPointerMove, true);
    document.addEventListener('click', this.onClick, true);
    document.addEventListener('keydown', this.onKeyDown, true);
    cancel.focus();
  }
  public stop(): void {
    this.detachPageListeners();
    this.host?.remove();
    this.host = null;
    this.overlay = null;
    this.panel = null;
    this.activeKind = null;
  }
  public destroy(): void {
    this.stop();
  }
  private readonly onPointerMove = (event: PointerEvent): void => {
    const target = event.target;
    if (
      !(target instanceof Element) ||
      this.isOwnedUi(target) ||
      target.tagName === 'HTML' ||
      target.tagName === 'BODY'
    )
      return;
    this.highlight(target);
  };
  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element) || this.isOwnedUi(target) || !this.activeKind) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.detachPageListeners();
    this.renderCandidates(target, this.activeKind);
  };
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.stop();
    }
  };
  private renderCandidates(element: Element, kind: ElementKind): void {
    if (!this.panel) return;
    try {
      const root =
        element.getRootNode() instanceof ShadowRoot
          ? (element.getRootNode() as ShadowRoot)
          : document;
      const candidates = generateStableSelectorCandidates(element, root);
      this.panel.replaceChildren();
      const heading = document.createElement('h2');
      heading.textContent = i18n('pickerTitle', 'RTLX Smart Element Picker');
      const intro = document.createElement('p');
      intro.textContent = 'Choose a safe selector. You never need to write CSS manually.';
      const list = document.createElement('div');
      list.className = 'candidate-list';
      for (const candidate of candidates) {
        const row = document.createElement('label');
        row.className = 'candidate';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'selector';
        radio.value = candidate.selector;
        if (list.childElementCount === 0) radio.checked = true;
        radio.addEventListener('change', () => this.previewCandidate(root, candidate));
        const text = document.createElement('span');
        text.textContent = `${candidate.strategy} · ${candidate.target} · ${candidate.uniqueness} match — ${candidate.selector}`;
        row.append(radio, text);
        list.append(row);
      }
      const direction = selectControl(
        'Direction',
        [
          ['auto-safe', 'Auto safe'],
          ['force-rtl', 'Force Persian RTL'],
          ['force-ltr', 'Force English LTR'],
          ['preserve', 'Preserve'],
        ],
        kind === 'content'
          ? 'auto-safe'
          : kind === 'code' || kind === 'editor' || kind === 'terminal'
            ? 'force-ltr'
            : 'preserve'
      );
      const alignment = selectControl(
        'Alignment',
        [
          ['start', 'Logical start'],
          ['preserve', 'Preserve'],
        ],
        kind === 'content' ? 'start' : 'preserve'
      );
      const typography = selectControl(
        'Typography',
        [
          ['persian-only', 'Vazirmatn + Latin policy'],
          ['preserve', 'Preserve'],
        ],
        kind === 'content' ? 'persian-only' : 'preserve'
      );
      const delay = numberControl('Initial delay (ms)', 0, 5000, 0);
      const save = button(
        'Save rule',
        () =>
          void this.saveCandidate(
            root,
            element,
            kind,
            direction.value.value as RuleDirectionMode,
            alignment.value.value as RuleAlignmentMode,
            typography.value.value as RuleTypographyMode,
            Number(delay.value.value)
          )
      );
      const cancel = button(i18n('cancel', 'Cancel'), () => this.stop());
      this.panel.append(
        heading,
        intro,
        list,
        direction.label,
        alignment.label,
        typography.label,
        delay.label,
        save,
        cancel
      );
      const first = candidates[0];
      if (first) this.previewCandidate(root, first);
    } catch (error) {
      this.renderError(error instanceof Error ? error.message : 'Picker failed');
    }
  }
  private async saveCandidate(
    root: Document | ShadowRoot,
    element: Element,
    kind: ElementKind,
    directionMode: RuleDirectionMode,
    alignmentMode: RuleAlignmentMode,
    typographyMode: RuleTypographyMode,
    initialDelayMs: number
  ): Promise<void> {
    if (!this.panel) return;
    const checked = this.panel.querySelector<HTMLInputElement>('input[name="selector"]:checked');
    if (!checked) {
      this.renderError('Select a candidate');
      return;
    }
    const selection: PickerSelection = {
      schemaVersion: '2.0.0',
      hostname: location.hostname.toLowerCase(),
      kind,
      selector: checked.value,
      directionMode,
      alignmentMode,
      typographyMode,
      initialDelayMs,
    };
    const response = await sendMessage(message('SAVE_PICKER_SELECTION', { selection }));
    if (!response.success) {
      this.renderError(response.error.message);
      return;
    }
    const inspection = this.inspect(element, checked.value);
    this.renderInspection(inspection);
    void root;
  }
  private previewCandidate(root: Document | ShadowRoot, candidate: GeneratedSelector): void {
    try {
      const match = root.querySelector(candidate.selector);
      if (match) this.highlight(match);
    } catch {
      return;
    }
  }
  private highlight(target: Element): void {
    const rect = target.getBoundingClientRect();
    if (!this.overlay) return;
    this.overlay.hidden = false;
    this.overlay.style.insetInlineStart = `${Math.max(0, rect.left)}px`;
    this.overlay.style.top = `${Math.max(0, rect.top)}px`;
    this.overlay.style.width = `${Math.max(0, rect.width)}px`;
    this.overlay.style.height = `${Math.max(0, rect.height)}px`;
  }
  private renderInspection(inspection: ElementInspection): void {
    if (!this.panel) return;
    this.panel.replaceChildren();
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = i18n('pickerSaved', 'Selection saved to the site profile.');
    const list = document.createElement('dl');
    for (const [label, value] of [
      ['selector', inspection.selector],
      ['matched profile', inspection.matchedProfile ?? 'none'],
      ['matched rule', inspection.matchedRule ?? 'none'],
      ['matched group', inspection.matchedGroup ?? 'none'],
      ['exclusion reason', inspection.exclusionReason ?? 'none'],
      ['typography decision', inspection.typographyDecision],
      ['language', inspection.languageClassification],
      ['direction', inspection.detectedDirection],
      ['mutation status', inspection.mutationStatus.candidateOwned ? 'owned' : 'not-owned'],
    ] as const) {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      list.append(dt, dd);
    }
    const close = button(i18n('close', 'Close'), () => this.stop());
    this.panel.append(status, list, close);
    close.focus();
  }
  private renderError(value: string): void {
    if (!this.panel) return;
    const p = document.createElement('p');
    p.setAttribute('role', 'alert');
    p.textContent = value;
    this.panel.append(p);
  }
  private detachPageListeners(): void {
    document.removeEventListener('pointermove', this.onPointerMove, true);
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    if (this.overlay) this.overlay.hidden = true;
  }
  private isOwnedUi(element: Element): boolean {
    return element === this.host || element.closest(`#${PICKER_HOST_ID}`) !== null;
  }
}
function button(text: string, listener: () => void): HTMLButtonElement {
  const value = document.createElement('button');
  value.type = 'button';
  value.textContent = text;
  value.addEventListener('click', listener);
  return value;
}
function selectControl(
  labelText: string,
  values: readonly (readonly [string, string])[],
  selected: string
): { label: HTMLLabelElement; value: HTMLSelectElement } {
  const label = document.createElement('label');
  label.textContent = labelText;
  const select = document.createElement('select');
  for (const [value, text] of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    option.selected = value === selected;
    select.append(option);
  }
  label.append(select);
  return { label, value: select };
}
function numberControl(
  labelText: string,
  min: number,
  max: number,
  value: number
): { label: HTMLLabelElement; value: HTMLInputElement } {
  const label = document.createElement('label');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  label.append(input);
  return { label, value: input };
}
function pickerCss(): string {
  return `:host{all:initial}.overlay{position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #2563eb;background:rgba(37,99,235,.12);box-sizing:border-box}.panel{position:fixed;z-index:2147483647;inset-block-start:12px;inset-inline-end:12px;width:min(440px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;background:#fff;color:#111;border:1px solid #555;border-radius:10px;padding:14px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.28);direction:auto}.panel h2{font-size:16px;margin:0 0 8px}.panel button,.panel select,.panel input{font:inherit;padding:7px}.panel label{display:grid;gap:4px;margin:8px 0}.candidate-list{display:grid;gap:6px}.candidate{grid-template-columns:auto 1fr;align-items:start;border:1px solid #ddd;border-radius:6px;padding:7px}.panel dl{display:grid;grid-template-columns:minmax(110px,auto) 1fr;gap:6px}.panel dt{font-weight:700}.panel dd{margin:0;overflow-wrap:anywhere}`;
}
function i18n(key: string, fallback: string): string {
  return chrome.i18n.getMessage(key) || fallback;
}
