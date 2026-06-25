import { canonicalize, type CanonicalJson } from '../shared/canonical-json';
import { LIMITS } from '../shared/constants';
import { normalizeProfile, validateProfile } from '../shared/profile-schema';
import { storageGet } from '../shared/api-adapter';
import { runStorageTransaction } from './storage-transaction';
import type { ProfileHistoryEntry, SiteProfile } from '../shared/types';

const PREFIX = 'rtlx:profile-history:';

export async function listProfileHistory(
  hostname: string
): Promise<readonly ProfileHistoryEntry[]> {
  const value = await storageGet<unknown>('local', key(hostname));
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) throw new Error('Profile history storage invalid');
  const entries = value.map(normalizeEntry);
  return Object.freeze(entries.slice(0, LIMITS.profileHistoryMaxSnapshots));
}

export async function snapshotProfile(
  hostname: string,
  profile: SiteProfile,
  now: () => Date = () => new Date()
): Promise<ProfileHistoryEntry> {
  validateProfile(profile);
  const entry = await createProfileHistoryEntry(profile, now());
  const current = await listProfileHistory(hostname);
  const merged = mergeProfileHistory(entry, current);
  await runStorageTransaction({
    kind: 'profile-history',
    setItems: { [profileHistoryStorageKey(hostname)]: merged },
  });
  return entry;
}

export async function createProfileHistoryEntry(
  profile: SiteProfile,
  savedAt: Date
): Promise<ProfileHistoryEntry> {
  validateProfile(profile);
  const canonical = canonicalize(profile as unknown as CanonicalJson);
  const hash = await sha256(canonical);
  return Object.freeze({
    schemaVersion: '1.0.0',
    hash,
    savedAt: savedAt.toISOString(),
    profileVersion: profile.profileVersion,
    profile: normalizeProfile(profile),
  });
}

export async function historyProfileByHash(
  hostname: string,
  hash: string
): Promise<SiteProfile | null> {
  if (!/^[a-f0-9]{64}$/u.test(hash)) throw new Error('Invalid history hash');
  return (await listProfileHistory(hostname)).find((entry) => entry.hash === hash)?.profile ?? null;
}

function normalizeEntry(value: unknown): ProfileHistoryEntry {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('schemaVersion' in value) ||
    value.schemaVersion !== '1.0.0' ||
    !('hash' in value) ||
    typeof value.hash !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(value.hash) ||
    !('savedAt' in value) ||
    typeof value.savedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.savedAt)) ||
    !('profileVersion' in value) ||
    !Number.isInteger(value.profileVersion) ||
    !('profile' in value)
  )
    throw new Error('Profile history entry invalid');
  const profile = normalizeProfile(value.profile);
  validateProfile(profile);
  if (profile.profileVersion !== value.profileVersion)
    throw new Error('Profile history version mismatch');
  return Object.freeze({
    schemaVersion: '1.0.0',
    hash: value.hash,
    savedAt: new Date(value.savedAt).toISOString(),
    profileVersion: value.profileVersion,
    profile,
  });
}

export function mergeProfileHistory(
  entry: ProfileHistoryEntry,
  current: readonly ProfileHistoryEntry[]
): readonly ProfileHistoryEntry[] {
  return Object.freeze(
    [entry, ...current.filter((item) => item.hash !== entry.hash)].slice(
      0,
      LIMITS.profileHistoryMaxSnapshots
    )
  );
}

export function profileHistoryStorageKey(hostname: string): string {
  return key(hostname);
}

function key(hostname: string): string {
  const normalized = hostname.toLowerCase();
  if (
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(
      normalized
    )
  )
    throw new Error('Invalid hostname');
  return `${PREFIX}${normalized}`;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
