/* global fetch, WebSocket, setTimeout */
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const contentBundle = await readFile(
  new URL('../dist/chromium/content.js', import.meta.url),
  'utf8'
);
const longTypographySpans = Array.from(
  { length: 121 },
  (_, index) => `<span id="long-${index}">بخش فارسی ${index}</span>`
).join(' ');

const fixture = `<!doctype html><html data-rtlx-runtime-owner="15.9.0:stale-runtime"><head><meta charset="utf-8"><title>RTLX smoke</title><style id="rtlx-v17-style">.stale{display:block}</style><style id="rtlx-direction-style">.stale-direction{direction:rtl}</style></head><body>
<div id="stale-zone" hidden><div id="stale-shell" class="rtlx-owned-candidate rtlx-owned-typography rtlx-direction-rtl" dir="rtl" data-rtlx-dir-owner="15.9.0:stale-runtime"><bdi class="rtlx-owned-bdi" dir="ltr">STALE</bdi></div></div>
<main id="content" lang="fa">این یک متن فارسی برای آزمون RTLX با آدرس https://example.com و API v1.2 است.<pre><code>npm test</code></pre></main>
<button id="control" aria-label="Copy">Copy</button>
<div id="layout-row" style="display:flex;overflow:hidden;gap:8px;align-items:center">
  <span id="layout-text">سلام دنیا</span>
  <button id="layout-action" aria-label="Action"><span id="layout-icon" role="img"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"></circle></svg></span></button>
</div>
<section id="structured" lang="fa">
  <h3 id="structured-heading">عنوان ساختاریافته</h3>
  <p id="structured-paragraph">پاراگراف فارسی با <code>font-family</code></p>
  <ul><li id="structured-item-one"><p>مورد اول با <code id="structured-list-code">package.name</code></p></li><li id="structured-item-two"><div><p>مورد دوم</p></div></li></ul>
  <blockquote id="structured-quote">نقل قول فارسی</blockquote>
  <p id="long-typography">${longTypographySpans}</p>
  <div id="structured-actions" style="display:flex;overflow:hidden"><button aria-label="Structured action"><span id="structured-icon" role="img"><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6"></circle></svg></span></button></div>
</section>
</body></html>`;

const server = createServer((request, response) => {
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(fixture);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Smoke server failed');
const profileDir = await mkdtemp(join(tmpdir(), 'rtlx-v15-chromium-'));
const url = `http://127.0.0.1:${address.port}/fixture`;
const chromium = spawn(
  resolveChromiumBinary(),
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-background-networking',
    '--no-proxy-server',
    '--proxy-bypass-list=<-loopback>',
    '--disable-component-update',
    '--disable-default-apps',
    '--no-first-run',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    url,
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] }
);

