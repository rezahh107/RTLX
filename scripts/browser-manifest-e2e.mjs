/* global clearTimeout, fetch, WebSocket, setTimeout */
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createServer as createTcpServer } from 'node:net';
import { unzipSync } from 'fflate';
import { redactEvidence, sanitizeProcessOutput } from './evidence-redaction-core.mjs';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const browserName = process.argv[2] ?? 'chromium';
const soakIterations = Math.max(
  1,
  Math.min(10_000, Number.parseInt(process.env.RTLX_SOAK_ITERATIONS ?? '1', 10) || 1)
);
class InsufficientEvidence extends Error {}

let currentStage = 'harness_start';
const report = {
  schemaVersion: '1.0.0',
  browser: browserName,
  mode: 'manifest-loaded-unpacked-extension',
  status: 'not_run',
  evidence: {},
  blockingReasons: [],
};

if (!['chromium', 'edge', 'firefox'].includes(browserName)) {
  throw new Error(`Unsupported browser target: ${browserName}`);
}

if (browserName === 'firefox') {
  const firefox = resolveBinary('FIREFOX_BIN', ['firefox', 'firefox-esr']);
  if (!firefox) finishInsufficient('Firefox executable unavailable');
  finishInsufficient(
    'Firefox manifest-loaded interaction harness requires a WebDriver-capable environment; static manifest and web-ext lint remain available'
  );
}

const executable =
  browserName === 'edge'
    ? resolveBinary('EDGE_BIN', ['microsoft-edge', 'microsoft-edge-stable', 'msedge'])
    : resolveBinary('CHROMIUM_BIN', [
        '/usr/lib/chromium/chromium',
        'chromium',
        'google-chrome',
        'google-chrome-stable',
      ]);
if (!executable) finishInsufficient(`${browserName} executable unavailable`);

const extensionSource = await resolveExtensionSource(browserName);
const extensionDir = extensionSource.extensionDir;
report.mode = extensionSource.mode;
report.evidence.artifact = extensionSource.evidence;
if (!existsSync(join(extensionDir, 'manifest.json'))) {
  throw new Error(`Build output unavailable: ${extensionDir}`);
}

