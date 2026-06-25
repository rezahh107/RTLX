import Ajv2020 from 'ajv/dist/2020.js';
import { access, readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const bundledDir = join(root, 'profiles/bundled');
const schema = JSON.parse(await readFile(join(root, 'schemas/site-profile.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
ajv.addKeyword({ keyword: 'x-registry', schemaType: 'object', valid: true });
const validate = ajv.compile(schema);

const certificationSchema = JSON.parse(
  await readFile(join(root, 'schemas/profile-certification.schema.json'), 'utf8')
);
const validateCertification = ajv.compile(certificationSchema);
const certification = JSON.parse(
  await readFile(join(root, 'profiles/certification/index.json'), 'utf8')
);
if (!validateCertification(certification))
  throw new Error(`profile certification: ${ajv.errorsText(validateCertification.errors)}`);
const profileIds = [];

const index = JSON.parse(await readFile(join(bundledDir, 'index.json'), 'utf8'));
validateIndex(index);
for (const file of index.profiles) {
  await access(join(bundledDir, file));
  const profile = JSON.parse(await readFile(join(bundledDir, file), 'utf8'));
  if (!validate(profile)) throw new Error(`${file}: ${ajv.errorsText(validate.errors)}`);
  profileIds.push(profile.profileId);
  console.log(`profile ok: ${file}`);
}

const jsonFiles = (await readdir(bundledDir))
  .filter((name) => name.endsWith('.json') && name !== 'index.json')
  .sort();
if (JSON.stringify(jsonFiles) !== JSON.stringify([...index.profiles].sort())) {
  throw new Error('Bundled profile index does not exactly enumerate the profile files');
}

const certificationIds = certification.records.map((record) => record.profileId);
if (JSON.stringify(certificationIds) !== JSON.stringify([...certificationIds].sort()))
  throw new Error('Profile certification records must be lexically sorted');
if (JSON.stringify(certificationIds) !== JSON.stringify([...profileIds].sort()))
  throw new Error('Profile certification must enumerate every bundled profile exactly once');
console.log('profile certification index passed');

const invalid = JSON.parse(
  await readFile(join(root, 'tests/fixtures/malformed/profile-has-selector.json'), 'utf8')
);
if (validate(invalid)) throw new Error('Malformed profile fixture unexpectedly validated');
console.log('profile index and malformed fixture validation passed');

function validateIndex(value) {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    value.schemaVersion !== '3.0.0' ||
    !Array.isArray(value.profiles) ||
    Object.keys(value).sort().join('|') !== 'profiles|schemaVersion'
  ) {
    throw new Error('Bundled profile index contract invalid');
  }
  if (
    value.profiles.some(
      (file) =>
        typeof file !== 'string' ||
        !/^[a-z0-9][a-z0-9._-]*\.json$/u.test(file) ||
        file === 'index.json'
    )
  ) {
    throw new Error('Bundled profile index contains an unsafe filename');
  }
  if (new Set(value.profiles).size !== value.profiles.length) {
    throw new Error('Bundled profile index contains duplicate filenames');
  }
  if (JSON.stringify(value.profiles) !== JSON.stringify([...value.profiles].sort())) {
    throw new Error('Bundled profile index must be lexically sorted');
  }
}
