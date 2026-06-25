import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { format } from 'prettier';
const require = createRequire(import.meta.url);
const fontkit = require('fontkit');

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outDir = join(root, 'assets/fonts');
await mkdir(outDir, { recursive: true });
const specs = [
  {
    package: '@fontsource/vazirmatn',
    source: 'vazirmatn-arabic-400-normal.woff2',
    family: 'Vazirmatn',
    weight: 400,
    subset: 'arabic',
  },
  {
    package: '@fontsource/vazirmatn',
    source: 'vazirmatn-arabic-600-normal.woff2',
    family: 'Vazirmatn',
    weight: 600,
    subset: 'arabic',
  },
  {
    package: '@fontsource/inter',
    source: 'inter-latin-400-normal.woff2',
    family: 'Inter',
    weight: 400,
    subset: 'latin',
  },
  {
    package: '@fontsource/inter',
    source: 'inter-latin-600-normal.woff2',
    family: 'Inter',
    weight: 600,
    subset: 'latin',
  },
];
const entries = [];
const css = [];
for (const spec of specs) {
  const source = join(root, 'node_modules', spec.package, 'files', spec.source);
  const destination = join(outDir, spec.source);
  await copyFile(source, destination);
  const bytes = await readFile(destination);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const font = fontkit.openSync(destination);
  const unicodeRange = toUnicodeRanges(filterCodePoints(font.characterSet, spec.subset));
  entries.push({
    file: spec.source,
    family: spec.family,
    weight: spec.weight,
    subset: spec.subset,
    format: 'woff2',
    sha256,
    bytes: bytes.byteLength,
    unicodeRange,
    license: 'SIL-OFL-1.1',
    sourcePackage: spec.package,
    sourcePackageVersion: '5.2.8',
  });
  css.push(
    `@font-face{font-family:"RTLX Mixed Text";src:url("__EXTENSION_FONT_ROOT__${spec.source}") format("woff2");font-weight:${spec.weight};font-style:normal;font-display:swap;unicode-range:${unicodeRange}}`
  );
}
entries.sort((a, b) => a.file.localeCompare(b.file, 'en'));
const manifest = {
  schemaVersion: '1.0.0',
  manifestVersion: 1,
  generated: true,
  files: entries,
  status: 'generated_from_pinned_packages',
  changelog: ['1.0.0 deterministic manifest contract'],
  forwardCompatibility:
    'Hash or font-version changes require manifest regeneration and fixture review.',
};
await writeFile(
  join(outDir, 'manifest.json'),
  await format(JSON.stringify(manifest), { parser: 'json' }),
  'utf8'
);
await writeFile(
  join(root, 'src/shared/generated-font-css.ts'),
  await format(
    `// Generated deterministically by scripts/vendor-fonts.mjs.\nexport const GENERATED_FONT_CSS = ${JSON.stringify(css.join('\\n'))};\n`,
    { parser: 'typescript' }
  ),
  'utf8'
);
for (const packageName of ['@fontsource/vazirmatn', '@fontsource/inter']) {
  const licenseSource = join(root, 'node_modules', packageName, 'LICENSE');
  const packageShort = packageName.split('/').at(-1);
  await copyFile(licenseSource, join(root, 'assets/licenses', `${packageShort}-OFL.txt`));
}

function filterCodePoints(codePoints, subset) {
  if (subset !== 'arabic') return codePoints;
  return codePoints.filter(
    (value) =>
      (value >= 0x0600 && value <= 0x06ff) ||
      (value >= 0x0750 && value <= 0x077f) ||
      (value >= 0x08a0 && value <= 0x08ff) ||
      (value >= 0xfb50 && value <= 0xfdff) ||
      (value >= 0xfe70 && value <= 0xfeff) ||
      value === 0x200c ||
      value === 0x200d
  );
}

function toUnicodeRanges(codePoints) {
  const sorted = [...new Set(codePoints)].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let previous = sorted[0];
  for (const value of sorted.slice(1)) {
    if (value === previous + 1) {
      previous = value;
      continue;
    }
    ranges.push([start, previous]);
    start = value;
    previous = value;
  }
  if (start !== undefined) ranges.push([start, previous]);
  return ranges
    .map(([a, b]) =>
      a === b
        ? `U+${a.toString(16).toUpperCase()}`
        : `U+${a.toString(16).toUpperCase()}-${b.toString(16).toUpperCase()}`
    )
    .join(',');
}
