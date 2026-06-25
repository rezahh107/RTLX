import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SiteProfile } from '../../src/shared/types';

function profile(name: 'qwen' | 'deepseek'): SiteProfile {
  return JSON.parse(readFileSync(`profiles/bundled/${name}.json`, 'utf8')) as SiteProfile;
}

describe('v15.9.1 Qwen and DeepSeek protective profiles', () => {
  for (const name of ['qwen', 'deepseek'] as const) {
    it(`${name} v3 avoids unverified semantic and blanket interactive selectors`, () => {
      const value = profile(name);
      expect(value.profileVersion).toBe(3);
      expect(value.selectors.content).toEqual([]);
      expect(value.selectors.mutationSensitive).toEqual([]);
      expect(value.rules.some((rule) => rule.category === 'content')).toBe(false);
      expect(value.rules.some((rule) => rule.category === 'mutationSensitive')).toBe(false);
      expect(
        value.rules.every((rule) => ['code', 'editor', 'math', 'terminal'].includes(rule.category))
      ).toBe(true);
    });
  }
});
