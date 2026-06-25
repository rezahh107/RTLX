import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { root } from './release-context.mjs';

const violations = [];
let references = 0;
for (const file of (await readdir(join(root, '.github/workflows'))).sort()) {
  const text = await readFile(join(root, '.github/workflows', file), 'utf8');
  for (const match of text.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/gmu)) {
    references += 1;
    const reference = match[1];
    if (reference.startsWith('./')) continue;
    const at = reference.lastIndexOf('@');
    const revision = at >= 0 ? reference.slice(at + 1) : '';
    if (!/^[a-f0-9]{40}$/u.test(revision)) violations.push({ file, reference });
  }
}
if (violations.length) {
  console.error(
    JSON.stringify({ schemaVersion: '1.0.0', status: 'failed', references, violations }, null, 2)
  );
  process.exit(1);
}
console.log(JSON.stringify({ schemaVersion: '1.0.0', status: 'passed', references }, null, 2));
