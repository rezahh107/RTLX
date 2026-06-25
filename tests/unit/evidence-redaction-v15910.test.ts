import { describe, expect, it } from 'vitest';
import {
  redactEvidence,
  redactSensitiveString,
  sanitizeProcessOutput,
} from '../../scripts/evidence-redaction-core.mjs';

const sensitiveSamples = [
  'https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fmail.google.com&login_hint=someone@example.com#frag',
  'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturetoken',
  'cookie: SID=abc; HSID=def; sessionid=ghi',
  'access_token=ya29.secret refresh_token=1//secret client_secret=topsecret',
  '/home/rezatest/private/profile/Default and C:\\Users\\rezatest\\AppData\\Local\\Temp',
];

describe('RTLX 15.9.11 privacy-safe evidence redaction', () => {
  it('removes account URLs, query strings, fragments, tokens, cookies, emails, and private paths', () => {
    const joined = sensitiveSamples.join('\n');
    const redacted = redactSensitiveString(joined).value;
    expect(redacted).not.toContain('accounts.google.com');
    expect(redacted).not.toContain('continue=');
    expect(redacted).not.toContain('login_hint');
    expect(redacted).not.toContain('someone@example.com');
    expect(redacted).not.toContain('Bearer eyJ');
    expect(redacted).not.toContain('SID=abc');
    expect(redacted).not.toContain('ya29.secret');
    expect(redacted).not.toContain('topsecret');
    expect(redacted).not.toContain('rezatest');
    expect(redacted).toContain('host_category=account_endpoint');
    expect(redacted).toContain('[REDACTED_SECRET]');
    expect(redacted).toContain('[REDACTED_LOCAL_PATH');
  });

  it('redacts nested evidence objects before serialization', () => {
    const report = redactEvidence({
      schemaVersion: '1.0.0',
      status: 'insufficient_evidence',
      blockingReasons: [
        'Navigation failed: https://accounts.google.com/o/oauth2/v2/auth?client_id=x&scope=email#token',
      ],
      evidence: {
        stderrTail: 'Cookie: SID=abc\nfile:///Users/rezatest/Library/Application Support/Profile',
      },
    });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('client_id=x');
    expect(serialized).not.toContain('#token');
    expect(serialized).not.toContain('SID=abc');
    expect(serialized).not.toContain('rezatest');
    expect(report.evidencePrivacy?.sensitiveMaterialRemoved).toBe(true);
    expect(report.evidencePrivacy?.redactionCount).toBeGreaterThanOrEqual(3);
  });

  it('returns a bounded sanitized process-output tail', () => {
    const summary = sanitizeProcessOutput(`prefix ${'x'.repeat(5000)} access_token=secret`, {
      maxLength: 128,
    });
    expect(summary.tail.length).toBeLessThanOrEqual(128);
    expect(summary.tail).not.toContain('secret');
    expect(summary.sensitiveMaterialRemoved).toBe(true);
  });
});
