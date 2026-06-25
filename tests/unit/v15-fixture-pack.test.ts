import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const fixtures = [
  '34-profile-health-degraded',
  '35-streaming-stability',
  '36-document-style-rollback',
  '37-layout-safe-icons',
  '38-structured-chat-response',
  '39-typography-continuation',
] as const;

describe('RTLX v15 hardening fixture pack', () => {
  for (const fixture of fixtures) {
    it(`${fixture} has deterministic assertions and source`, async () => {
      const base = new URL(`../fixtures/${fixture}/`, import.meta.url);
      const html = await readFile(new URL('index.html', base), 'utf8');
      const assertions = JSON.parse(await readFile(new URL('assertions.json', base), 'utf8')) as {
        fixtureVersion: string;
        assertions: string[];
      };
      expect(html).toContain('<!doctype html>');
      expect(assertions.fixtureVersion).toBe('1.0.0');
      expect(assertions.assertions.length).toBeGreaterThanOrEqual(3);
      expect([...assertions.assertions].sort()).not.toEqual([]);
    });
  }
});
