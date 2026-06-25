import {
  DIRECTION_LTR_CLASS,
  DIRECTION_OWNER_ATTRIBUTE,
  DIRECTION_RTL_CLASS,
  DIRECTION_STYLE_ELEMENT_ID,
  OWNED_CLASS,
  OWNED_WRAPPER_CLASS,
  RUNTIME_OWNER_ATTRIBUTE,
  STYLE_ELEMENT_ID,
  TYPOGRAPHY_CLASS,
} from '../shared/constants';

export interface StartupReconciliationSnapshot {
  schemaVersion: '1.0.0';
  rootsInspected: number;
  previousRuntimeMarker: string | null;
  preexistingOwnedCandidates: number;
  preexistingTypographyTargets: number;
  preexistingDirectionTargets: number;
  preexistingWrappers: number;
  preexistingStyleElements: number;
  ownedDirectionAttributesRemoved: number;
  ambiguousLegacyDirectionAttributes: number;
  classesRemoved: number;
  wrappersUnwrapped: number;
  stylesRemoved: number;
  cleanupFailures: number;
  cleanupPerformed: boolean;
}

const OWNED_CLASSES = Object.freeze([
  OWNED_CLASS,
  TYPOGRAPHY_CLASS,
  DIRECTION_RTL_CLASS,
  DIRECTION_LTR_CLASS,
]);

export function reconcilePreexistingRuntimeOwnership(
  documentRef: Document = document
): StartupReconciliationSnapshot {
  const roots = collectOpenRoots(documentRef);
  const previousRuntimeMarker = documentRef.documentElement.getAttribute(RUNTIME_OWNER_ATTRIBUTE);
  let preexistingOwnedCandidates = 0;
  let preexistingTypographyTargets = 0;
  let preexistingDirectionTargets = 0;
  let preexistingWrappers = 0;
  let preexistingStyleElements = 0;
  let ownedDirectionAttributesRemoved = 0;
  let ambiguousLegacyDirectionAttributes = 0;
  let classesRemoved = 0;
  let wrappersUnwrapped = 0;
  let stylesRemoved = 0;
  let cleanupFailures = 0;

  for (const root of roots) {
    preexistingOwnedCandidates += queryAll(root, `.${OWNED_CLASS}`).length;
    preexistingTypographyTargets += queryAll(root, `.${TYPOGRAPHY_CLASS}`).length;
    preexistingDirectionTargets += queryAll(
      root,
      `.${DIRECTION_RTL_CLASS},.${DIRECTION_LTR_CLASS}`
    ).length;
    const wrappers = queryAll(root, `.${OWNED_WRAPPER_CLASS}`);
    preexistingWrappers += wrappers.length;
    const styles = [STYLE_ELEMENT_ID, DIRECTION_STYLE_ELEMENT_ID]
      .map((id) => queryOne(root, `#${escapeCss(id)}`))
      .filter((value): value is Element => value !== null);
    preexistingStyleElements += styles.length;

    const ownedDirections = queryAll(root, `[${DIRECTION_OWNER_ATTRIBUTE}]`);
    for (const element of ownedDirections) {
      try {
        const current = element.getAttribute('dir');
        if (current === 'rtl' || current === 'ltr') {
          element.removeAttribute('dir');
          ownedDirectionAttributesRemoved += 1;
        }
        element.removeAttribute(DIRECTION_OWNER_ATTRIBUTE);
      } catch {
        cleanupFailures += 1;
      }
    }

    const legacyCandidates = queryAll(
      root,
      `.${OWNED_CLASS}[dir],.${DIRECTION_RTL_CLASS}[dir],.${DIRECTION_LTR_CLASS}[dir]`
    );
    for (const element of legacyCandidates) {
      if (!element.hasAttribute(DIRECTION_OWNER_ATTRIBUTE)) ambiguousLegacyDirectionAttributes += 1;
    }

    for (const wrapper of [...wrappers].reverse()) {
      try {
        if (
          !wrapper.parentNode ||
          [...wrapper.childNodes].some((node) => !(node instanceof Text))
        ) {
          cleanupFailures += 1;
          continue;
        }
        const parent = wrapper.parentNode;
        parent.replaceChild(documentRef.createTextNode(wrapper.textContent ?? ''), wrapper);
        if ('normalize' in parent && typeof parent.normalize === 'function') parent.normalize();
        wrappersUnwrapped += 1;
      } catch {
        cleanupFailures += 1;
      }
    }

    const classTargets = queryAll(root, OWNED_CLASSES.map((name) => `.${name}`).join(','));
    for (const element of classTargets) {
      try {
        for (const className of OWNED_CLASSES) {
          if (!element.classList.contains(className)) continue;
          element.classList.remove(className);
          classesRemoved += 1;
        }
      } catch {
        cleanupFailures += 1;
      }
    }

    for (const style of styles) {
      try {
        style.remove();
        stylesRemoved += 1;
      } catch {
        cleanupFailures += 1;
      }
    }
  }

  documentRef.documentElement.removeAttribute(RUNTIME_OWNER_ATTRIBUTE);
  const cleanupPerformed =
    previousRuntimeMarker !== null ||
    classesRemoved > 0 ||
    wrappersUnwrapped > 0 ||
    stylesRemoved > 0 ||
    ownedDirectionAttributesRemoved > 0;

  return Object.freeze({
    schemaVersion: '1.0.0',
    rootsInspected: roots.length,
    previousRuntimeMarker,
    preexistingOwnedCandidates,
    preexistingTypographyTargets,
    preexistingDirectionTargets,
    preexistingWrappers,
    preexistingStyleElements,
    ownedDirectionAttributesRemoved,
    ambiguousLegacyDirectionAttributes,
    classesRemoved,
    wrappersUnwrapped,
    stylesRemoved,
    cleanupFailures,
    cleanupPerformed,
  });
}

function collectOpenRoots(documentRef: Document): Array<Document | ShadowRoot> {
  const roots: Array<Document | ShadowRoot> = [];
  const pending: Array<Document | ShadowRoot> = [documentRef];
  const seen = new Set<Node>(pending);
  while (pending.length > 0) {
    const root = pending.shift();
    if (!root) continue;
    roots.push(root);
    for (const element of queryAll(root, '*')) {
      const shadow = element.shadowRoot;
      if (!shadow || seen.has(shadow)) continue;
      seen.add(shadow);
      pending.push(shadow);
    }
  }
  return roots;
}

function queryAll(root: Document | ShadowRoot, selector: string): Element[] {
  try {
    return [...root.querySelectorAll(selector)];
  } catch {
    return [];
  }
}

function queryOne(root: Document | ShadowRoot, selector: string): Element | null {
  try {
    return root.querySelector(selector);
  } catch {
    return null;
  }
}

function escapeCss(value: string): string {
  return globalThis.CSS?.escape
    ? globalThis.CSS.escape(value)
    : value.replace(/[^a-zA-Z0-9_-]/gu, '\\$&');
}
