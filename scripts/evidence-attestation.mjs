import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { root, packageJson } from './release-context.mjs';
import { canonicalJson, hashTree, normalizeStatus, sha256 } from './evidence-attestation-core.mjs';
const evidenceDir = join(root, 'dist', 'evidence');
const artifactDir = join(root, 'dist', 'artifacts');
await mkdir(evidenceDir, { recursive: true });
const sourceTree = await hashTree(root, new Set(['.git', 'node_modules', 'dist', 'coverage']));
const evidence = [];
if (existsSync(evidenceDir))
  for (const file of (await readdir(evidenceDir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name, 'en')
  )) {
    if (!file.isFile() || !file.name.endsWith('.json') || file.name === 'release-attestation.json')
      continue;
    const bytes = await readFile(join(evidenceDir, file.name));
    let status = 'unknown';
    try {
      status = normalizeStatus(JSON.parse(bytes.toString('utf8')).status);
    } catch {
      status = 'invalid_json';
    }
    evidence.push({ file: file.name, sha256: sha256(bytes), bytes: bytes.byteLength, status });
  }
const artifacts = [];
if (existsSync(artifactDir))
  for (const file of (await readdir(artifactDir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name, 'en')
  )) {
    if (!file.isFile() || (!file.name.endsWith('.zip') && !file.name.endsWith('.xpi'))) continue;
    const bytes = await readFile(join(artifactDir, file.name));
    artifacts.push({ file: file.name, sha256: sha256(bytes), bytes: bytes.byteLength });
  }
let releaseEvidenceStatus = 'blocked';
try {
  releaseEvidenceStatus = normalizeStatus(
    JSON.parse(await readFile(join(evidenceDir, 'release-evidence-gates.json'), 'utf8')).status
  );
} catch {
  releaseEvidenceStatus = 'blocked';
}
const body = {
  schemaVersion: '1.1.0',
  release: packageJson.version,
  attestationGenerationStatus: 'passed',
  releaseEvidenceStatus,
  generatedAt: new Date().toISOString(),
  canonicalization: 'sorted-json-v1',
  hashAlgorithm: 'sha256',
  sourceTree,
  artifacts,
  evidence,
};
const attestationSha256 = sha256(Buffer.from(canonicalJson(body)));
const report = { ...body, attestationSha256 };
await writeFile(
  join(evidenceDir, 'release-attestation.json'),
  JSON.stringify(report, null, 2) + '\n'
);
await writeFile(
  join(evidenceDir, 'release-attestation.sha256'),
  `${attestationSha256}  release-attestation.json\n`
);
console.log(JSON.stringify(report, null, 2));
