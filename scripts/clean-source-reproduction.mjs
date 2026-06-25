import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir, platform, release, arch } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { redactEvidence, sanitizeProcessOutput } from './evidence-redaction-core.mjs';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const outputDir = join(root, 'dist', 'evidence');
await mkdir(outputDir, { recursive: true });
const artifactDir = join(root, 'dist', 'artifacts');
const targets = ['chromium', 'edge', 'firefox', 'firefox-android'];
const releaseArtifacts = Object.fromEntries(
  await Promise.all(
    targets.map(async (target) => {
      const file = `rtlx-${target}-${packageJson.version}.zip`;
      const path = join(artifactDir, file);
      return [target, existsSync(path) ? await sha256File(path) : null];
    })
  )
);
const report = {
  schemaVersion: '1.0.0',
  release: packageJson.version,
  campaign: 'clean-source-reproduction',
  status: 'not_run',
  cleanBuildMethod:
    'copy source excluding node_modules/dist, npm ci --ignore-scripts, npm run build:release',
  dependencyInstallMethod: 'npm ci --ignore-scripts using package-lock.json',
  os: { platform: platform(), release: release(), arch: arch() },
  releaseArtifacts,
  rebuiltArtifacts: {},
  hashComparison: {},
  blockingReasons: [],
};
let tmpRoot;
try {
  if (Object.values(releaseArtifacts).some((hash) => hash === null)) {
    report.status = 'insufficient_evidence';
    report.blockingReasons.push(
      'Release artifacts are unavailable; run npm run build:release first'
    );
  } else {
    tmpRoot = await mkdtemp(join(tmpdir(), 'rtlx-clean-repro-'));
    const cleanProject = join(tmpRoot, 'project');
    await copyProject(root, cleanProject);
    const install = run('npm', ['ci', '--ignore-scripts'], cleanProject, 240_000);
    if (install.status !== 0) {
      report.status = 'insufficient_evidence';
      report.blockingReasons.push('Clean dependency installation did not complete');
      report.install = summarizeRun(install);
    } else {
      report.install = summarizeRun(install);
      const build = run('npm', ['run', 'build:release'], cleanProject, 240_000);
      report.build = summarizeRun(build);
      if (build.status !== 0) {
        report.status = 'failed';
        report.blockingReasons.push('Clean release build failed');
      } else {
        for (const target of targets) {
          const file = `rtlx-${target}-${packageJson.version}.zip`;
          const rebuiltPath = join(cleanProject, 'dist', 'artifacts', file);
          report.rebuiltArtifacts[target] = existsSync(rebuiltPath)
            ? await sha256File(rebuiltPath)
            : null;
          report.hashComparison[target] =
            releaseArtifacts[target] !== null &&
            report.rebuiltArtifacts[target] === releaseArtifacts[target]
              ? 'match'
              : 'mismatch';
        }
        const allMatch = Object.values(report.hashComparison).every((value) => value === 'match');
        report.status = allMatch ? 'passed' : 'failed';
        if (!allMatch)
          report.blockingReasons.push(
            'At least one rebuilt artifact hash differs from release artifact hash'
          );
      }
    }
  }
} catch (error) {
  report.status = 'insufficient_evidence';
  report.blockingReasons.push(error instanceof Error ? error.message : String(error));
} finally {
  if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
const finalReport = redactEvidence(report);
await writeFile(
  join(outputDir, 'clean-source-reproduction.json'),
  JSON.stringify(finalReport, null, 2) + '\n'
);
console.log(JSON.stringify(finalReport, null, 2));
process.exitCode = finalReport.status === 'passed' ? 0 : finalReport.status === 'failed' ? 1 : 2;

async function copyProject(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    await cp(from, to, { recursive: true, dereference: false, preserveTimestamps: true });
  }
}

function run(command, args, cwd, timeout) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, TZ: 'UTC', LC_ALL: 'C' },
  });
}

function summarizeRun(result) {
  return {
    commandStatus: result.status,
    signal: result.signal ?? null,
    errorCode: result.error?.code ?? null,
    stdout: sanitizeProcessOutput(result.stdout),
    stderr: sanitizeProcessOutput(result.stderr),
  };
}

async function sha256File(path) {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}
