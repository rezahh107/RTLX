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
  for (const profile of await listBundledProfiles())
    if (matches(profile, hostname, pathname)) return profile;
  return null;
}

export async function listBundledProfiles(): Promise<readonly SiteProfile[]> {
  const index = await fetchJson<BundledProfileIndex>('profiles/bundled/index.json');
  if (index.schemaVersion !== '3.0.0') throw new Error('Bundled profile index version invalid');
  const profiles: SiteProfile[] = [];
  for (const file of [...index.profiles].sort()) {
    const profile = normalizeProfile(await fetchJson<unknown>(`profiles/bundled/${file}`));
    validateProfile(profile);
    profiles.push(profile);
  }
  return Object.freeze(profiles.sort((a, b) => a.profileId.localeCompare(b.profileId, 'en')));
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
