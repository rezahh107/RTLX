import { LIMITS, PICKER_HOST_ID } from '../shared/constants';
import { sendMessage } from '../shared/api-adapter';
import { message } from '../shared/messages';
import type { ElementInspection, FailureElementEvidence } from '../shared/types';
import { generateStableSelectorCandidates } from './selector-generator';

export type FailureElementInspector = (element: Element, selector: string) => ElementInspection;

export class FailureEvidencePicker {
  private host: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  public constructor(private readonly inspect: FailureElementInspector) {}

  public start(): void {
    this.stop();
    document.getElementById(PICKER_HOST_ID)?.remove();
    const host = document.createElement('div');
    host.id = PICKER_HOST_ID;
    host.setAttribute('data-rtlx-owned-ui', 'true');
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = css();
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.hidden = true;
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'RTLX failure evidence picker');
    const heading = document.createElement('h2');
    heading.textContent = 'Select the element that is not working';
    const instruction = document.createElement('p');
    instruction.textContent =
      'RTLX records only structural and computed-style evidence. Page text and form values are not exported.';
    const cancel = button('Cancel', () => this.stop());
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
    document.removeEventListener('pointermove', this.onPointerMove, true);
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    this.host?.remove();
    this.host = null;
    this.overlay = null;
    this.panel = null;
  }

  public destroy(): void {
    this.stop();
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof Element) || this.isOwnedUi(target) || isRootElement(target)) return;
    this.highlight(target);
  };

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element) || this.isOwnedUi(target) || isRootElement(target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void this.capture(target);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.stop();
  };

  private async capture(element: Element): Promise<void> {
    document.removeEventListener('pointermove', this.onPointerMove, true);
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    if (!this.panel) return;
    try {
      const root: Document | ShadowRoot =
        element.getRootNode() instanceof ShadowRoot
          ? (element.getRootNode() as ShadowRoot)
          : document;
      const candidate = generateStableSelectorCandidates(element, root)[0] ?? null;
      const selector = candidate?.selector ?? element.tagName.toLowerCase();
      const inspection = this.inspect(element, selector);
      const evidence = buildFailureElementEvidence(
        element,
        inspection,
        candidate?.selector ?? null,
        candidate?.strategy ?? null
      );
      const response = await sendMessage(message('SAVE_FAILURE_ELEMENT_EVIDENCE', { evidence }));
      if (!response.success) throw new Error(response.error.message);
      this.panel.replaceChildren();
      const status = document.createElement('p');
      status.setAttribute('role', 'status');
      status.textContent = 'Element evidence saved. Reopen RTLX and export the failure report.';
      const close = button('Close', () => this.stop());
      this.panel.append(status, close);
      close.focus();
    } catch (error) {
      const alert = document.createElement('p');
      alert.setAttribute('role', 'alert');
      alert.textContent =
        error instanceof Error ? error.message : 'Failure evidence capture failed';
      this.panel.append(alert);
    }
  }

  private highlight(target: Element): void {
    if (!this.overlay) return;
    const rect = target.getBoundingClientRect();
    this.overlay.hidden = false;
    this.overlay.style.insetInlineStart = `${Math.max(0, rect.left)}px`;
    this.overlay.style.top = `${Math.max(0, rect.top)}px`;
    this.overlay.style.width = `${Math.max(0, rect.width)}px`;
    this.overlay.style.height = `${Math.max(0, rect.height)}px`;
  }

  private isOwnedUi(element: Element): boolean {
    return element === this.host || element.closest(`#${PICKER_HOST_ID}`) !== null;
  }
}

