import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, 'assets/fonts/manifest.json'), 'utf8'));
if (!manifest.generated || !Array.isArray(manifest.files) || manifest.files.length !== 4)
  throw new Error('Font manifest is not generated');
for (const entry of manifest.files) {
  const bytes = await readFile(join(root, 'assets/fonts', entry.file));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== entry.sha256) throw new Error(`Font hash mismatch: ${entry.file}`);
  if (entry.license !== 'SIL-OFL-1.1') throw new Error(`Unexpected license: ${entry.file}`);
  if (entry.subset === 'arabic' && /(?:^|,)U\+4[1-9A-F](?:-|,|$)/u.test(entry.unicodeRange))
    throw new Error(`Arabic font range overlaps ASCII letters: ${entry.file}`);
}
console.log('font integrity ok');
