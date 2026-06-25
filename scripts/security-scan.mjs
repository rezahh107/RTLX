import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const forbidden = [
  /\beval\s*\(/u,
  /\bnew\s+Function\s*\(/u,
  /(?:^|[^\w.$])Function\s*\(\s*['"`]/u,
  /setTimeout\s*\(\s*["']/u,
  /setInterval\s*\(\s*["']/u,
  /\.innerHTML\s*=/u,
  /WebAssembly\.compile/u,
  /import\s*\(\s*["']https?:/u,
];
for (const target of ['chromium', 'edge', 'firefox', 'firefox-android']) {
  const dir = join(root, 'dist', target);
  for (const file of await walk(dir)) {
    if (!/\.(?:js|json|html)$/u.test(file)) continue;
    const content = await readFile(file, 'utf8');
    for (const pattern of forbidden)
      if (pattern.test(content)) throw new Error(`Prohibited operation ${pattern} in ${file}`);
  }
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  const denied = [
    'cookies',
    'history',
    'webRequest',
    'declarativeNetRequest',
    'nativeMessaging',
    'downloads',
    'clipboardRead',
    'clipboardWrite',
    'debugger',
    'management',
  ];
  for (const permission of manifest.permissions ?? [])
    if (denied.includes(permission)) throw new Error(`Forbidden permission ${permission}`);
}
console.log('security scan ok');
async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(path)));
    else result.push(path);
  }
  return result.sort();
}
