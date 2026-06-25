import { LIMITS } from '../shared/constants';

type OwnedSignature = AttributeSignature | CharacterDataSignature | ChildListSignature;
interface BaseSignature {
  generation: number;
  expiresAt: number;
}
interface AttributeSignature extends BaseSignature {
  type: 'attributes';
  target: Element;
  attributeName: string;
  expectedValue: string | null;
}
interface CharacterDataSignature extends BaseSignature {
  type: 'characterData';
  target: CharacterData;
  expectedData: string;
}
interface ChildListSignature extends BaseSignature {
  type: 'childList';
  target: Node;
  addedNodes: readonly Node[];
  removedNodes: readonly Node[];
}

export class OwnedMutationSuppression {
  private readonly signatures: OwnedSignature[] = [];

  public constructor(private readonly now: () => number = () => performance.now()) {}

  public expectAttribute(
    target: Element,
    attributeName: string,
    expectedValue: string | null,
    generation: number
  ): void {
    this.add({
      type: 'attributes',
      target,
      attributeName,
      expectedValue,
      generation,
      expiresAt: this.now() + LIMITS.ownedMutationSignatureTtlMs,
    });
  }

  public expectCharacterData(
    target: CharacterData,
    expectedData: string,
    generation: number
  ): void {
    this.add({
      type: 'characterData',
      target,
      expectedData,
      generation,
      expiresAt: this.now() + LIMITS.ownedMutationSignatureTtlMs,
    });
  }

  public expectChildList(
    target: Node,
    addedNodes: readonly Node[],
    removedNodes: readonly Node[],
    generation: number
  ): void {
    this.add({
      type: 'childList',
      target,
      addedNodes: Object.freeze([...addedNodes]),
      removedNodes: Object.freeze([...removedNodes]),
      generation,
      expiresAt: this.now() + LIMITS.ownedMutationSignatureTtlMs,
    });
  }

  public consume(record: MutationRecord, generation: number): boolean {
    this.prune(generation);
    const index = this.signatures.findIndex((signature) => matches(signature, record, generation));
    if (index < 0) return false;
    this.signatures.splice(index, 1);
    return true;
  }

  public clear(): void {
    this.signatures.length = 0;
  }

  public size(): number {
    this.prune(undefined);
    return this.signatures.length;
  }

  private add(signature: OwnedSignature): void {
    this.prune(signature.generation);
    this.signatures.push(signature);
    if (this.signatures.length > LIMITS.ownedMutationSignaturesMax)
      this.signatures.splice(0, this.signatures.length - LIMITS.ownedMutationSignaturesMax);
  }

  private prune(generation: number | undefined): void {
    const now = this.now();
    for (let index = this.signatures.length - 1; index >= 0; index -= 1) {
      const signature = this.signatures[index];
      if (!signature) continue;
      if (
        signature.expiresAt <= now ||
        (generation !== undefined && signature.generation !== generation)
      )
        this.signatures.splice(index, 1);
    }
  }
}

function matches(signature: OwnedSignature, record: MutationRecord, generation: number): boolean {
  if (signature.generation !== generation || signature.type !== record.type) return false;
  if (signature.target !== record.target) return false;
  if (signature.type === 'attributes')
    return (
      record.attributeName === signature.attributeName &&
      signature.target.getAttribute(signature.attributeName) === signature.expectedValue
    );
  if (signature.type === 'characterData') return signature.target.data === signature.expectedData;
  return (
    sameNodes(signature.addedNodes, record.addedNodes) &&
    sameNodes(signature.removedNodes, record.removedNodes)
  );
}

function sameNodes(expected: readonly Node[], actual: NodeList): boolean {
  if (expected.length !== actual.length) return false;
  return expected.every((node, index) => actual.item(index) === node);
}
