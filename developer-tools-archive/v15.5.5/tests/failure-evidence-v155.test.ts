import { describe, expect, it, vi } from 'vitest';
import {
  classifyPageUrl,
  isFailureElementEvidence,
  pathnameDepth,
  sanitizeFailureObservation,
  sanitizeFailureElementEvidenceForReport,
  selectFailureConclusion,
} from '../../src/shared/failure-evidence';
import { isRequestMessage } from '../../src/shared/messages';
import { buildFailureElementEvidence } from '../../src/content/failure-evidence-picker';
import { installDom } from '../dom-test-setup';
import type { ElementInspection } from '../../src/shared/types';

const requestId = '11111111-1111-4111-8111-111111111111';

function inspection(): ElementInspection {
  return {
    schemaVersion: '3.0.0',
    matchedProfile: 'profile:test',
    matchedRule: 'rule-12345678',
    matchedRules: [
      {
        ruleId: 'rule-12345678',
        category: 'content',
        profileOrder: 0,
        accepted: true,
        reason: 'first-enabled-match',
      },
    ],
    matchedGroup: 'content',
    selector: '[data-testid="message"]',
    exclusionReason: null,
    typographyDecision: 'eligible',
    languageClassification: 'persian',
    languageConfidence: 0.95,
    detectedDirection: 'rtl',
    mutationStatus: {
      candidateOwned: false,
      explicitDir: null,
      ownedWrappers: 0,
      journalEntries: 0,
    },
  };
}

describe('FEC-001/FEC-008 page eligibility', () => {
  it('separates eligible, protected, and unsupported pages', () => {
    expect(classifyPageUrl('https://example.com/a/b?secret=yes#fragment')).toMatchObject({
      status: 'eligible',
      hostname: 'example.com',
      pathname: '/a/b',
    });
    expect(classifyPageUrl('https://chromewebstore.google.com/detail/x')).toMatchObject({
      status: 'browser_restricted',
      reasonCode: 'RTLX-CAPTURE-RESTRICTED-HOST',
    });
    expect(classifyPageUrl('chrome://extensions')).toMatchObject({
      status: 'browser_restricted',
      reasonCode: 'RTLX-CAPTURE-RESTRICTED-SCHEME',
    });
    expect(pathnameDepth('/a/b/')).toBe(2);
  });
});

describe('FEC-002/FEC-006 strict capture contracts', () => {
  it('accepts only bounded user-initiated failure messages', () => {
    expect(
      isRequestMessage({
        type: 'EXPORT_FAILURE_EVIDENCE',
        requestId,
        payload: { tabId: 1, expected: 'RTL', actual: 'LTR' },
      })
    ).toBe(true);
    expect(
      isRequestMessage({
        type: 'EXPORT_FAILURE_EVIDENCE',
        requestId,
        payload: { tabId: 1, expected: 'x'.repeat(2001), actual: '' },
      })
    ).toBe(false);
    expect(sanitizeFailureObservation('  a\r\nb  ')).toBe('a\nb');
  });

  it('classifies restricted and degraded captures deterministically', () => {
    expect(
      selectFailureConclusion({
        eligibility: 'browser_restricted',
        contentScriptRegistered: null,
        contentReachable: false,
        safeModeActive: false,
        runtimeState: null,
        degradationLevel: null,
        profileId: null,
        profileHealthStatus: null,
        selected: null,
        candidateCount: null,
      }).status
    ).toBe('browser_restricted_page');
    expect(
      selectFailureConclusion({
        eligibility: 'eligible',
        contentScriptRegistered: true,
        contentReachable: true,
        safeModeActive: false,
        runtimeState: 'ACTIVE',
        degradationLevel: 2,
        profileId: 'profile:test',
        profileHealthStatus: 'healthy',
        selected: null,
        candidateCount: 1,
      }).status
    ).toBe('runtime_degraded');
  });

  it('distinguishes missing registration and safe mode before generic reachability failures', () => {
    expect(
      selectFailureConclusion({
        eligibility: 'eligible',
        contentScriptRegistered: false,
        contentReachable: false,
        safeModeActive: false,
        runtimeState: null,
        degradationLevel: null,
        profileId: null,
        profileHealthStatus: null,
        selected: null,
        candidateCount: null,
      }).status
    ).toBe('content_script_not_registered');
    expect(
      selectFailureConclusion({
        eligibility: 'eligible',
        contentScriptRegistered: true,
        contentReachable: true,
        safeModeActive: true,
        runtimeState: 'ACTIVE',
        degradationLevel: 0,
        profileId: 'profile:test',
        profileHealthStatus: 'healthy',
        selected: null,
        candidateCount: 1,
      }).status
    ).toBe('safe_mode_active');
  });
});

