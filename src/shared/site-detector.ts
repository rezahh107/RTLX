import type { DetectedSite } from './types';

const SITES: readonly Omit<DetectedSite, 'hostname'>[] = Object.freeze([
  { siteId: 'chatgpt', displayName: 'ChatGPT', category: 'ai' },
  { siteId: 'claude', displayName: 'Claude', category: 'ai' },
  { siteId: 'copilot', displayName: 'Microsoft Copilot', category: 'ai' },
  { siteId: 'deepseek', displayName: 'DeepSeek', category: 'ai' },
  { siteId: 'gemini', displayName: 'Gemini', category: 'ai' },
  { siteId: 'notebooklm', displayName: 'NotebookLM', category: 'ai' },
  { siteId: 'perplexity', displayName: 'Perplexity', category: 'ai' },
  { siteId: 'qwen', displayName: 'Qwen', category: 'ai' },
  { siteId: 'github', displayName: 'GitHub', category: 'developer' },
  { siteId: 'notion', displayName: 'Notion', category: 'productivity' },
  { siteId: 'discord', displayName: 'Discord', category: 'communication' },
  { siteId: 'slack', displayName: 'Slack', category: 'communication' },
]);

const HOSTS: Readonly<Record<string, string>> = Object.freeze({
  'chatgpt.com': 'chatgpt',
  'claude.ai': 'claude',
  'copilot.microsoft.com': 'copilot',
  'chat.deepseek.com': 'deepseek',
  'gemini.google.com': 'gemini',
  'notebooklm.google.com': 'notebooklm',
  'perplexity.ai': 'perplexity',
  'chat.qwen.ai': 'qwen',
  'qwen.ai': 'qwen',
  'github.com': 'github',
  'notion.so': 'notion',
  'www.notion.so': 'notion',
  'discord.com': 'discord',
  'app.slack.com': 'slack',
});

export function detectSupportedSite(hostname: string): DetectedSite | null {
  const normalized = hostname.toLowerCase();
  const siteId = HOSTS[normalized];
  if (!siteId) return null;
  const site = SITES.find((candidate) => candidate.siteId === siteId);
  return site ? Object.freeze({ ...site, hostname: normalized }) : null;
}

export function supportedSites(): readonly DetectedSite[] {
  return Object.freeze(
    Object.entries(HOSTS)
      .map(([hostname, siteId]) => {
        const site = SITES.find((candidate) => candidate.siteId === siteId);
        if (!site) throw new Error(`Missing site metadata for ${siteId}`);
        return Object.freeze({ ...site, hostname });
      })
      .sort((a, b) => a.hostname.localeCompare(b.hostname, 'en'))
  );
}
