const TEXT_BLOCK_STRUCTURE_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'BLOCKQUOTE',
  'DD',
  'DIV',
  'DT',
  'FIGCAPTION',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'LI',
  'MAIN',
  'P',
  'SECTION',
  'TD',
  'TH',
]);
const TEXT_BLOCK_STRUCTURE_SELECTOR =
  'address,article,blockquote,dd,div,dt,figcaption,h1,h2,h3,h4,h5,h6,li,main,p,section,td,th';
const STRUCTURE_AFFECTING_ATTRIBUTES = new Set([
  'class',
  'role',
  'aria-live',
  'aria-atomic',
  'contenteditable',
  'hidden',
  'inert',
]);

export interface MutationIntakePlan {
  mutationElement: Element | null;
  addedElements: readonly Element[];
  discoveryRoots: readonly Element[];
  directCandidates: readonly Element[];
  invalidateTextBlockEnumeration: boolean;
}

/**
 * Converts one MutationRecord into the narrowest safe work plan.
 * Newly inserted element subtrees use discovery; text/attribute/removal changes
 * reprocess only the nearest candidate supplied by FrameRuntime.
 */
export function planMutationIntake(record: MutationRecord): MutationIntakePlan {
  const mutationElement =
    record.target instanceof Element ? record.target : record.target.parentElement;
  const addedElements: Element[] = [];
  const discoveryRoots: Element[] = [];
  const directCandidates = new Set<Element>();

  if (record.type === 'childList') {
    for (const node of record.addedNodes) {
      if (node instanceof Element && node.isConnected) {
        addedElements.push(node);
        discoveryRoots.push(node);
      } else if (node instanceof Text && node.parentElement?.isConnected) {
        directCandidates.add(node.parentElement);
      }
    }
    if (record.removedNodes.length > 0 && mutationElement?.isConnected)
      directCandidates.add(mutationElement);
    if (discoveryRoots.length === 0 && directCandidates.size === 0 && mutationElement?.isConnected)
      directCandidates.add(mutationElement);
  } else if (mutationElement?.isConnected) {
    directCandidates.add(mutationElement);
  }

  return Object.freeze({
    mutationElement,
    addedElements: Object.freeze(addedElements),
    discoveryRoots: Object.freeze(discoveryRoots),
    directCandidates: Object.freeze([...directCandidates]),
    invalidateTextBlockEnumeration: shouldInvalidateTextBlockEnumeration(record),
  });
}

export function shouldInvalidateTextBlockEnumeration(record: MutationRecord): boolean {
  if (record.type === 'attributes')
    return STRUCTURE_AFFECTING_ATTRIBUTES.has(record.attributeName ?? '');
  if (record.type !== 'childList') return false;
  for (const node of [...record.addedNodes, ...record.removedNodes]) {
    if (nodeAffectsTextBlockStructure(node)) return true;
  }
  return false;
}

function nodeAffectsTextBlockStructure(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  return (
    TEXT_BLOCK_STRUCTURE_TAGS.has(node.tagName) ||
    node.querySelector(TEXT_BLOCK_STRUCTURE_SELECTOR) !== null
  );
}
