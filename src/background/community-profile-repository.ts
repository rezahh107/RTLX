import { storageGetAll } from '../shared/api-adapter';
import { normalizeProfile, validateProfile } from '../shared/profile-schema';
import type { PublicKeyRegistry, SiteProfile } from '../shared/types';
import { verifyProfileEnvelope } from './profile-verifier';
import { runStorageTransaction } from './storage-transaction';

const PREFIX = 'rtlx:community-profile:';

export async function importSignedCommunityProfile(raw: string): Promise<SiteProfile> {
  const registry = await loadKeyRegistry();
  if (registry.verificationState !== 'verified' || registry.keys.length === 0)
    throw new Error('Signed community profile keys are not configured');

  const existing = await listCommunityProfiles();
  const parsed = JSON.parse(raw) as { profileId?: unknown };
  const current =
    typeof parsed.profileId === 'string'
      ? existing.find((profile) => profile.profileId === parsed.profileId)
      : undefined;
  const profile = await verifyProfileEnvelope(
    raw,
    registry,
    new Date(),
    current?.profileVersion ?? 0
  );
  if (
    profile.metadata.source !== 'community' ||
    profile.metadata.verification !== 'signature-verified'
  )
    throw new Error('Signed community profile provenance invalid');

  await runStorageTransaction({
    kind: 'import-community-profile',
    setItems: { [`${PREFIX}${profile.profileId}`]: profile },
  });
  return profile;
}

export async function listCommunityProfiles(): Promise<readonly SiteProfile[]> {
  const values = await storageGetAll('local');
  const profiles: SiteProfile[] = [];
  for (const [key, value] of Object.entries(values).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    if (!key.startsWith(PREFIX)) continue;
    const profile = normalizeProfile(value);
    validateProfile(profile);
    if (
      profile.metadata.source === 'community' &&
      profile.metadata.verification === 'signature-verified'
    )
      profiles.push(profile);
  }
  return Object.freeze(profiles.sort((a, b) => a.profileId.localeCompare(b.profileId, 'en')));
}

async function loadKeyRegistry(): Promise<PublicKeyRegistry> {
  const response = await fetch(chrome.runtime.getURL('profiles/keys/public-keys.v1.json'), {
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Public key registry unavailable');
  const value = (await response.json()) as PublicKeyRegistry;
  if (
    value.schemaVersion !== '1.0.0' ||
    value.registryVersion !== 1 ||
    !Array.isArray(value.keys) ||
    (value.verificationState !== 'verified' && value.verificationState !== 'insufficient_evidence')
  )
    throw new Error('Public key registry invalid');
  return value;
}
