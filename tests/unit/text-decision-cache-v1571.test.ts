import { describe, expect, it } from 'vitest';
import {
  createProcessedTextFingerprint,
  isProcessedTextFingerprintEqual,
} from '../../src/content/text-decision-cache';
import { installDom } from '../dom-test-setup';

function fixture() {
  const document = installDom(
    '<main role="main"><p role="article"><span>سلام GPT-5</span></p></main>'
  );
  const candidate = document.querySelector('p')!;
  const textNode = document.querySelector('span')!.firstChild as Text;
  return { candidate, textNode };
}

describe('v15.9.11 structural text-decision fingerprint', () => {
  it('reuses an unchanged text/context decision deterministically', () => {
    const { candidate, textNode } = fixture();
    const input = {
      sourceText: textNode.data,
      localDir: null,
      nearestLang: 'fa',
      profileId: 'official:test',
      profileVersion: 2,
      processorVersion: '15.9.11',
      codeContext: 'none' as const,
      matchedRuleId: 'message-rule',
      classificationLanguage: 'mixed',
      aggressiveNaturalLanguageWrapping: false,
      candidate,
      textNode,
    };
    const first = createProcessedTextFingerprint(input);
    const second = createProcessedTextFingerprint(input);
    expect(isProcessedTextFingerprintEqual(first, second)).toBe(true);
    expect(first).toEqual(second);
  });

  it('invalidates on text, profile, rule, processor, or code-context change', () => {
    const { candidate, textNode } = fixture();
    const base = createProcessedTextFingerprint({
      sourceText: textNode.data,
      localDir: null,
      nearestLang: 'fa',
      profileId: 'official:test',
      profileVersion: 2,
      processorVersion: '15.9.11',
      codeContext: 'none',
      matchedRuleId: 'message-rule',
      classificationLanguage: 'mixed',
      aggressiveNaturalLanguageWrapping: false,
      candidate,
      textNode,
    });
    const variants = [
      { sourceText: 'سلام GPT-6' },
      { profileVersion: 3 },
      { matchedRuleId: 'other-rule' },
      { processorVersion: '15.7.4' },
      { codeContext: 'inline-technical' as const },
      { aggressiveNaturalLanguageWrapping: true },
    ];
    for (const variant of variants) {
      const changed = createProcessedTextFingerprint({
        sourceText: textNode.data,
        localDir: null,
        nearestLang: 'fa',
        profileId: 'official:test',
        profileVersion: 2,
        processorVersion: '15.9.11',
        codeContext: 'none',
        matchedRuleId: 'message-rule',
        classificationLanguage: 'mixed',
        aggressiveNaturalLanguageWrapping: false,
        candidate,
        textNode,
        ...variant,
      });
      expect(isProcessedTextFingerprintEqual(base, changed)).toBe(false);
    }
  });

  it('invalidates when structural context changes without text mutation', () => {
    const { candidate, textNode } = fixture();
    const before = createProcessedTextFingerprint({
      sourceText: textNode.data,
      localDir: null,
      nearestLang: 'fa',
      profileId: null,
      profileVersion: null,
      processorVersion: '15.9.11',
      codeContext: 'none',
      matchedRuleId: null,
      classificationLanguage: 'mixed',
      aggressiveNaturalLanguageWrapping: false,
      candidate,
      textNode,
    });
    candidate.setAttribute('role', 'note');
    textNode.parentElement?.setAttribute('role', 'term');
    const after = createProcessedTextFingerprint({
      sourceText: textNode.data,
      localDir: null,
      nearestLang: 'fa',
      profileId: null,
      profileVersion: null,
      processorVersion: '15.9.11',
      codeContext: 'none',
      matchedRuleId: null,
      classificationLanguage: 'mixed',
      aggressiveNaturalLanguageWrapping: false,
      candidate,
      textNode,
    });
    expect(isProcessedTextFingerprintEqual(before, after)).toBe(false);
  });
});
