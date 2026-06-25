import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outputDir = join(root, 'dist', 'evidence');
await mkdir(outputDir, { recursive: true });
const unsignedPath = process.env.RTLX_UNSIGNED_ARTIFACT;
const signedPath = process.env.RTLX_SIGNED_ARTIFACT;
let report;
if (!unsignedPath || !signedPath || !existsSync(unsignedPath) || !existsSync(signedPath)) {
  report = {
    schemaVersion: '1.0.0',
    status: 'insufficient_evidence',
    reason: 'RTLX_UNSIGNED_ARTIFACT and RTLX_SIGNED_ARTIFACT must reference existing artifacts',
  };
  process.exitCode = 2;
} else {
  const unsignedBytes = new Uint8Array(await readFile(unsignedPath));
  const signedBytes = new Uint8Array(await readFile(signedPath));
  const unsignedEntries = unzipSync(unsignedBytes);
  const signedEntries = unzipSync(signedBytes);
  const allowedAddedPrefixes = ['META-INF/'];
  const changedExecutable = [];
  const removed = [];
  for (const [name, bytes] of Object.entries(unsignedEntries)) {
    if (!(name in signedEntries)) {
      removed.push(name);
      continue;
    }
    if (isExecutable(name) && sha256(bytes) !== sha256(signedEntries[name]))
      changedExecutable.push(name);
  }
  const added = Object.keys(signedEntries).filter((name) => !(name in unsignedEntries));
  const forbiddenAdded = added.filter(
    (name) => !allowedAddedPrefixes.some((prefix) => name.startsWith(prefix))
  );
  report = {
    schemaVersion: '1.0.0',
    status:
      changedExecutable.length === 0 && removed.length === 0 && forbiddenAdded.length === 0
        ? 'passed'
        : 'failed',
    unsigned: { file: basename(unsignedPath), sha256: sha256(unsignedBytes) },
    signed: { file: basename(signedPath), sha256: sha256(signedBytes) },
    changedExecutable,
    removed,
    added,
    forbiddenAdded,
  };
  if (report.status !== 'passed') process.exitCode = 1;
}
await writeFile(
  join(outputDir, 'signed-artifact-verification.json'),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));

function isExecutable(name) {
  return /\.(?:js|mjs|css|html|json)$/u.test(name) && !name.startsWith('META-INF/');
}
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
