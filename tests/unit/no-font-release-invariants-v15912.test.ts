import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expectedObservation } from '../../src/background/failure-report-analysis';
import { BUILD_FLAVOR } from '../../src/shared/constants';

const FONT_BINARY_PATTERN = /\.(?:woff2?|ttf|otf)$/iu;
function trackedFontBinaries(root: string): readonly string[] {
  try {
    return Object.freeze(
      execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
        .split('\n')
        .filter((entry) => FONT_BINARY_PATTERN.test(entry))
        .sort()
    );
  } catch {
    return Object.freeze([]);
  }
}

function checkedInFontManifest(root: string): string {
  try {
    return execFileSync('git', ['show', 'HEAD:assets/fonts/manifest.json'], {
      cwd: root,
      encoding: 'utf8',
    });
  } catch {
    return readFileSync(join(root, 'assets/fonts/manifest.json'), 'utf8');
  }
}

describe('v15.9.12 no-font release invariants', () => {
  it('keeps the runtime build flavor explicitly source-no-font-binaries', () => {
    expect(BUILD_FLAVOR).toBe('source-no-font-binaries');
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
      'source-no-font-binaries'
    );
    expect(observation).toContain('source repository does not track vendored Vazirmatn binaries');
    expect(observation).toContain('source repository does not track vendored Inter binaries');
    expect(observation).not.toContain('bundled Vazirmatn fallback');
    expect(observation).not.toContain('bundled Inter fallback');
  });

  it('keeps the checked-in font asset directory manifest-only when present', () => {
    const manifest = JSON.parse(checkedInFontManifest(process.cwd())) as {
      fontBinariesIncluded?: boolean;
    };
    expect(manifest.fontBinariesIncluded).toBe(false);
  });
});
