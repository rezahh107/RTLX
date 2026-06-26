import { normalizeProfile, validateProfile } from '../shared/profile-schema';
import type { CommunityCatalogEntry, SiteProfile } from '../shared/types';
import { listCommunityProfiles } from './community-profile-repository';

interface BundledProfileIndex {
  schemaVersion: '3.0.0';
  profiles: readonly string[];
}
interface CertificationRecord {
  profileId: string;
  fixtureStatus: 'verified' | 'synthetic' | 'failed';
  liveStatus: 'not-run' | 'passed' | 'failed';
  chrome: 'not-run' | 'passed' | 'failed';
  edge: 'not-run' | 'passed' | 'failed';
  firefox: 'not-run' | 'passed' | 'failed';
  lastCheckedAt: string | null;
}
interface CertificationIndex {
  schemaVersion: '1.0.0';
  records: readonly CertificationRecord[];
}

export interface ProfileLoadIssue {
  readonly file: string;
  readonly stage: 'fetch' | 'normalize' | 'validate';
  readonly reason: string;
}

let lastBundledProfileLoadIssues: readonly ProfileLoadIssue[] = Object.freeze([]);

export function profileLoadIssues(): readonly ProfileLoadIssue[] {
  return lastBundledProfileLoadIssues;
}

export async function findActiveProfile(
  hostname: string,
  pathname: string
): Promise<SiteProfile | null> {
  // The focused personal edition intentionally ignores legacy user-authored and
  // community profiles. Bundled declarative profiles remain the only runtime
  // source; the popup can delete legacy user profiles without silently applying them.
  return findBundledProfile(hostname, pathname);
}

export async function findBundledProfile(
  hostname: string,
  pathname: string
): Promise<SiteProfile | null> {
  const result = await loadBundledProfiles({ hostname, pathname, stopAtFirstMatch: true });
  return result.profiles[0] ?? null;
}

export async function listBundledProfiles(): Promise<readonly SiteProfile[]> {
  const result = await loadBundledProfiles({ stopAtFirstMatch: false });
  return Object.freeze(
    result.profiles.sort((a, b) => a.profileId.localeCompare(b.profileId, 'en'))
  );
}

export async function communityCatalog(): Promise<readonly CommunityCatalogEntry[]> {
  const certification = await certificationByProfileId();
  const bundled = (await listBundledProfiles()).map((profile) => {
    const record = certification.get(profile.profileId);
    return Object.freeze({
      catalogId: `catalog:${profile.profileId}`,
      displayName: profile.displayName,
      profileId: profile.profileId,
      hosts: Object.freeze([...profile.match.hosts]),
      source: 'bundled' as const,
      verification:
        profile.metadata.verification === 'verified-fixture'
          ? ('verified-fixture' as const)
          : ('synthetic-fixture' as const),
      availableOffline: true as const,
      fixtureStatus: record?.fixtureStatus ?? ('synthetic' as const),
      liveStatus: record?.liveStatus ?? ('not-run' as const),
      browserStatus: Object.freeze({
        chrome: record?.chrome ?? ('not-run' as const),
        edge: record?.edge ?? ('not-run' as const),
        firefox: record?.firefox ?? ('not-run' as const),
      }),
      lastCheckedAt: record?.lastCheckedAt ?? null,
    });
  });
  const community = (await listCommunityProfiles()).map((profile) =>
    Object.freeze({
      catalogId: `catalog:${profile.profileId}`,
      displayName: profile.displayName,
      profileId: profile.profileId,
      hosts: Object.freeze([...profile.match.hosts]),
      source: 'imported-signed' as const,
      verification: 'signature-verified' as const,
      availableOffline: true as const,
      fixtureStatus: 'synthetic' as const,
      liveStatus: 'not-run' as const,
      browserStatus: Object.freeze({
        chrome: 'not-run' as const,
        edge: 'not-run' as const,
        firefox: 'not-run' as const,
      }),
      lastCheckedAt: null,
    })
  );
  return Object.freeze(
    [...bundled, ...community].sort(
      (a, b) =>
        a.displayName.localeCompare(b.displayName, 'en') ||
        a.profileId.localeCompare(b.profileId, 'en')
    )
  );
}

type BundledProfileLoadResult = Readonly<{
  profiles: SiteProfile[];
  issues: readonly ProfileLoadIssue[];
}>;

async function loadBundledProfiles(options: {
  readonly hostname?: string;
  readonly pathname?: string;
  readonly stopAtFirstMatch: boolean;
}): Promise<BundledProfileLoadResult> {
  const index = await fetchJson<BundledProfileIndex>('profiles/bundled/index.json');
  if (index.schemaVersion !== '3.0.0') throw new Error('Bundled profile index version invalid');
  const profiles: SiteProfile[] = [];
  const issues: ProfileLoadIssue[] = [];
  for (const file of [...index.profiles].sort()) {
    let raw: unknown;
    try {
      raw = await fetchJson<unknown>(`profiles/bundled/${file}`);
    } catch (error) {
      issues.push(loadIssue(file, 'fetch', error));
      continue;
    }
    let profile: SiteProfile;
    try {
      profile = normalizeProfile(raw);
    } catch (error) {
      issues.push(loadIssue(file, 'normalize', error));
      continue;
    }
    try {
      validateProfile(profile);
    } catch (error) {
      issues.push(loadIssue(file, 'validate', error));
      continue;
    }
    if (
      options.hostname !== undefined &&
      options.pathname !== undefined &&
      !matches(profile, options.hostname, options.pathname)
    )
      continue;
    profiles.push(profile);
    if (options.stopAtFirstMatch) break;
  }
  lastBundledProfileLoadIssues = Object.freeze(issues);
  return Object.freeze({ profiles, issues: lastBundledProfileLoadIssues });
}

function loadIssue(
  file: string,
  stage: ProfileLoadIssue['stage'],
  error: unknown
): ProfileLoadIssue {
  const reason =
    error instanceof Error ? error.message.slice(0, 240) : 'unknown profile load error';
  return Object.freeze({ file, stage, reason });
}

async function certificationByProfileId(): Promise<Map<string, CertificationRecord>> {
  const index = await fetchJson<CertificationIndex>('profiles/certification/index.json');
  if (index.schemaVersion !== '1.0.0') throw new Error('Profile certification version invalid');
  return new Map(index.records.map((record) => [record.profileId, record]));
}

function matches(profile: SiteProfile, hostname: string, pathname: string): boolean {
  return (
    profile.match.hosts.some((host) => host.toLowerCase() === hostname.toLowerCase()) &&
    profile.match.pathPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(chrome.runtime.getURL(path), {
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Bundled profile resource unavailable: ${path}`);
  return (await response.json()) as T;
}
