import Ajv2020 from 'ajv/dist/2020.js';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
ajv.addKeyword({ keyword: 'x-registry', schemaType: 'object', valid: true });
const files = (await readdir(join(root, 'schemas')))
  .filter((name) => name.endsWith('.json'))
  .sort();
const schemas = [];
for (const file of files) {
  const schema = JSON.parse(await readFile(join(root, 'schemas', file), 'utf8'));
  schemas.push([file, schema]);
  ajv.addSchema(schema);
}
for (const [file, schema] of schemas) {
  ajv.compile(schema);
  console.log(`schema ok: ${file}`);
}
const settings = JSON.parse(
  await readFile(join(root, 'tests/fixtures/valid/settings.json'), 'utf8')
);
if (!ajv.validate('https://rtlx.invalid/schemas/settings.schema.json', settings))
  throw new Error(ajv.errorsText());
const invalid = JSON.parse(
  await readFile(join(root, 'tests/fixtures/malformed/settings-extra-field.json'), 'utf8')
);
if (ajv.validate('https://rtlx.invalid/schemas/settings.schema.json', invalid))
  throw new Error('Malformed settings fixture unexpectedly validated');
