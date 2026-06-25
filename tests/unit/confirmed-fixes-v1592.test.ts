import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decideDirectionDetailed } from '../../src/content/direction-decider';
import { evaluateProfileHealth } from '../../src/content/profile-health';
import { RuntimeEvidenceAccumulator } from '../../src/content/runtime-evidence-accumulator';
import { inspectTextBlockContinuationRecovery } from '../../src/content/text-block-continuation-recovery';
import { normalizedScopePath } from '../../src/background/settings-repository';
import { addSelectionToProfile, createEmptyUserProfile } from '../../src/shared/profile-builder';
import type { DirectionEvidence, SiteProfile } from '../../src/shared/types';
import { installDom } from '../dom-test-setup';

const directionBase: DirectionEvidence = {
  localDir: null,
  nearestAncestorDir: null,
  documentDirDeclared: false,
  detectedDirection: 'rtl',
  language: 'mixed',
  languageConfidence: 0.86,
  userMode: 'auto-safe',
  hardExcluded: false,
  codeZone: false,
  isHtmlOrBody: false,
  userConfirmedSuspiciousDirection: false,
};

function semanticProfile(selector: string): SiteProfile {
  return addSelectionToProfile(
    'example.com',
    {
      schemaVersion: '2.0.0',
      hostname: 'example.com',
      kind: 'content',
      selector,
      directionMode: 'auto-safe',
      alignmentMode: 'start',
      typographyMode: 'persian-only',
      initialDelayMs: 0,
    },
    createEmptyUserProfile('example.com')
  );
}

