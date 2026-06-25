import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
export const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
export const releaseVersion = packageJson.version;
export const releaseTag = `v${releaseVersion}`;
export const artifactName = (target) => `rtlx-${target}-${releaseVersion}.zip`;
