import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeProfile, validateProfile } from '../../src/shared/profile-schema';
import type { SiteProfile } from '../../src/shared/types';

interface BundledProfileIndex {
  schemaVersion: '3.0.0';
  profiles: readonly string[];
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), relativePath), 'utf8')) as T;
}

function loadBundledProfiles(): readonly SiteProfile[] {
  const index = readJson<BundledProfileIndex>('profiles/bundled/index.json');
  expect(index.schemaVersion).toBe('3.0.0');
  return Object.freeze(
    index.profiles.map((file) => {
      const profile = normalizeProfile(readJson<unknown>(join('profiles/bundled', file)));
      validateProfile(profile);
      return profile;
    })
  );
}

function findProfile(hostname: string, pathname: string): SiteProfile | null {
  return (
    loadBundledProfiles().find(
      (profile) =>
        profile.match.hosts.some((host) => host.toLowerCase() === hostname.toLowerCase()) &&
        profile.match.pathPrefixes.some((prefix) => pathname.startsWith(prefix))
    ) ?? null
  );
}

describe('v15.9.12 bundled profile routing contracts', () => {
  it('loads and validates every bundled profile from the bundled index', () => {
    const profiles = loadBundledProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    expect(new Set(profiles.map((profile) => profile.profileId)).size).toBe(profiles.length);
  });

  it('routes core LLM hosts to their bundled profiles', () => {
    expect(findProfile('chatgpt.com', '/c/example')?.profileId).toBe('official:chatgpt');
    expect(findProfile('claude.ai', '/chat/example')?.profileId).toBe('official:claude');
    expect(findProfile('chat.qwen.ai', '/c/example')?.profileId).toBe('official:qwen');
  });

  it('keeps ChatGPT and Claude code preservation selectors scoped to block code', () => {
    const protectedProfiles = new Map(loadBundledProfiles().map((profile) => [profile.profileId, profile]));
    for (const profileId of ['official:chatgpt', 'official:claude']) {
      const profile = protectedProfiles.get(profileId);
      expect(profile, `${profileId} must exist`).toBeDefined();
      expect(profile?.selectors.code).not.toContain('code');
      expect(profile?.rules.some((rule) => rule.category === 'code' && rule.selector === 'code')).toBe(
        false
      );
      expect(profile?.selectors.code).toContain('pre code');
    }
  });
});
