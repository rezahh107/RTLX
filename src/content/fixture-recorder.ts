import { BUILD_FLAVOR, OWNED_CLASS, OWNED_WRAPPER_CLASS } from '../shared/constants';
import type { RecordedFixtureSummary, SiteProfile } from '../shared/types';

export function recordFixtureSummary(
  root: Document | ShadowRoot,
  profile: SiteProfile | null
): RecordedFixtureSummary {
  const query = (selector: string): number => root.querySelectorAll(selector).length;
  return Object.freeze({
    schemaVersion: '1.0.0',
    productVersion: '15.9.11',
    buildFlavor: BUILD_FLAVOR,
    textIncluded: false,
    profileId: profile?.profileId ?? null,
    profileVersion: profile?.profileVersion ?? null,
    counts: Object.freeze({
      candidates: query(
        'main,article,[role="main"],p,section,li,td,th,blockquote,h1,h2,h3,h4,h5,h6'
      ),
      ownedCandidates: query(`.${OWNED_CLASS}`),
      ownedWrappers: query(`.${OWNED_WRAPPER_CLASS}`),
      rtlElements: query('[dir="rtl"]'),
      ltrElements: query('[dir="ltr"]'),
      autoElements: query('[dir="auto"]'),
      codeZones: query('pre,code,kbd,samp,var,[role="code"]'),
      mathZones: query('math,.MathJax,.katex'),
      editorZones: query(
        '[contenteditable],.CodeMirror,.monaco-editor,.ace_editor,.ProseMirror,.ql-editor'
      ),
      terminalZones: query('.xterm,[data-terminal],[role="log"]'),
    }),
  });
}
