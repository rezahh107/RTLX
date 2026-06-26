import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expectedObservation } from '../../src/background/failure-report-analysis';
import { BUILD_FLAVOR } from '../../src/shared/constants';

const FONT_BINARY_PATTERN = /\.(?:woff2?|ttf|otf)$/iu;
const SKIPPED_DIRECTORIES = new Set([
  '.git',
  '.github',
  'coverage',
  'dist',
  'node_modules',
  'release-packages',
]);

function trackedFontBinaries(root: string): readonly string[] {
  const found: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory)) {
      if (SKIPPED_DIRECTORIES.has(entry)) continue;
      const absolute = join(directory, entry);
      const stats = statSync(absolute);
      if (stats.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (FONT_BINARY_PATTERN.test(entry))
        found.push(relative(root, absolute).replaceAll('\\', '/'));
    }
  };
  visit(root);
  return Object.freeze(found.sort());
}

describe('v15.9.12 no-font release invariants', () => {
  it('keeps the runtime build flavor explicitly no-font-binaries', () => {
    expect(BUILD_FLAVOR).toBe('no-font-binaries');
  });

  it('does not track distributable font binaries in source-controlled project directories', () => {
    expect(trackedFontBinaries(process.cwd())).toEqual([]);
  });

  it('does not claim bundled Vazirmatn or Inter fallback in no-font report text', () => {
    const observation = expectedObservation(
      {
        bidiIsolation: true,
        directionCorrection: true,
        latinFont: 'amazon-ember-local',
        persianFont: 'local-first',
        siteMode: 'auto-safe',
        typography: true,
      },
      'no-font-binaries'
    );
    expect(observation).toContain('no-font-binaries build does not package Vazirmatn');
    expect(observation).toContain('no-font-binaries build does not package Inter');
    expect(observation).not.toContain('bundled Vazirmatn fallback');
    expect(observation).not.toContain('bundled Inter fallback');
  });

  it('keeps the checked-in font asset directory manifest-only when present', () => {
    const manifestPath = join(process.cwd(), 'assets/fonts/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      fontBinariesIncluded?: boolean;
    };
    expect(manifest.fontBinariesIncluded).toBe(false);
  });
});