const fixture = `<!doctype html>
<html><head><meta charset="utf-8"><title>RTLX manifest E2E</title></head><body>
<main id="content" lang="fa">این یک متن فارسی برای آزمون RTLX با API v1.2 و https://example.com است.<pre><code>npm test</code></pre><span role="math">x = y + 1</span></main>
<button id="control" aria-label="Copy">Copy</button>
<div id="shadow-host"></div><iframe id="fallback-frame" src="about:blank"></iframe>
<script>
  window.__rtlxLifecycleEvents = [];
  addEventListener('pagehide', (event) => window.__rtlxLifecycleEvents.push(['pagehide', event.persisted]));
  addEventListener('pageshow', (event) => window.__rtlxLifecycleEvents.push(['pageshow', event.persisted]));
  const root = document.querySelector('#shadow-host').attachShadow({ mode: 'open' });
  root.innerHTML = '<section id="shadow-content" lang="fa">متن فارسی در شَدو DOM با API v2.0</section>';
  const frame = document.querySelector('#fallback-frame');
  frame.addEventListener('load', () => {
    const doc = frame.contentDocument;
    if (!doc || doc.body?.children.length) return;
    doc.open();
    doc.write('<!doctype html><html><body><main id="frame-content" lang="fa">متن فارسی در فریم about:blank با API v3.0</main></body></html>');
    doc.close();
  });
  window.__rtlxLongTasks = [];
  window.__rtlxCls = 0;
  try {
    new PerformanceObserver((list) => window.__rtlxLongTasks.push(...list.getEntries().map((entry) => entry.duration))).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__rtlxCls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  window.__rtlxSpaUpdate = (index = 0) => {
    history.pushState({}, '', '/fixture/spa/' + index);
    const paragraph = document.createElement('p');
    paragraph.id = index === 0 ? 'spa-content' : 'spa-content-' + index;
    paragraph.dataset.rtlxSoak = 'true';
    paragraph.lang = 'fa';
    paragraph.textContent = 'محتوای فارسی پویا با API v4.0 دور ' + index;
    const content = document.querySelector('#content');
    content.append(paragraph);
    const generated = content.querySelectorAll('[data-rtlx-soak="true"]');
    if (generated.length > 5) generated[0].remove();
    return paragraph.id;
  };
</script>
</body></html>`;
const other = '<!doctype html><html><body><p>Other page</p></body></html>';
const server = createServer((request, response) => {
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(request.url?.startsWith('/fixture') ? fixture : other);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Fixture server unavailable');
const fixtureUrl = `http://127.0.0.1:${address.port}/fixture`;
const originPattern = `http://127.0.0.1:${address.port}/*`;
const profileDir = await mkdtemp(join(tmpdir(), `rtlx-${browserName}-manifest-`));
const debugPort = await freePort();
let stderr = '';
const invocation = browserInvocation(executable, [
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-background-networking',
  '--disable-component-update',
  '--no-proxy-server',
  '--proxy-bypass-list=<-loopback>',
  '--no-first-run',
  '--password-store=basic',
  '--enable-logging=stderr',
  '--v=1',
  '--remote-debugging-address=127.0.0.1',
  `--remote-debugging-port=${debugPort}`,
  '--remote-allow-origins=*',
  `--user-data-dir=${profileDir}`,
  `--disable-extensions-except=${extensionDir}`,
  `--load-extension=${extensionDir}`,
  'about:blank',
]);
const browser = spawn(invocation.command, invocation.args, {
  stdio: ['ignore', 'ignore', 'pipe'],
  detached: true,
});
browser.stderr?.on('data', (chunk) => {
  stderr += String(chunk);
  if (stderr.length > 200_000) stderr = stderr.slice(-200_000);
});

let browserCdp;
try {
  const version = await waitForJson(`http://127.0.0.1:${debugPort}/json/version`, 20_000);
  report.evidence.browserVersion = version.Browser;
  browserCdp = await connectCdp(version.webSocketDebuggerUrl);
  const serviceWorker = await waitForExtensionTarget(browserCdp, 8_000);
  if (!serviceWorker) {
    if (/Loading of unpacked extensions is disabled by the administrator/iu.test(stderr)) {
      throw new InsufficientEvidence(
        'Unpacked extensions are disabled by browser administrator policy'
      );
    }
    throw new Error('Extension service worker target did not start');
  }
  const extensionId = new URL(serviceWorker.url).hostname;
  report.evidence.extensionId = extensionId;
  report.evidence.serviceWorkerStarted = true;

  currentStage = 'popup_open';
  const popupUrl = `chrome-extension://${extensionId}/popup/index.html`;
  await browserCdp.send('Target.createTarget', { url: popupUrl });
  const popupTarget = await waitForPageTarget(debugPort, popupUrl, 8_000);
  const popupCdp = await connectCdp(popupTarget.webSocketDebuggerUrl);
  await popupCdp.send('Runtime.enable');
  currentStage = 'optional_host_permission_request';
  const granted = await evaluate(
    popupCdp,
    `new Promise((resolve) => chrome.permissions.request({ origins: [${JSON.stringify(
      originPattern
    )}] }, resolve))`,
    true
  );
  assert(granted === true, 'Optional host permission was not granted');
  report.evidence.optionalHostPermission = 'granted';

  currentStage = 'fixture_navigation';
  await browserCdp.send('Target.createTarget', { url: fixtureUrl });
  const pageTarget = await waitForPageTarget(debugPort, fixtureUrl, 8_000);
  const pageCdp = await connectCdp(pageTarget.webSocketDebuggerUrl);
  await pageCdp.send('Runtime.enable');
  await pageCdp.send('Page.enable');
  await waitForCondition(
    async () =>
      evaluate(pageCdp, `document.querySelector('#content')?.getAttribute('dir') === 'rtl'`),
    8_000
  );
  currentStage = 'initial_runtime_assertions';
  const initial = await evaluate(
    pageCdp,
    `(() => ({
      htmlDir: document.documentElement.getAttribute('dir'),
      bodyDir: document.body.getAttribute('dir'),
      mainDir: document.querySelector('#content')?.getAttribute('dir'),
      codeDir: document.querySelector('code')?.getAttribute('dir'),
      mathDir: document.querySelector('[role="math"]')?.getAttribute('dir'),
      accessibleName: document.querySelector('#control')?.getAttribute('aria-label'),
      stylePresent: Boolean(document.querySelector('#rtlx-v17-style')),
      wrappers: document.querySelectorAll('.rtlx-owned-bdi').length,
      shadowDir: document.querySelector('#shadow-host')?.shadowRoot?.querySelector('#shadow-content')?.getAttribute('dir') ?? null,
      frameDir: document.querySelector('#fallback-frame')?.contentDocument?.querySelector('#frame-content')?.getAttribute('dir') ?? null
    }))()`
  );
  assert(initial.htmlDir === null && initial.bodyDir === null, 'html/body direction mutated');
  assert(initial.mainDir === 'rtl', 'Persian content did not receive semantic rtl');
  assert(initial.codeDir === 'ltr', 'Code protection did not preserve LTR');
  assert(initial.accessibleName === 'Copy', 'Accessible name changed');
  assert(initial.stylePresent === true, 'Owned typography stylesheet missing');
  report.evidence.initial = initial;

  await pageCdp.send('Performance.enable');
  const heapBefore = await pageCdp.send('Runtime.getHeapUsage');
  const domBefore = await pageCdp.send('Memory.getDOMCounters');
  await evaluate(pageCdp, `window.__rtlxSpaUpdate(0)`);
  await waitForCondition(
    async () =>
      evaluate(pageCdp, `document.querySelector('#spa-content')?.getAttribute('dir') === 'rtl'`),
    8_000
  );
  for (let index = 1; index < soakIterations; index += 1) {
    const id = await evaluate(pageCdp, `window.__rtlxSpaUpdate(${index})`);
    await waitForCondition(
      async () =>
        evaluate(
          pageCdp,
          `document.getElementById(${JSON.stringify(id)})?.getAttribute('dir') === 'rtl'`
        ),
      8_000
    );
  }
  const heapAfter = await pageCdp.send('Runtime.getHeapUsage');
  const domAfter = await pageCdp.send('Memory.getDOMCounters');
  const pageMetrics = await evaluate(
    pageCdp,
    `({ longTaskCount: window.__rtlxLongTasks.length, longTaskTotalMs: window.__rtlxLongTasks.reduce((sum, value) => sum + value, 0), cls: window.__rtlxCls })`
  );
  report.evidence.spaMutation = 'processed';
  report.evidence.soak = {
    iterations: soakIterations,
    heapUsedBefore: heapBefore.usedSize,
    heapUsedAfter: heapAfter.usedSize,
    heapUsedDelta: heapAfter.usedSize - heapBefore.usedSize,
    documentsBefore: domBefore.documents,
    documentsAfter: domAfter.documents,
    nodesBefore: domBefore.nodes,
    nodesAfter: domAfter.nodes,
    nodeDelta: domAfter.nodes - domBefore.nodes,
    jsEventListenersBefore: domBefore.jsEventListeners,
    jsEventListenersAfter: domAfter.jsEventListeners,
    listenerDelta: domAfter.jsEventListeners - domBefore.jsEventListeners,
    ...pageMetrics,
  };

  const refreshedWorker = await waitForExtensionTarget(browserCdp, 4_000);
  assert(refreshedWorker, 'Service worker unavailable before runtime snapshot');
  const workerCdp = await connectCdp(refreshedWorker.webSocketDebuggerUrl);
  await workerCdp.send('Runtime.enable');
  currentStage = 'runtime_snapshot';
  const snapshot = await evaluate(
    workerCdp,
    `new Promise((resolve) => chrome.tabs.query({ url: ${JSON.stringify(
      originPattern
    )} }, (tabs) => chrome.tabs.sendMessage(tabs[0].id, { type: 'RTLX_RUNTIME_SNAPSHOT' }, resolve)))`
  );
  assert(snapshot?.schemaVersion === '1.1.0', 'Runtime snapshot schema mismatch');
  assert(snapshot.performance, 'Runtime performance aggregates unavailable');
  report.evidence.runtimeSnapshot = snapshot;
  workerCdp.close();

  currentStage = 'optional_host_permission_remove';
  const removed = await evaluate(
    popupCdp,
    `new Promise((resolve) => chrome.permissions.remove({ origins: [${JSON.stringify(
      originPattern
    )}] }, resolve))`,
    true
  );
  assert(removed === true, 'Optional host permission was not removed');
  await waitForCondition(
    async () =>
      evaluate(pageCdp, `document.querySelector('#content')?.getAttribute('dir') === null`),
    8_000
  );
  report.evidence.permissionRevocationRollback = 'pass';

  currentStage = 'optional_host_permission_restore';
  const restored = await evaluate(
    popupCdp,
    `new Promise((resolve) => chrome.permissions.request({ origins: [${JSON.stringify(
      originPattern
    )}] }, resolve))`,
    true
  );
  assert(restored === true, 'Optional host permission was not restored');
  await pageCdp.send('Page.reload', { ignoreCache: true });
  await waitForCondition(
    async () =>
      evaluate(pageCdp, `document.querySelector('#content')?.getAttribute('dir') === 'rtl'`),
    8_000
  );
  report.evidence.permissionRestore = 'pass';

  currentStage = 'service_worker_restart';
  const oldWorkerId = refreshedWorker.targetId;
  await browserCdp.send('Target.closeTarget', { targetId: oldWorkerId });
  await browserCdp.send('Target.createTarget', { url: popupUrl });
  const restartedWorker = await waitForExtensionTarget(browserCdp, 8_000, oldWorkerId);
  assert(restartedWorker, 'Service worker did not restart after termination');
  const restartedContext = await evaluate(
    popupCdp,
    `new Promise((resolve) => chrome.runtime.sendMessage({ type: 'REQUEST_CONTEXT', requestId: crypto.randomUUID(), payload: { hostname: '127.0.0.1', pathname: '/fixture' } }, resolve))`,
    true
  );
  assert(restartedContext?.success === true, 'REQUEST_CONTEXT failed after service-worker restart');
  assert(
    restartedContext?.data?.global,
    'REQUEST_CONTEXT returned no global settings after restart'
  );
  report.evidence.serviceWorkerRestart = 'pass';
  report.evidence.contextAfterServiceWorkerRestart = 'pass';

  currentStage = 'completed';
  report.status = 'pass';
  emitReport();
  popupCdp.close();
  pageCdp.close();
} catch (error) {
  const policyBlocked = /Loading of unpacked extensions is disabled by the administrator/iu.test(
    stderr
  );
  report.failedStage = currentStage;
  report.status =
    error instanceof InsufficientEvidence || policyBlocked ? 'insufficient_evidence' : 'failed';
  report.blockingReasons.push(
    policyBlocked
      ? 'Unpacked extensions are disabled by browser administrator policy'
      : error instanceof Error
        ? error.message
        : String(error)
  );
  const stderrSummary = sanitizeProcessOutput(stderr);
  report.evidence.stderrTail = stderrSummary.tail;
  report.evidence.stderrRedaction = stderrSummary;
  emitReport();
  process.exitCode = error instanceof InsufficientEvidence || policyBlocked ? 2 : 1;
} finally {
  browserCdp?.close();
  server.close();
  terminateProcessGroup(browser.pid);
  await delay(500);
  terminateProcessGroup(browser.pid, 'SIGKILL');
  await rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  await extensionSource.cleanup();
}

function finishInsufficient(reason) {
  report.status = 'insufficient_evidence';
  report.blockingReasons.push(reason);
  emitReport();
  process.exit(2);
}

function emitReport() {
  const redacted = redactEvidence(report);
  console.log(JSON.stringify(redacted, null, 2));
  return redacted;
}

function browserInvocation(binary, args) {
  if (process.platform === 'win32') return { command: binary, args };
  if (process.env.RTLX_USE_CURRENT_DISPLAY === '1' || !hasCommand('xvfb-run'))
    return { command: binary, args };
  return { command: 'xvfb-run', args: ['-a', binary, ...args] };
}

function resolveBinary(environmentName, candidates) {
  const explicit = process.env[environmentName];
  if (explicit && existsSync(explicit)) return explicit;
  for (const candidate of candidates) {
    if (candidate.startsWith('/') && existsSync(candidate)) return candidate;
    const locator = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(locator, [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  return null;
}

function hasCommand(command) {
  const locator = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(locator, [command], { stdio: 'ignore' }).status === 0;
}

async function waitForExtensionTarget(cdp, timeoutMs, excludedTargetId) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { targetInfos } = await cdp.send('Target.getTargets');
    const target = targetInfos.find(
      (item) =>
        item.type === 'service_worker' &&
        item.url.startsWith('chrome-extension://') &&
        item.targetId !== excludedTargetId
    );
    if (target) return target;
    await delay(100);
  }
  return null;
}

async function waitForPageTarget(port, url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) =>
      response.json()
    );
    const target = targets.find((item) => item.type === 'page' && item.url === url);
    if (target) return target;
    await delay(100);
  }
  throw new Error(`Page target unavailable: ${url}`);
}

