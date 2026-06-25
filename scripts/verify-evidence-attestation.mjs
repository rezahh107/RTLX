import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { root } from './release-context.mjs';
import { canonicalJson, sha256 } from './evidence-attestation-core.mjs';
const evidenceDir = join(root, 'dist', 'evidence');
const artifactDir = join(root, 'dist', 'artifacts');
const report = JSON.parse(await readFile(join(evidenceDir, 'release-attestation.json'), 'utf8'));
const expected = report.attestationSha256;
const body = { ...report };
delete body.attestationSha256;
const actual = sha256(Buffer.from(canonicalJson(body)));
if (actual !== expected)
  throw new Error(`Attestation digest mismatch: expected ${expected}, got ${actual}`);
for (const item of report.evidence) {
  const bytes = await readFile(join(evidenceDir, item.file));
  if (sha256(bytes) !== item.sha256) throw new Error(`Evidence digest mismatch: ${item.file}`);
  if (bytes.byteLength !== item.bytes)
    throw new Error(`Evidence byte-count mismatch: ${item.file}`);
}
for (const item of report.artifacts) {
  const bytes = await readFile(join(artifactDir, item.file));
  if (sha256(bytes) !== item.sha256) throw new Error(`Artifact digest mismatch: ${item.file}`);
  if (bytes.byteLength !== item.bytes)
    throw new Error(`Artifact byte-count mismatch: ${item.file}`);
}
console.log(
  JSON.stringify(
    {
      schemaVersion: '1.0.0',
      status: 'passed',
      attestationGenerationStatus: report.attestationGenerationStatus,
      releaseEvidenceStatus: report.releaseEvidenceStatus,
      attestationSha256: actual,
    },
    null,
    2
  )
);
