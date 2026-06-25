import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const fixtures = [
  '26-bilingual-input-assistant',
  '27-nested-list-repair',
  '28-claude-artifact-edit',
  '29-gemini-canvas',
  '30-about-blank-streaming',
  '31-sidepanel-rule-controls',
  '32-amazon-ember-local-fallback',
  '33-conversation-scope',
];

describe('v14 controlled fixture pack', () => {
  for (const fixture of fixtures)
    it(`${fixture} has deterministic assertions and HTML`, () => {
      const root = join(process.cwd(), 'tests', 'fixtures', fixture);
      const html = readFileSync(join(root, 'index.html'), 'utf8');
      const manifest = JSON.parse(readFileSync(join(root, 'assertions.json'), 'utf8')) as {
        fixtureVersion?: unknown;
        assertions?: unknown;
      };
      expect(html.startsWith('<!doctype html>')).toBe(true);
      expect(manifest.fixtureVersion).toBe('1.0.0');
      expect(Array.isArray(manifest.assertions)).toBe(true);
      expect((manifest.assertions as unknown[]).length).toBeGreaterThan(2);
    });
});