async function waitForJson(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {
      // Browser is still starting.
    }
    await delay(100);
  }
  throw new Error(`DevTools endpoint unavailable: ${url}`);
}

async function waitForCondition(check, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return;
    await delay(100);
  }
  throw new Error('Browser condition timed out');
}

async function connectCdp(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    clearTimeout(handler.timer);
    if (message.error) handler.reject(new Error(message.error.message));
    else handler.resolve(message.result);
  });
  socket.addEventListener('close', () => {
    for (const [messageId, handler] of pending) {
      pending.delete(messageId);
      clearTimeout(handler.timer);
      handler.reject(
        new Error(`CDP connection closed while waiting for message ${String(messageId)}`)
      );
    }
  });
  return {
    send(method, params = {}) {
      const messageId = ++id;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(messageId);
          reject(new Error(`CDP command timed out: ${method}`));
        }, 30_000);
        pending.set(messageId, { resolve, reject, timer });
        socket.send(JSON.stringify({ id: messageId, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate(cdp, expression, userGesture = false) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

function terminateProcessGroup(pid, signal = 'SIGTERM') {
  if (!pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', signal === 'SIGKILL' ? '/F' : ''], {
      stdio: 'ignore',
    });
    return;
  }
  try {
    process.kill(-pid, signal);
  } catch {
    // Process already exited.
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function freePort() {
  const socket = createTcpServer();
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolve);
  });
  const address = socket.address();
  if (!address || typeof address === 'string') throw new Error('Unable to allocate debug port');
  await new Promise((resolve) => socket.close(resolve));
  return address.port;
}

