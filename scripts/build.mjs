import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
run('node', ['scripts/generate-build-fingerprint.mjs']);
run('node', ['scripts/vendor-fonts.mjs']);
run('node', ['scripts/validate-schemas.mjs']);
run('node', ['scripts/validate-profiles.mjs']);
await rm(join(root, 'dist'), { recursive: true, force: true });
run('node', ['scripts/generate-manifests.mjs']);
for (const target of ['chromium', 'edge', 'firefox', 'firefox-android']) {
  const out = join(root, 'dist', target);
  await mkdir(out, { recursive: true });
  const browserTarget = target.startsWith('firefox') ? 'firefox140' : 'chrome121';
  await build({
    entryPoints: { background: join(root, 'src/background/index.ts') },
    outfile: join(out, 'background.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: browserTarget,
    sourcemap: false,
    minify: true,
    legalComments: 'none',
    define: {
      __RTLX_FIREFOX__: target.startsWith('firefox') ? 'true' : 'false',
    },
  });
  await build({
    entryPoints: { content: join(root, 'src/content/index.ts') },
    outfile: join(out, 'content.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: browserTarget,
    sourcemap: false,
    minify: true,
    legalComments: 'none',
    define: { __RTLX_CLOSED_SHADOW_API__: target.startsWith('firefox') ? 'false' : 'true' },
  });
  const uiEntryPoints = {
    'popup/index': join(root, 'src/ui/popup/index.ts'),
  };
  await build({
    entryPoints: uiEntryPoints,
    outdir: out,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: browserTarget,
    sourcemap: false,
    minify: true,
    legalComments: 'none',
  });
  await cp(join(root, 'src/ui/popup/index.html'), join(out, 'popup/index.html'));
  await cp(join(root, 'src/ui/popup/styles.css'), join(out, 'popup/styles.css'));
  for (const pair of [
    ['assets/icons', 'icons'],
    ['assets/fonts', 'fonts'],
    ['assets/licenses', 'licenses'],
    ['_locales', '_locales'],
    ['profiles', 'profiles'],
    ['registries', 'registries'],
    ['schemas', 'schemas'],
  ])
    await cp(join(root, pair[0]), join(out, pair[1]), { recursive: true });
}
run('node', ['scripts/generate-package-integrity.mjs']);
run('node', ['scripts/verify-fonts.mjs']);
run('node', ['scripts/validate-manifests.mjs']);
console.log('build complete');
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, TZ: 'UTC', LC_ALL: 'C' },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
