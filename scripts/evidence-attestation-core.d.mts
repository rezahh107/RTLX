export declare function sha256(bytes: Uint8Array): string;
export declare function canonicalJson(value: unknown): string;
export declare function walkFiles(
  directory: string,
  excluded?: ReadonlySet<string>
): Promise<string[]>;
export declare function hashTree(
  directory: string,
  excluded: ReadonlySet<string>
): Promise<Readonly<{ sha256: string; files: number }>>;
export declare function normalizeStatus(value: unknown): string;
