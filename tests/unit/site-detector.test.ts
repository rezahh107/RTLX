import { describe, expect, it } from 'vitest';
import { detectSupportedSite, supportedSites } from '../../src/shared/site-detector';

describe('offline site detection', () => {
  it('detects Qwen hosts', () => {
    expect(detectSupportedSite('chat.qwen.ai')).toMatchObject({
      siteId: 'qwen',
      displayName: 'Qwen',
    });
    expect(detectSupportedSite('qwen.ai')).toMatchObject({ siteId: 'qwen' });
  });

  it('contains every required product and is deterministic', () => {
    const ids = new Set(supportedSites().map((site) => site.siteId));
    for (const id of [
      'chatgpt',
      'claude',
      'gemini',
      'deepseek',
      'copilot',
      'perplexity',
      'notebooklm',
      'github',
      'notion',
      'slack',
      'discord',
      'qwen',
    ])
      expect(ids.has(id)).toBe(true);
    expect(supportedSites()).toEqual(
      [...supportedSites()].sort((a, b) => a.hostname.localeCompare(b.hostname, 'en'))
    );
  });
});
