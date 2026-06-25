import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { root, releaseTag, releaseVersion } from './release-context.mjs';

const manifest = JSON.parse(await readFile(join(root, 'manifest.base.json'), 'utf8'));
const constants = await readFile(join(root, 'src/shared/constants.ts'), 'utf8');
const errors = [];
if (manifest.version !== releaseVersion) errors.push(`manifest.base.json=${manifest.version}`);
if (!constants.includes(`PRODUCT_VERSION = '${releaseVersion}'`))
  errors.push('PRODUCT_VERSION mismatch');
if (!constants.includes(`PROCESSOR_VERSION = '${releaseVersion}'`))
  errors.push('PROCESSOR_VERSION mismatch');
for (const file of (await readdir(join(root, '.github/workflows'))).sort()) {
  const text = await readFile(join(root, '.github/workflows', file), 'utf8');
  const stale = [...text.matchAll(/15\.\d+\.\d+/gu)].map((match) => match[0]);
  if (stale.length)
    errors.push(`${file}: hard-coded RTLX versions ${[...new Set(stale)].join(', ')}`);
}
const ref = process.env.GITHUB_REF_NAME;
if (ref && ref.startsWith('v') && !ref.startsWith(`${releaseTag}-rc.`) && ref !== releaseTag)
  errors.push(`release tag ${ref} does not match ${releaseTag}`);
if (errors.length) {
  console.error(
    JSON.stringify({ schemaVersion: '1.0.0', status: 'failed', releaseVersion, errors }, null, 2)
  );
  process.exit(1);
}
console.log(
  JSON.stringify({ schemaVersion: '1.0.0', status: 'passed', releaseVersion, releaseTag }, null, 2)
);
