import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { root } from './release-context.mjs';
const report = JSON.parse(
  await readFile(join(root, 'dist/evidence/release-evidence-gates.json'), 'utf8')
);
if (report.status !== 'passed' || report.productionReady !== true) {
  console.error(
    JSON.stringify(
      {
        schemaVersion: '1.0.0',
        status: 'failed',
        reason: 'release_evidence_not_passed',
        releaseEvidenceStatus: report.status,
      },
      null,
      2
    )
  );
  process.exit(1);
}
console.log(
  JSON.stringify(
    { schemaVersion: '1.0.0', status: 'passed', releaseEvidenceStatus: report.status },
    null,
    2
  )
);