describe('RTLX 15.9.11 confirmed runtime repairs', () => {
  it('treats inherited dir=auto as unresolved context for confident Persian or mixed text', () => {
    expect(decideDirectionDetailed({ ...directionBase, nearestAncestorDir: 'auto' })).toMatchObject(
      {
        action: 'set-rtl-on-candidate',
        reason: 'confident-persian-without-context',
      }
    );
  });

  it('continues preserving an explicit local dir=auto', () => {
    expect(decideDirectionDetailed({ ...directionBase, localDir: 'auto' })).toMatchObject({
      action: 'preserve',
      reason: 'explicit-direction-preserved',
    });
  });

  it('does not infer correctness from the RTLX ownership class', () => {
    const source = readFileSync('src/content/frame-runtime.ts', 'utf8');
    expect(source).not.toContain(
      "if (element.classList.contains(OWNED_CLASS)) return 'already-correct'"
    );
    expect(source).toContain("if (action === 'no-op') return reason || 'insufficient-evidence'");
  });

  it('identifies connected continuation tasks that lost their queue entry', () => {
    const document = installDom('<html><body><section id="region">سلام</section></body></html>');
    const region = document.querySelector('#region')!;
    const result = inspectTextBlockContinuationRecovery({
      pending: new Set([region]),
      visibleQueue: new Set(),
      backgroundQueue: new Set(),
      cursors: new Map([[region, {}]]),
    });
    expect(result.recoverable).toEqual([region]);
    expect(result.invalid).toEqual([]);
  });

  it('does not requeue a continuation that is already queued', () => {
    const document = installDom('<html><body><section id="region">سلام</section></body></html>');
    const region = document.querySelector('#region')!;
    const result = inspectTextBlockContinuationRecovery({
      pending: new Set([region]),
      visibleQueue: new Set([region]),
      backgroundQueue: new Set(),
      cursors: new Map([[region, {}]]),
    });
    expect(result.recoverable).toEqual([]);
    expect(result.invalid).toEqual([]);
  });

  it('cancels abandoned discovered blocks without corrupting coverage counts', () => {
    const evidence = new RuntimeEvidenceAccumulator();
    evidence.recordTextBlockDiscovered('paragraph');
    evidence.cancelTextBlockDiscovered('paragraph');
    expect(evidence.snapshot(0).textBlockCoverage).toMatchObject({
      textBlocksDiscovered: 0,
      textBlocksProcessed: 0,
      textBlockKinds: {},
    });
  });

  it('keeps optional and satisfied alternative semantic rules from degrading profile health', () => {
    const document = installDom(
      '<html><body><main><article data-message>سلام</article></main></body></html>'
    );
    const required = semanticProfile('[data-message]');
    const rootRule = { ...required.rules[0]!, selector: 'main', ruleId: 'rule-7eb3f78f' };
    const alternateRule = {
      ...required.rules[0]!,
      selector: '[role="main"]',
      ruleId: 'rule-35f1faf8',
      healthExpectation: 'optional' as const,
      alternativeGroup: 'conversation-root',
    };
    const profile: SiteProfile = {
      ...required,
      rules: [
        { ...required.rules[0]!, healthExpectation: 'required' },
        { ...rootRule, healthExpectation: 'optional', alternativeGroup: 'conversation-root' },
        alternateRule,
      ],
      selectors: {
        ...required.selectors,
        content: ['[data-message]', '[role="main"]', 'main'].sort(),
      },
    };
    const health = evaluateProfileHealth(document, profile, () => new Date(0));
    expect(health.status).toBe('healthy');
  });

  it('degrades profile health when a required alternative group is missing beside healthy semantic coverage', () => {
    const document = installDom(
      '<html><body><article data-message>سلام</article><section>پاسخ</section></body></html>'
    );
    const base = semanticProfile('[data-message]');
    const profile: SiteProfile = {
      ...base,
      rules: [
        { ...base.rules[0]!, healthExpectation: 'required' },
        {
          ...base.rules[0]!,
          selector: 'main',
          ruleId: 'rule-7eb3f78f',
          healthExpectation: 'required',
          alternativeGroup: 'conversation-root',
        },
        {
          ...base.rules[0]!,
          selector: '[role="main"]',
          ruleId: 'rule-35f1faf8',
          healthExpectation: 'optional',
          alternativeGroup: 'conversation-root',
        },
      ],
      selectors: {
        ...base.selectors,
        content: ['[data-message]', '[role="main"]', 'main'].sort(),
      },
    };
    expect(evaluateProfileHealth(document, profile, () => new Date(0)).status).toBe('degraded');
  });

  it('retries initial context loading and arms event-driven recovery after exhaustion', () => {
    const source = readFileSync('src/content/index.ts', 'utf8');
    expect(source).toContain('let runtimeInitializationRetries = 0;');
    expect(source).toContain('if (runtimeInitializationRetries < 2)');
    expect(source).toContain('window.setTimeout(() => void reloadRuntime(), 1500);');
    expect(source).toContain('armRuntimeRecovery();');
    expect(source).toContain("window.addEventListener('pageshow', handleRuntimeRecovery);");
    expect(source).toContain(
      "document.addEventListener('visibilitychange', handleRuntimeRecovery);"
    );
    expect(source).not.toContain('window.setInterval');
  });

  it('keeps REQUEST_CONTEXT on the critical initialization path only', () => {
    const source = readFileSync('src/background/index.ts', 'utf8');
    expect(source).toContain("if (raw.type === 'REQUEST_CONTEXT')");
    expect(source).toContain(
      "await ensureBackgroundContextInitialized('runtime:request-context');"
    );
    expect(source).toContain("else await ensureBackgroundInitialized('runtime:onMessage');");
  });

  it('omits absent site settings from canonical background responses', () => {
    const source = readFileSync('src/background/index.ts', 'utf8');
    const requestContextStart = source.indexOf("case 'REQUEST_CONTEXT':");
    const updateSettingsStart = source.indexOf("case 'UPDATE_SETTINGS':", requestContextStart);
    const requestContext = source.slice(requestContextStart, updateSettingsStart);
    const getStatusStart = source.indexOf("case 'GET_STATUS':");
    const reportDiagnosticsStart = source.indexOf("case 'REPORT_DIAGNOSTICS':", getStatusStart);
    const getStatus = source.slice(getStatusStart, reportDiagnosticsStart);

    expect(requestContext).toContain('...(site === undefined ? {} : { site })');
    expect(requestContext).not.toContain('\n        site,');
    expect(getStatus).toContain(
      'const site = await getScopedSettings(raw.payload.hostname, raw.payload.pathname, profile);'
    );
    expect(getStatus).toContain('...(site === undefined ? {} : { site })');
    expect(getStatus).not.toContain('site: await getScopedSettings');
  });

  it('does not double-count popup candidate subqueues', () => {
    const source = readFileSync('src/ui/popup/index.ts', 'utf8');
    expect(source).toContain("const pending = numberField(snapshot, 'pendingCandidates');");
    expect(source).toContain(
      "numberField(snapshot, 'pendingCandidates') +\n        nestedNumber(snapshot, ['queues', 'discoveryRoots'])"
    );
  });

  it('exits popup checking state and keeps bootstrap diagnostics available on initialization failure', () => {
    const source = readFileSync('src/ui/popup/index.ts', 'utf8');
    const listener = source.indexOf(
      "elements.report.addEventListener('click', () => void downloadAvailableReport())"
    );
    const initialize = source.indexOf('void initialize().catch');
    const bindStart = source.indexOf('function bind(context: Context)');
    const bindEnd = source.indexOf('async function setActivation', bindStart);
    const bind = source.slice(bindStart, bindEnd);
    expect(listener).toBeGreaterThanOrEqual(0);
    expect(initialize).toBeGreaterThan(listener);
    expect(source).toContain('new Error(response.error.message),');
    expect(source).toContain('const key = bootstrapFailureMessageKey(category);');
    expect(source).toContain(
      'elements.report.disabled = !BOOTSTRAP_FAILURE_MESSAGE_KEYS.has(key);'
    );
    expect(bind).not.toContain('elements.report.addEventListener');
  });

  it('creates a privacy-limited local report when popup context is unavailable', () => {
    const source = readFileSync('src/ui/popup/index.ts', 'utf8');
    const start = source.indexOf('async function downloadBootstrapFailureReport');
    const end = source.indexOf('function pageIdentity', start);
    const fallback = source.slice(start, end);
    expect(fallback).toContain("reportType: 'popup-bootstrap-failure'");
    expect(fallback).toContain("stage: 'REQUEST_CONTEXT'");
    expect(fallback).toContain("category: 'backgroundInitializationFailed'");
    expect(fallback).toContain('page,');
    expect(fallback).not.toContain('pathname');
    expect(fallback).not.toContain('document.body');
    expect(fallback).not.toContain('textContent');
  });

  it('activates runtime before exporting debug evidence and handles a missing snapshot', () => {
    const source = readFileSync('src/ui/popup/index.ts', 'utf8');
    const start = source.indexOf('async function downloadReport');
    const end = source.indexOf('async function resetSite', start);
    const downloadReport = source.slice(start, end);
    expect(downloadReport).toContain("message('APPLY_CURRENT_TAB'");
    expect(downloadReport).toContain('await waitForSettledRuntime(context.tabId, 5000)');
    expect(downloadReport).toContain("if (!snapshot) return setToast(i18n('statusStarting'))");
    expect(downloadReport).not.toContain("message('ENSURE_CURRENT_TAB_RUNTIME'");
  });

  it('routes direct mutation candidates through streaming debounce while streaming is active', () => {
    const source = readFileSync('src/content/frame-runtime.ts', 'utf8');
    expect(source).toContain('if (this.streaming.hasPendingRoots())');
    expect(source).toContain('this.stageStreaming(candidate);');
  });

  it('normalizes SPA selection identity to the configured conversation depth', () => {
    expect(normalizedScopePath('/c/conversation-id/transient/route', 2)).toBe('/c/conversation-id');
  });
});
