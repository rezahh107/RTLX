import { HARD_EXCLUSIONS_REGISTRY } from '../shared/registry-data';

const HARD_EXCLUDED_TAGS = new Set(
  HARD_EXCLUSIONS_REGISTRY.elements.map((value) => value.toUpperCase())
);
const CODE_ZONE_SELECTORS = HARD_EXCLUSIONS_REGISTRY.codeZones;
const MUTATION_SENSITIVE_SELECTORS = HARD_EXCLUSIONS_REGISTRY.mutationSensitive;

export function isHardExcluded(element: Element): boolean {
  if (HARD_EXCLUDED_TAGS.has(element.tagName)) return true;
  return element.closest(HARD_EXCLUSIONS_REGISTRY.elements.join(',')) !== null;
}

export function isCodeZone(element: Element, extraSelectors: readonly string[] = []): boolean {
  return element.closest([...CODE_ZONE_SELECTORS, ...extraSelectors].join(',')) !== null;
}

export function isMutationSensitive(
  element: Element,
  extraSelectors: readonly string[] = []
): boolean {
  return element.closest([...MUTATION_SENSITIVE_SELECTORS, ...extraSelectors].join(',')) !== null;
}

export function hasExistingIsolation(element: Element): boolean {
  return element.closest('bdi,bdo,[dir],.rtlx-owned-bdi') !== null;
}

export function isHiddenOrInert(element: Element): boolean {
  return element.closest('[hidden],[inert],template') !== null;
}

export const hardExcludedTags = Object.freeze([...HARD_EXCLUDED_TAGS].sort());