try {
  const port = await waitForDevToolsPort(profileDir);
  const target = await waitForPage(port, url);
  const cdp = await connectCdp(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  const frameTree = await cdp.send('Page.getFrameTree');
  await cdp.send('Page.setDocumentContent', {
    frameId: frameTree.frameTree.frame.id,
    html: fixture,
  });
  await delay(50);
  const baseline = await evaluate(
    cdp,
    `(() => ({
      href: location.href,
      readyState: document.readyState,
      htmlDir: document.documentElement.getAttribute('dir'),
      bodyDir: document.body?.getAttribute('dir') ?? null,
      mainExists: Boolean(document.querySelector('main')),
      outer: document.documentElement.outerHTML.slice(0, 320),
      layoutDir: document.querySelector('#layout-row')?.getAttribute('dir'),
      layoutDirection: getComputedStyle(document.querySelector('#layout-row')).direction,
      layoutTextDir: document.querySelector('#layout-text')?.getAttribute('dir'),
      layoutTextDirection: getComputedStyle(document.querySelector('#layout-text')).direction,
      layoutTextClasses: [...document.querySelector('#layout-text').classList],
      layoutClasses: [...document.querySelector('#layout-row').classList],
      iconDirection: getComputedStyle(document.querySelector('#layout-icon')).direction,
      iconRect: (() => { const r = document.querySelector('#layout-icon').getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; })()
    }))()`
  );
  await evaluate(cdp, stubExpression(address.port));
  await evaluate(cdp, contentBundle);
  await delay(1800);

  const initial = await evaluate(
    cdp,
    `(() => ({
    htmlDir: document.documentElement.getAttribute('dir'),
    bodyDir: document.body.getAttribute('dir'),
    mainDir: document.querySelector('main')?.getAttribute('dir'),
    mainOwned: document.querySelector('main')?.classList.contains('rtlx-owned-candidate'),
    codeDir: document.querySelector('code')?.getAttribute('dir'),
    wrappers: document.querySelectorAll('.rtlx-owned-bdi').length,
    accessibleName: document.querySelector('#control')?.getAttribute('aria-label'),
    text: document.querySelector('main')?.textContent,
    listenerCount: globalThis.__rtlxMessageListeners?.length ?? -1,
    errors: globalThis.__rtlxSmokeErrors ?? [],
    stylePresent: Boolean(document.querySelector('#rtlx-v17-style')),
    computedFont: getComputedStyle(document.querySelector('main')).fontFamily,
    layoutDir: document.querySelector('#layout-row')?.getAttribute('dir'),
    layoutDirection: getComputedStyle(document.querySelector('#layout-row')).direction,
    layoutTextDir: document.querySelector('#layout-text')?.getAttribute('dir'),
    layoutTextDirection: getComputedStyle(document.querySelector('#layout-text')).direction,
    layoutTextClasses: [...document.querySelector('#layout-text').classList],
    layoutClasses: [...document.querySelector('#layout-row').classList],
    iconDirection: getComputedStyle(document.querySelector('#layout-icon')).direction,
    iconRect: (() => { const r = document.querySelector('#layout-icon').getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; })(),
    structuredDirections: ['#structured-heading','#structured-paragraph','#structured-item-one','#structured-item-two','#structured-quote','#long-typography'].map((selector) => document.querySelector(selector)?.getAttribute('dir')),
    structuredMarkerDirections: ['#structured-item-one','#structured-item-two'].map((selector) => getComputedStyle(document.querySelector(selector), '::marker').direction),
    structuredListCodeDirection: getComputedStyle(document.querySelector('#structured-list-code')).direction,
    longTypographyCount: document.querySelectorAll('#long-typography .rtlx-owned-typography').length,
    longTypographyTotal: document.querySelectorAll('#long-typography span').length,
    structuredActionsDir: document.querySelector('#structured-actions')?.getAttribute('dir') ?? null,
    structuredIconDirection: getComputedStyle(document.querySelector('#structured-icon')).direction
  }))()`
  );
  assert(
    (initial.htmlDir ?? null) === (baseline.htmlDir ?? null) &&
      (initial.bodyDir ?? null) === (baseline.bodyDir ?? null),
    'html/body direction was mutated'
  );
  assert(initial.mainDir === 'rtl', 'Persian candidate did not receive semantic rtl');
  assert(initial.mainOwned === true, 'Persian candidate ownership class missing');
  assert(
    initial.stylePresent === true,
    'Typography stylesheet was not injected into document head'
  );
  assert(initial.errors.length === 0, 'Content runtime emitted an uncaught browser error');
  assert(initial.codeDir === 'ltr', 'Code zone did not preserve LTR');
  assert(initial.wrappers > 0, 'Expected bidi wrapper was not inserted');
  assert(initial.accessibleName === 'Copy', 'Accessible name changed');
  assert(initial.layoutDir === baseline.layoutDir, 'Layout row received a dir attribute');
  assert(
    initial.layoutDirection === baseline.layoutDirection,
    'Layout row computed direction changed'
  );
  assert(initial.layoutTextDir === 'rtl', 'Safe text leaf did not receive RTL direction');
  assert(
    initial.iconDirection === baseline.iconDirection,
    'Icon inherited an unexpected direction change'
  );
  assert(
    Math.abs(initial.iconRect.x - baseline.iconRect.x) < 0.5,
    'Icon moved horizontally after RTL processing'
  );
  assert(
    Math.abs(initial.iconRect.y - baseline.iconRect.y) <= 4,
    'Icon moved vertically beyond the bounded font-metric allowance'
  );
  assert(initial.iconRect.width === baseline.iconRect.width, 'Icon width changed');
  assert(initial.iconRect.height === baseline.iconRect.height, 'Icon height changed');

  assert(
    initial.structuredDirections.every((direction) => direction === 'rtl'),
    'Structured text blocks did not all receive independent RTL direction'
  );
  assert(
    initial.structuredMarkerDirections.every((direction) => direction === 'rtl'),
    'Nested list markers did not inherit RTL from their list-item owners'
  );
  assert(
    initial.structuredListCodeDirection === 'ltr',
    'Inline code inside an RTL list item did not remain LTR'
  );
  assert(
    initial.longTypographyCount === initial.longTypographyTotal &&
      initial.longTypographyTotal === 121,
    'Bounded typography continuation did not cover every eligible long-region target'
  );
  assert(initial.structuredActionsDir === null, 'Structured action layout received a dir');
  assert(
    initial.structuredIconDirection === 'ltr',
    'Structured action icon inherited an unexpected direction'
  );

  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const main = document.querySelector('main');
      for (let index = 0; index < 8; index += 1) {
        const node = document.createTextNode(' API v2.' + index);
        main.append(node);
      }
    })()`,
  });
  await delay(700);

  const snapshot = await evaluate(
    cdp,
    `new Promise((resolve) => {
    const listener = globalThis.__rtlxMessageListeners[0];
    listener({ type: 'RTLX_RUNTIME_SNAPSHOT', meta: { protocolVersion: '1.0.0', extensionVersion: '15.9.11', runtimeEpoch: '11111111-1111-4111-8111-111111111111', commandId: '22222222-2222-4222-8222-222222222222', targetDocumentInstanceId: null } }, { id: 'rtlx-smoke' }, (response) => resolve(response.data));
  })`
  );
  assert(snapshot?.schemaVersion === '1.10.0', 'Runtime snapshot unavailable');
  assert(
    snapshot.captureReadiness.textBlocksProcessingPending === 0,
    'Unprocessed text blocks remained at capture readiness'
  );
  assert(
    snapshot.startupReconciliation.cleanupPerformed === true,
    'Startup reconciliation did not run'
  );
  assert(
    snapshot.startupReconciliation.previousRuntimeMarker === '15.9.0:stale-runtime',
    'Previous runtime marker was not captured'
  );
  assert(
    snapshot.startupReconciliation.preexistingOwnedCandidates >= 1,
    'Stale ownership class was not detected'
  );
  assert(
    snapshot.startupReconciliation.ownedDirectionAttributesRemoved >= 1,
    'Stale owned dir was not removed'
  );
  assert(snapshot.startupReconciliation.wrappersUnwrapped >= 1, 'Stale wrapper was not reconciled');
  const staleState = await evaluate(
    cdp,
    `(() => { const node = document.querySelector('#stale-shell'); return { dir: node?.getAttribute('dir') ?? null, owner: node?.getAttribute('data-rtlx-dir-owner') ?? null, classes: [...(node?.classList ?? [])], wrappers: document.querySelectorAll('#stale-zone .rtlx-owned-bdi').length, runtimeOwner: document.documentElement.getAttribute('data-rtlx-runtime-owner') }; })()`
  );
  assert(
    staleState.owner !== '15.9.0:stale-runtime',
    'Startup reconciliation left the prior direction owner marker'
  );
  assert(
    snapshot.startupReconciliation.classesRemoved >= 3,
    'Startup reconciliation did not remove stale ownership classes'
  );
  assert(
    staleState.runtimeOwner?.startsWith('15.9.11:'),
    'Runtime lease was not claimed by 15.9.11'
  );
  assert(snapshot.layoutSafety.semanticLayoutContainers >= 1, 'Layout safety evidence missing');
  assert(
    snapshot.layoutSafety.directionTargetsRedirected >= 1,
    'Direction target was not redirected'
  );
  assert(snapshot.streaming.rejectedRoots === 0, 'Mutation intake rejected a streaming root');
  assert(snapshot.pendingCandidates === 0, 'Candidate backlog remained after direct text updates');
  assert(
    snapshot.queues.discoveryRoots === 0,
    'Discovery backlog remained after direct text updates'
  );
  assert(
    snapshot.textBlockCoverage.typographyContinuationsPending === 0,
    'Typography continuation remained pending after quiescence'
  );
  assert(
    snapshot.textBlockCoverage.textBlocksProcessed <=
      snapshot.textBlockCoverage.textBlocksDiscovered,
    'Processed text-block count exceeded unique discovered text blocks'
  );
  assert(
    snapshot.textBlockCoverage.typographyContinuationsQueued >= 1,
    'Long typography fixture did not exercise bounded continuation'
  );
  assert(snapshot.wrapperCount <= 500, 'Wrapper hard limit exceeded');

  const beforeRollbackText = await evaluate(cdp, `document.querySelector('main')?.textContent`);
  await evaluate(
    cdp,
    `new Promise((resolve) => {
    const listener = globalThis.__rtlxMessageListeners[0];
    listener({ type: 'RTLX_ROLLBACK', meta: { protocolVersion: '1.0.0', extensionVersion: '15.9.11', runtimeEpoch: '11111111-1111-4111-8111-111111111111', commandId: '33333333-3333-4333-8333-333333333333', targetDocumentInstanceId: null } }, { id: 'rtlx-smoke' }, resolve);
  })`
  );
  await delay(100);
  const rolledBack = await evaluate(
    cdp,
    `(() => ({
    mainDir: document.querySelector('main')?.getAttribute('dir'),
    mainOwned: document.querySelector('main')?.classList.contains('rtlx-owned-candidate'),
    wrappers: document.querySelectorAll('.rtlx-owned-bdi').length,
    text: document.querySelector('main')?.textContent,
    codeDir: document.querySelector('code')?.getAttribute('dir')
  }))()`
  );
  assert(rolledBack.mainDir === null, 'Rollback left candidate dir');
  assert(rolledBack.mainOwned === false, 'Rollback left ownership class');
  assert(rolledBack.wrappers === 0, 'Rollback left bidi wrappers');
  assert(rolledBack.text === beforeRollbackText, 'Rollback changed the text sequence');
  assert(rolledBack.codeDir === null, 'Rollback left code direction');

  console.log(
    JSON.stringify(
      {
        browser: 'Chromium headless',
        mode: 'real-browser-content-runtime-smoke',
        initial,
        runtime: snapshot,
        rollback: rolledBack,
        status: 'pass',
      },
      null,
      2
    )
  );
  cdp.close();
} finally {
  chromium.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => chromium.once('exit', resolve)), delay(1500)]);
  server.close();
  await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function stubExpression(port) {
  const settings = {
    schemaVersion: '2.1.0',
    enabled: true,
    siteMode: 'auto-safe',
    directionCorrection: true,
    bidiIsolation: true,
    typography: true,
    interactiveTextMutation: false,
    formFieldDirection: false,
    inputDirectionAssistant: false,
    listRepair: true,
    latinFont: 'amazon-ember-local',
    persianFont: 'local-first',
    settingsScope: 'site',
    aggressiveNaturalLanguageWrapping: false,
    closedShadowDom: false,
    remoteProfiles: false,
    telemetry: false,
    diagnosticsPersistence: false,
  };
  return `(() => {
    globalThis.__rtlxMessageListeners = [];
    if (typeof crypto.randomUUID !== 'function') {
      Object.defineProperty(crypto, 'randomUUID', {
        configurable: true,
        value: () => '00000000-0000-4000-8000-000000000001'
      });
    }
    globalThis.__rtlxSmokeErrors = [];
    addEventListener('error', (event) => globalThis.__rtlxSmokeErrors.push(String(event.error?.stack ?? event.message)));
    addEventListener('unhandledrejection', (event) => globalThis.__rtlxSmokeErrors.push(String(event.reason?.stack ?? event.reason)));
    globalThis.chrome = {
      runtime: {
        id: 'rtlx-smoke',
        lastError: null,
        getURL: (path) => 'http://127.0.0.1:${port}/' + path,
        onMessage: { addListener: (listener) => globalThis.__rtlxMessageListeners.push(listener) },
        sendMessage: (request, callback) => {
          if (request.type === 'REQUEST_CONTEXT') callback({
            requestId: request.requestId,
            success: true,
            data: { global: ${JSON.stringify(settings)}, profile: null, temporaryDisableUntil: null, runtimeEpoch: '11111111-1111-4111-8111-111111111111' }
          });
          else callback({ requestId: request.requestId, success: true });
        }
      },
      i18n: { getMessage: () => '' }
    };
  })()`;
}

async function waitForDevToolsPort(dir) {
  const file = join(dir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const [port] = (await readFile(file, 'utf8')).trim().split('\n');
      if (port) return Number(port);
    } catch {
      // DevToolsActivePort is created asynchronously.
    }
    await delay(50);
  }
  throw new Error('Chromium DevTools port unavailable');
}

async function waitForPage(port, expectedUrl) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) =>
      response.json()
    );
    const target = targets.find((item) => item.type === 'page' && item.url === expectedUrl);
    if (target) return target;
    await delay(50);
  }
  throw new Error('Chromium page target unavailable');
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
    if (message.error) handler.reject(new Error(message.error.message));
    else handler.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const messageId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(messageId, { resolve, reject });
        socket.send(JSON.stringify({ id: messageId, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveChromiumBinary() {
  if (process.env.CHROMIUM_BIN) return process.env.CHROMIUM_BIN;
  for (const candidate of ['chromium', 'google-chrome', 'chromium-browser']) {
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('Chromium executable unavailable; set CHROMIUM_BIN');
}
