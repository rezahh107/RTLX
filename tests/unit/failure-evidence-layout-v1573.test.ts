import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import { buildFailureElementEvidence } from '../../src/content/failure-evidence-picker';
import type { ElementInspection } from '../../src/shared/types';

beforeEach(() => installDom());

const inspection: ElementInspection = {
  schemaVersion: '3.2.0',
  matchedProfile: 'official:qwen',
  matchedRule: null,
  matchedRules: [],
  matchedGroup: null,
  selector: 'span[role=img]',
  exclusionReason: null,
  typographyDecision: 'icon-protected',
  languageClassification: 'unknown',
  languageConfidence: 0,
  detectedDirection: 'unknown',
  semanticBlock: {
    tag: 'div',
    role: null,
    strategy: 'nearest-block',
    depth: 1,
    ancestorKinds: ['span[role=img]', 'div'],
    directionTargetTag: 'span',
    directionTargetRole: null,
    directionTargetStrategy: 'descendant-text-owner',
    directionTargetDepth: 1,
    layoutSensitive: true,
    layoutReason: 'layout-with-icons',
  },
  semanticRegion: {
    tag: 'div',
    role: null,
    strategy: 'nearest-block',
    depth: 1,
    textBlockCount: 1,
  },
  textBlock: {
    tag: 'div',
    role: null,
    kind: 'generic-block',
    depth: 0,
  },
  directionTarget: {
    tag: 'span',
    role: null,
    strategy: 'inline-isolation-only',
    depth: 1,
    explicitDir: null,
    computedDirection: 'rtl',
  },
  alignmentTarget: {
    tag: null,
    role: null,
    computedTextAlign: null,
  },
  typographyCoverage: {
    inspected: 0,
    eligible: 0,
    targets: 0,
    continuationPending: false,
  },
  directionDecision: {
    action: 'preserve',
    reason: 'explicit-direction-preserved',
    documentLangUsedAsStrongSignal: false,
  },
  notModifiedReason: 'already-correct',
  mutationStatus: {
    candidateOwned: false,
    explicitDir: null,
    ownedWrappers: 0,
    journalEntries: 0,
  },
};

describe('v15.9.1 selected-element layout diagnostics', () => {
  it('records inherited RTLX direction source and icon evidence without page text', () => {
    document.body.innerHTML = `
      <div id="row" class="rtlx-direction-rtl" dir="rtl" style="display:flex">
        <span id="icon" role="img"><svg><use></use></svg></span>
      </div>`;
    const icon = document.querySelector('#icon')!;
    const evidence = buildFailureElementEvidence(icon, inspection, 'span[role=img]', 'role');

    expect(evidence.schemaVersion).toBe('1.2.0');
    expect(evidence.directionSource).toMatchObject({
      kind: 'inherited',
      sourceDepth: 1,
      sourceTag: 'div',
      sourceOwnedByRtlx: true,
      sourceContainsIcons: true,
    });
    expect(evidence.iconEvidence).toMatchObject({
      iconProtected: true,
      hasSvgDescendant: true,
    });
    expect(evidence.textShape.totalCodepoints).toBe(0);
  });
});
