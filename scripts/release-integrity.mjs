import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifyReleaseManifest } from './release-integrity-core.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.manifest || !args.root) {
  console.error(
    'Usage: node scripts/release-integrity.mjs --manifest <file> --root <directory> [--ignore <file>]'
  );
  process.exit(1);
}
try {
  const manifest = JSON.parse(await readFile(resolve(args.manifest), 'utf8'));
  const result = await verifyReleaseManifest({
    manifest,
    root: resolve(args.root),
    ignoreFiles: args.ignore,
  });
  console.log(JSON.stringify({ schemaVersion: '1.0.0', ...result }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', error: String(error) }, null, 2));
  process.exitCode = 1;
}

function parseArgs(values) {
  const result = { ignore: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--manifest') result.manifest = values[++index];
    else if (value === '--root') result.root = values[++index];
    else if (value === '--ignore') result.ignore.push(values[++index]);
  }
  return result;
}
