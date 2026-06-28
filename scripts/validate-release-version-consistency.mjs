import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { root, releaseTag, releaseVersion } from './release-context.mjs';

const errors = [];
const addMismatch = (file, path, expected, actual) => {
  errors.push({ code: 'version_mismatch', file, path, expected, actual });
};
const addStale = (file, path, versions) => {
  errors.push({
    code: 'stale_hard_coded_version',
    file,
    path,
    expected: releaseVersion,
    actual: versions,
  });
};

const readJson = async (file) => JSON.parse(await readFile(join(root, file), 'utf8'));
const pkg = await readJson('package.json');
const manifest = await readJson('manifest.base.json');
const lock = await readJson('package-lock.json');
const constants = await readFile(join(root, 'src/shared/constants.ts'), 'utf8');

if (pkg.version !== releaseVersion)
  addMismatch('package.json', 'version', releaseVersion, pkg.version);
if (manifest.version !== releaseVersion)
  addMismatch('manifest.base.json', 'version', releaseVersion, manifest.version);
if (lock.version !== releaseVersion)
  addMismatch('package-lock.json', 'version', releaseVersion, lock.version);
if (lock.packages?.['']?.version !== releaseVersion)
  addMismatch(
    'package-lock.json',
    'packages[""].version',
    releaseVersion,
    lock.packages?.['']?.version
  );

for (const [name, pattern] of [
  ['PRODUCT_VERSION', /PRODUCT_VERSION\s*=\s*'([^']+)'/u],
  ['PROCESSOR_VERSION', /PROCESSOR_VERSION\s*=\s*'([^']+)'/u],
]) {
  const actual = constants.match(pattern)?.[1] ?? null;
  if (actual !== releaseVersion)
    addMismatch('src/shared/constants.ts', name, releaseVersion, actual);
}

for (const file of [
  'reports/validation-summary.json',
  'reports/implementation-report.json',
  'implementation-report.json',
]) {
  const report = await readJson(file);
  if (report.reportKind === 'historical_archive') continue;
  if (report.productVersion !== releaseVersion)
    addMismatch(file, 'productVersion', releaseVersion, report.productVersion);
  const validationVersion = report.validation?.productVersion;
  if (validationVersion && validationVersion !== releaseVersion)
    addMismatch(file, 'validation.productVersion', releaseVersion, validationVersion);
  const artifactRelease =
    report.artifactManifest?.release ?? report.validation?.artifactManifest?.release;
  if (artifactRelease && artifactRelease !== releaseVersion)
    addMismatch(file, 'artifactManifest.release', releaseVersion, artifactRelease);
}

for (const file of (await readdir(join(root, '.github/workflows'))).sort()) {
  const text = await readFile(join(root, '.github/workflows', file), 'utf8');
  const stale = [
    ...new Set(
      [...text.matchAll(/\b(?:RTLX[-_v]?|v)?(15\.\d+\.\d+)\b/gu)]
        .map((match) => match[1])
        .filter((version) => version !== releaseVersion)
    ),
  ];
  if (stale.length) addStale(`.github/workflows/${file}`, 'workflow', stale);
}

const ref = process.env.GITHUB_REF_NAME;
if (ref && ref.startsWith('v') && !ref.startsWith(`${releaseTag}-rc.`) && ref !== releaseTag)
  errors.push({
    code: 'release_tag_mismatch',
    file: 'GITHUB_REF_NAME',
    path: 'env',
    expected: releaseTag,
    actual: ref,
  });
if (errors.length) {
  console.error(
    JSON.stringify({ schemaVersion: '1.0.0', status: 'failed', releaseVersion, errors }, null, 2)
  );
  process.exit(1);
}
console.log(
  JSON.stringify({ schemaVersion: '1.0.0', status: 'passed', releaseVersion, releaseTag }, null, 2)
);
