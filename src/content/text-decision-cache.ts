import type { CodeContext } from './code-context';

export interface ProcessedTextFingerprint {
  sourceText: string;
  sourceLength: number;
  localDir: string;
  nearestLang: string;
  profileId: string;
  profileVersion: string;
  processorVersion: string;
  codeContext: CodeContext;
  matchedRuleId: string;
  classificationLanguage: string;
  aggressiveNaturalLanguageWrapping: boolean;
  candidateTag: string;
  candidateRole: string;
  parentTag: string;
  parentRole: string;
}

export interface ProcessedTextFingerprintInput {
  sourceText: string;
  localDir: string | null;
  nearestLang: string | null;
  profileId: string | null;
  profileVersion: string | number | null;
  processorVersion: string;
  codeContext: CodeContext;
  matchedRuleId: string | null;
  classificationLanguage: string;
  aggressiveNaturalLanguageWrapping: boolean;
  candidate: Element;
  textNode: Text;
}

export function createProcessedTextFingerprint(
  input: ProcessedTextFingerprintInput
): ProcessedTextFingerprint {
  const parent = input.textNode.parentElement;
  return Object.freeze({
    sourceText: input.sourceText,
    sourceLength: input.sourceText.length,
    localDir: input.localDir ?? 'none',
    nearestLang: input.nearestLang ?? 'none',
    profileId: input.profileId ?? 'none',
    profileVersion: String(input.profileVersion ?? 0),
    processorVersion: input.processorVersion,
    codeContext: input.codeContext,
    matchedRuleId: input.matchedRuleId ?? 'none',
    classificationLanguage: input.classificationLanguage,
    aggressiveNaturalLanguageWrapping: input.aggressiveNaturalLanguageWrapping,
    candidateTag: input.candidate.tagName.toLowerCase(),
    candidateRole: input.candidate.getAttribute('role') ?? 'none',
    parentTag: parent?.tagName.toLowerCase() ?? 'none',
    parentRole: parent?.getAttribute('role') ?? 'none',
  });
}

export function isProcessedTextFingerprintEqual(
  left: ProcessedTextFingerprint,
  right: ProcessedTextFingerprint
): boolean {
  return (
    left.sourceText === right.sourceText &&
    left.sourceLength === right.sourceLength &&
    left.localDir === right.localDir &&
    left.nearestLang === right.nearestLang &&
    left.profileId === right.profileId &&
    left.profileVersion === right.profileVersion &&
    left.processorVersion === right.processorVersion &&
    left.codeContext === right.codeContext &&
    left.matchedRuleId === right.matchedRuleId &&
    left.classificationLanguage === right.classificationLanguage &&
    left.aggressiveNaturalLanguageWrapping === right.aggressiveNaturalLanguageWrapping &&
    left.candidateTag === right.candidateTag &&
    left.candidateRole === right.candidateRole &&
    left.parentTag === right.parentTag &&
    left.parentRole === right.parentRole
  );
}
