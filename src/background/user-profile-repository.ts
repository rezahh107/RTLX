import { LIMITS } from '../shared/constants';
import { exportProfiles, importProfiles } from '../shared/profile-builder';
import { normalizeProfile, validateProfile } from '../shared/profile-schema';
import { storageGet, storageGetAll } from '../shared/api-adapter';
import { parseStrictJson } from '../shared/strict-json';
import type { SiteProfile } from '../shared/types';
import {
  createProfileHistoryEntry,
  historyProfileByHash,
  listProfileHistory,
  mergeProfileHistory,
  profileHistoryStorageKey,
} from './profile-history-repository';
import { runStorageTransaction } from './storage-transaction';

const PREFIX = 'rtlx:user-profile:';

export async function getUserProfile(hostname: string): Promise<SiteProfile | null> {
  const value = await storageGet<unknown>('local', key(hostname));
  if (value === undefined) return null;
  const profile = normalizeProfile(value);
  validateProfile(profile);
  if (profile.profileKind !== 'user') throw new Error('Stored profile kind invalid');
  return profile;
}

export async function saveUserProfile(
  profile: SiteProfile,
  options: Readonly<{ skipHistory?: boolean }> = {}
): Promise<void> {
  validateProfile(profile);
  if (profile.profileKind !== 'user') throw new Error('Only user profiles may be stored');
  const hostname = profile.match.hosts[0];
  if (!hostname) throw new Error('User profile host missing');
  const setItems: Record<string, unknown> = { [key(hostname)]: profile };
  if (!options.skipHistory) {
    const current = await getUserProfile(hostname);
    if (current && current.profileVersion !== profile.profileVersion) {
      const entry = await createProfileHistoryEntry(current, new Date());
      setItems[profileHistoryStorageKey(hostname)] = mergeProfileHistory(
        entry,
        await listProfileHistory(hostname)
      );
    }
  }
  await runStorageTransaction({ kind: 'save-user-profile', setItems });
}

export async function restoreUserProfileHistory(
  hostname: string,
  hash: string
): Promise<SiteProfile> {
  const historic = await historyProfileByHash(hostname, hash);
  if (!historic) throw new Error('Profile history entry not found');
  const current = await getUserProfile(hostname);
  const restored = normalizeProfile({
    ...historic,
    profileVersion: Math.max(current?.profileVersion ?? 0, historic.profileVersion) + 1,
    metadata: { source: 'user-picker', verification: 'user-authored', product: null },
  });
  await saveUserProfile(restored);
  return restored;
}

export async function deleteUserProfile(hostname: string): Promise<void> {
  const current = await getUserProfile(hostname);
  const setItems: Record<string, unknown> = {};
  if (current) {
    const entry = await createProfileHistoryEntry(current, new Date());
    setItems[profileHistoryStorageKey(hostname)] = mergeProfileHistory(
      entry,
      await listProfileHistory(hostname)
    );
  }
  await runStorageTransaction({
    kind: 'delete-user-profile',
    setItems,
    removeKeys: [key(hostname)],
  });
}

export async function listUserProfiles(): Promise<readonly SiteProfile[]> {
  const values = await storageGetAll('local');
  const profiles: SiteProfile[] = [];
  for (const [storageKey, value] of Object.entries(values).sort(([a], [b]) =>
    a.localeCompare(b, 'en')
  )) {
    if (!storageKey.startsWith(PREFIX)) continue;
    const profile = normalizeProfile(value);
    validateProfile(profile);
    if (profile.profileKind === 'user') profiles.push(profile);
  }
  if (profiles.length > LIMITS.maxUserProfiles)
    throw new Error('User profile storage limit exceeded');
  return Object.freeze(profiles.sort((a, b) => a.profileId.localeCompare(b.profileId, 'en')));
}

export async function exportUserProfiles(): Promise<string> {
  return exportProfiles(await listUserProfiles());
}

export async function importUserProfiles(raw: string): Promise<readonly SiteProfile[]> {
  if (new TextEncoder().encode(raw).byteLength > LIMITS.maxProfileExportBytes)
    throw new Error('Profile import exceeds byte-size limit');
  const profiles = importProfiles(parseStrictJson(raw));
  const existing = await listUserProfiles();
  const merged = new Map(existing.map((profile) => [profile.profileId, profile]));
  for (const profile of profiles) {
    const current = merged.get(profile.profileId);
    if (!current || profile.profileVersion >= current.profileVersion)
      merged.set(profile.profileId, profile);
  }
  if (merged.size > LIMITS.maxUserProfiles) throw new Error('User profile storage limit exceeded');
  for (const profile of [...merged.values()].sort((a, b) =>
    a.profileId.localeCompare(b.profileId, 'en')
  ))
    await saveUserProfile(profile);
  return Object.freeze(
    [...merged.values()].sort((a, b) => a.profileId.localeCompare(b.profileId, 'en'))
  );
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