export function buildFailureElementEvidence(
  element: Element,
  inspection: ElementInspection,
  selector: string | null,
  selectorStrategy: string | null
): FailureElementEvidence {
  const rawText = (element.textContent ?? '').normalize('NFKC');
  const codepoints = [...rawText].slice(0, LIMITS.maxSampleCodepointsPerCandidate);
  const computed = getComputedStyle(element);
  return Object.freeze({
    schemaVersion: '1.0.0',
    selector,
    selectorStrategy,
    tag: element.tagName.toLowerCase(),
    role: element.getAttribute('role'),
    explicitDir: normalizeDir(element.getAttribute('dir')),
    explicitLang: element.getAttribute('lang'),
    contentEditable: (element as HTMLElement).isContentEditable === true,
    classification: Object.freeze({
      language: inspection.languageClassification,
      confidence: inspection.languageConfidence,
      detectedDirection: inspection.detectedDirection,
      exclusionReason: inspection.exclusionReason,
      typographyDecision: inspection.typographyDecision,
    }),
    computed: Object.freeze({
      direction: computed.direction,
      unicodeBidi: computed.unicodeBidi,
      textAlign: computed.textAlign,
      writingMode: computed.writingMode,
      whiteSpace: computed.whiteSpace,
      display: computed.display,
    }),
    context: Object.freeze({
      iframeDepth: frameDepth(),
      shadowRootDepth: shadowDepth(element),
      sameOriginTopFrame: canAccessTopFrame(),
    }),
    textShape: Object.freeze(shape(codepoints)),
    profileMatch: Object.freeze({
      profileId: inspection.matchedProfile,
      ruleId: inspection.matchedRule,
      matchedRuleIds: Object.freeze(inspection.matchedRules.map((rule) => rule.ruleId)),
      group: inspection.matchedGroup,
      candidateOwned: inspection.mutationStatus.candidateOwned,
      ownedWrappers: inspection.mutationStatus.ownedWrappers,
      journalEntries: inspection.mutationStatus.journalEntries,
    }),
  });
}

function shape(codepoints: string[]): FailureElementEvidence['textShape'] {
  let persianLetters = 0;
  let arabicScriptNonPersianLetters = 0;
  let latinLetters = 0;
  let digits = 0;
  for (const char of codepoints) {
    if (/[پچژگکییۀة]/u.test(char)) persianLetters += 1;
    else if (/\p{Script=Arabic}/u.test(char)) arabicScriptNonPersianLetters += 1;
    else if (/\p{Script=Latin}/u.test(char)) latinLetters += 1;
    if (/\p{Number}/u.test(char)) digits += 1;
  }
  const totalCodepoints = codepoints.length;
  return {
    lengthBucket:
      totalCodepoints === 0
        ? '0'
        : totalCodepoints <= 20
          ? '1-20'
          : totalCodepoints <= 100
            ? '21-100'
            : totalCodepoints <= 250
              ? '101-250'
              : totalCodepoints <= 1000
                ? '251-1000'
                : '1000+',
    totalCodepoints,
    persianLetters,
    arabicScriptNonPersianLetters,
    latinLetters,
    digits,
  };
}
function frameDepth(): number {
  let depth = 0;
  let current: Window = window;
  while (current.parent && current !== current.parent && depth < 32) {
    depth += 1;
    current = current.parent;
  }
  return depth;
}
function shadowDepth(element: Element): number {
  let depth = 0;
  let current: Node = element;
  while (current.getRootNode() instanceof ShadowRoot && depth < 32) {
    const root = current.getRootNode() as ShadowRoot;
    depth += 1;
    current = root.host;
  }
  return depth;
}
function canAccessTopFrame(): boolean {
  try {
    void window.top?.location.origin;
    return true;
  } catch {
    return false;
  }
}
function normalizeDir(value: string | null): 'rtl' | 'ltr' | 'auto' | null {
  return value === 'rtl' || value === 'ltr' || value === 'auto' ? value : null;
}
function isRootElement(element: Element): boolean {
  return element.tagName === 'HTML' || element.tagName === 'BODY';
}
function button(text: string, listener: () => void): HTMLButtonElement {
  const value = document.createElement('button');
  value.type = 'button';
  value.textContent = text;
  value.addEventListener('click', listener);
  return value;
}
function css(): string {
  return `:host{all:initial}.overlay{position:fixed;z-index:2147483646;pointer-events:none;border:3px solid #7c3aed;background:rgba(124,58,237,.12)}.panel{position:fixed;z-index:2147483647;inset-block-start:16px;inset-inline-end:16px;width:min(360px,calc(100vw - 32px));padding:14px;border-radius:10px;background:Canvas;color:CanvasText;border:1px solid color-mix(in srgb,CanvasText 25%,transparent);font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.25)}h2{font-size:16px;margin:0 0 8px}p{margin:0 0 10px}button{font:inherit;padding:7px 10px;border-radius:7px;border:1px solid currentColor;background:ButtonFace;color:ButtonText}`;
}
