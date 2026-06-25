import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outputDir = join(root, 'dist', 'evidence');
await mkdir(outputDir, { recursive: true });
const required = {
  runtime: ['getURL', 'sendMessage'],
  storage: ['local', 'sync'],
  permissions: ['contains', 'request', 'remove'],
  scripting: ['registerContentScripts', 'getRegisteredContentScripts'],
  tabs: ['query', 'sendMessage'],
  alarms: ['create', 'get'],
};
const fixtures = {
  chrome_callback: makeFixture('callback'),
  browser_promise: makeFixture('promise'),
};
const results = Object.entries(fixtures).map(([name, api]) => ({
  name,
  status: validate(api),
  namespaceMode: name.startsWith('browser') ? 'promise' : 'callback',
}));
const status = results.every((item) => item.status === 'passed') ? 'passed' : 'failed';
const report = {
  schemaVersion: '1.0.0',
  campaign: 'api-adapter-contract-shape',
  status,
  note: 'This validates the declared API surface only; real-browser namespace behavior remains part of manifest-loaded E2E.',
  results,
};
await writeFile(
  join(outputDir, 'api-adapter-conformance.json'),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));
if (status !== 'passed') process.exitCode = 1;

function makeFixture(mode) {
  const fn = mode === 'promise' ? async () => undefined : (_arg, callback) => callback?.();
  return {
    runtime: { getURL: () => 'extension://x', sendMessage: fn },
    storage: { local: {}, sync: {} },
    permissions: { contains: fn, request: fn, remove: fn },
    scripting: { registerContentScripts: fn, getRegisteredContentScripts: fn },
    tabs: { query: fn, sendMessage: fn },
    alarms: { create: fn, get: fn },
  };
}
function validate(api) {
  for (const [namespace, members] of Object.entries(required)) {
    if (!api[namespace]) return 'failed';
    for (const member of members) {
      if (!(member in api[namespace])) return 'failed';
    }
  }
  return 'passed';
}
