export interface ReleaseManifestFile {
  path: string;
  size: number;
  sha256: string;
}
export interface ReleaseManifest {
  schemaVersion: string;
  hashAlgorithm: 'sha256';
  canonicalizationVersion: string;
  files: ReleaseManifestFile[];
  [key: string]: unknown;
}
export function sha256File(path: string): Promise<string>;
export function createReleaseManifest(
  root: string,
  relativeFiles: readonly string[],
  metadata?: Readonly<Record<string, unknown>>
): Promise<ReleaseManifest>;
export function verifyReleaseManifest(options: {
  manifest: ReleaseManifest;
  root: string;
  ignoreFiles?: readonly string[];
}): Promise<{ status: 'passed'; verifiedFiles: number }>;
export function walkFiles(directory: string): Promise<string[]>;