describe('FEC-003 selected-element evidence', () => {
  it('exports text shape and computed styles without exporting page text', () => {
    const document = installDom(
      '<html><body><div data-testid="message" role="article">متن محرمانه secret ۱۲۳</div></body></html>'
    );
    vi.stubGlobal('getComputedStyle', () => ({
      direction: 'ltr',
      unicodeBidi: 'normal',
      textAlign: 'start',
      writingMode: 'horizontal-tb',
      whiteSpace: 'normal',
      display: 'block',
    }));
    const element = document.querySelector('[data-testid="message"]');
    expect(element).not.toBeNull();
    const evidence = buildFailureElementEvidence(
      element!,
      inspection(),
      '[data-testid="message"]',
      'stable-attribute'
    );
    expect(isFailureElementEvidence(evidence)).toBe(true);
    expect(evidence.textShape.totalCodepoints).toBeGreaterThan(0);
    expect(evidence.computed.direction).toBe('ltr');
    const serialized = JSON.stringify(evidence);
    expect(serialized).not.toContain('محرمانه');
    expect(serialized).not.toContain('secret');
  });
});

describe('v15.5.4 FEC forensic hardening', () => {
  it('classifies bounded browser lifecycle delivery states distinctly', () => {
    for (const [contentDeliveryStatus, status] of [
      ['discarded', 'tab_discarded'],
      ['loading', 'tab_loading'],
      ['frozen', 'tab_frozen'],
      ['timeout', 'content_message_timeout'],
    ] as const) {
      expect(
        selectFailureConclusion({
          eligibility: 'eligible',
          contentScriptRegistered: true,
          contentReachable: false,
          contentDeliveryStatus,
          safeModeActive: false,
          runtimeState: null,
          degradationLevel: null,
          profileId: null,
          profileHealthStatus: null,
          selected: null,
          candidateCount: null,
        }).status
      ).toBe(status);
    }
  });

  it('redacts sensitive selector tokens only in the FEC report representation', () => {
    const document = installDom(
      '<html><body><div id="user-alice@example.com">secret</div><div data-testid="message">safe</div></body></html>'
    );
    vi.stubGlobal('getComputedStyle', () => ({
      direction: 'ltr',
      unicodeBidi: 'normal',
      textAlign: 'start',
      writingMode: 'horizontal-tb',
      whiteSpace: 'normal',
      display: 'block',
    }));
    const sensitive = buildFailureElementEvidence(
      document.querySelector('#user-alice\\@example\\.com')!,
      inspection(),
      '#user-alice\\40 example\\2e com',
      'id'
    );
    const safe = buildFailureElementEvidence(
      document.querySelector('[data-testid="message"]')!,
      inspection(),
      '[data-testid="message"]',
      'attribute'
    );
    const redacted = sanitizeFailureElementEvidenceForReport(sensitive);
    const preserved = sanitizeFailureElementEvidenceForReport(safe);
    expect(redacted.selector).toBeNull();
    expect(redacted.selectorPrivacy.status).toBe('redacted');
    expect(JSON.stringify(redacted)).not.toContain('alice');
    expect(JSON.stringify(redacted)).not.toContain('example');
    expect(preserved.selector).toBe('[data-testid="message"]');
    expect(preserved.selectorPrivacy.status).toBe('preserved');
  });
});