async function resolveExtensionSource(target) {
  const explicitDirectory = process.env.RTLX_EXTENSION_DIR;
  if (explicitDirectory) {
    const directory = resolve(explicitDirectory);
    return {
      extensionDir: directory,
      mode: 'manifest-loaded-explicit-directory',
      evidence: {
        kind: 'directory',
        pathBasename: basename(directory),
        manifestSha256: await sha256File(join(directory, 'manifest.json')),
      },
      cleanup: async () => undefined,
    };
  }
  const artifact = process.env.RTLX_EXTENSION_ARTIFACT;
  if (!artifact) {
    const directory = join(root, 'dist', target);
    return {
      extensionDir: directory,
      mode: 'manifest-loaded-build-directory',
      evidence: {
        kind: 'build_directory',
        pathBasename: `dist/${target}`,
        manifestSha256: existsSync(join(directory, 'manifest.json'))
          ? await sha256File(join(directory, 'manifest.json'))
          : null,
      },
      cleanup: async () => undefined,
    };
  }
  const artifactPath = resolve(artifact);
  if (!existsSync(artifactPath)) throw new Error(`Release artifact unavailable: ${artifactPath}`);
  const bytes = new Uint8Array(await readFile(artifactPath));
  const expectedName = `rtlx-${target}-`;
  if (!basename(artifactPath).startsWith(expectedName)) {
    throw new Error(`Artifact target mismatch: expected filename prefix ${expectedName}`);
  }
  const extractedRoot = await mkdtemp(join(tmpdir(), `rtlx-${target}-artifact-`));
  const entries = unzipSync(bytes);
  const names = Object.keys(entries).sort();
  for (const name of names) {
    const normalized = normalize(name).replaceAll('\\', '/');
    if (
      normalized.startsWith('../') ||
      normalized.includes('/../') ||
      normalized.startsWith('/') ||
      normalized.includes('\0')
    ) {
      throw new Error(`Unsafe archive entry: ${name}`);
    }
    if (name.endsWith('/')) continue;
    const output = resolve(extractedRoot, normalized);
    const rel = relative(extractedRoot, output);
    if (rel.startsWith('..') || rel.includes(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
      throw new Error(`Archive entry escapes extraction root: ${name}`);
    }
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, entries[name]);
  }
  if (!existsSync(join(extractedRoot, 'manifest.json'))) {
    await rm(extractedRoot, { recursive: true, force: true });
    throw new Error('Release artifact does not contain manifest.json at archive root');
  }
  return {
    extensionDir: extractedRoot,
    mode: 'manifest-loaded-exact-release-artifact',
    evidence: {
      kind: 'release_zip',
      filename: basename(artifactPath),
      sha256: createHash('sha256').update(bytes).digest('hex'),
      entries: names.length,
      manifestSha256: await sha256File(join(extractedRoot, 'manifest.json')),
    },
    cleanup: () => rm(extractedRoot, { recursive: true, force: true, maxRetries: 10 }),
  };
}

async function sha256File(path) {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}
