import { HARD_EXCLUSIONS_REGISTRY } from '../shared/registry-data';

const CLI_PREFIX = /^\s*(?:\$|>|#|PS>|C:\\>)/mu;
const HIGHLIGHT_CLASS = /(?:^|\s)(?:language-|highlight|hljs|prettyprint|codehilite)/u;

export interface CodeLikeEvidence {
  containsCodeDescendant: boolean;
  multipleLineBreaks: boolean;
  punctuationDense: boolean;
  promptPrefix: boolean;
  highlightClass: boolean;
  signalCount: number;
  codeLike: boolean;
}

export function classifyPreElement(element: HTMLPreElement): CodeLikeEvidence {
  const text = element.textContent ?? '';
  const punctuation = (text.match(/[{}()[\];:=<>/\\|&$#]/gu) ?? []).length;
  const nonWhitespace = (text.match(/\S/gu) ?? []).length;
  const thresholds = HARD_EXCLUSIONS_REGISTRY.codeZoneHeuristics;
  const evidence = {
    containsCodeDescendant: element.querySelector('code') !== null,
    multipleLineBreaks: (text.match(/\n/gu) ?? []).length >= 2,
    punctuationDense:
      nonWhitespace >= thresholds.minimumNonWhitespace &&
      punctuation / nonWhitespace >= thresholds.punctuationDensity,
    promptPrefix: CLI_PREFIX.test(text),
    highlightClass: HIGHLIGHT_CLASS.test(element.className),
  };
  const signalCount = Object.values(evidence).filter(Boolean).length;
  return Object.freeze({
    ...evidence,
    signalCount,
    codeLike: signalCount >= thresholds.minimumSignals,
  });
}
