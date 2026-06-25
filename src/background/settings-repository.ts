import { storageGet } from '../shared/api-adapter';
import {
  DEFAULT_SETTINGS,
  conversationStorageKey,
  migrateSettings,
  siteStorageKey,
} from '../shared/settings';
import type { PerSiteSettings, Settings, SiteProfile } from '../shared/types';
import { persistSyncCoordinated } from './sync-coordinator';

const GLOBAL_KEY = 'rtlx:settings';

export async function getSettings(): Promise<Settings> {
  const stored = await storageGet<unknown>('sync', GLOBAL_KEY);
  const migrated = migrateSettings(stored);
  if (stored === undefined || JSON.stringify(stored) !== JSON.stringify(migrated))
    await persistSync('migrate-settings', { [GLOBAL_KEY]: migrated });
  return migrated;
}

export async function setSettings(settings: Settings): Promise<void> {
  await persistSync('set-settings', { [GLOBAL_KEY]: migrateSettings(settings) });
}

export async function resetSettings(): Promise<Settings> {
  await persistSync('reset-settings', { [GLOBAL_KEY]: DEFAULT_SETTINGS });
  return DEFAULT_SETTINGS;
}

export async function getSiteSettings(hostname: string): Promise<PerSiteSettings | undefined> {
  return storageGet<PerSiteSettings>('sync', siteStorageKey(hostname));
}

export async function setSiteSettings(hostname: string, settings: PerSiteSettings): Promise<void> {
  await persistSync('set-site-settings', { [siteStorageKey(hostname)]: settings });
}

export async function getScopedSettings(
  hostname: string,
  pathname: string,
  profile: SiteProfile | null
): Promise<PerSiteSettings | undefined> {
  const site = await getSiteSettings(hostname);
  const mode = site?.settingsScope ?? profile?.scopePolicy.mode ?? 'site';
  if (mode !== 'conversation') return site;
  const key = await scopeKey(hostname, pathname, profile?.scopePolicy.pathDepth ?? 2);
  const scoped = await storageGet<PerSiteSettings>('sync', key);
  return scoped ? { ...(site ?? {}), ...scoped } : site;
}

export async function setScopedSettings(
  hostname: string,
  pathname: string,
  profile: SiteProfile | null,
  settings: PerSiteSettings
): Promise<void> {
  const mode = settings.settingsScope ?? profile?.scopePolicy.mode ?? 'site';
  if (mode === 'site') {
    await setSiteSettings(hostname, settings);
    return;
  }
  const key = await scopeKey(hostname, pathname, profile?.scopePolicy.pathDepth ?? 2);
  await persistSync('set-scoped-settings', { [key]: settings });
}

export async function scopeKey(
  hostname: string,
  pathname: string,
  depth: 1 | 2 | 3
): Promise<string> {
  const normalized = normalizedScopePath(pathname, depth);
  const bytes = new TextEncoder().encode(`${hostname.toLowerCase()}\n${normalized}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  return conversationStorageKey(hostname, hash);
}

export function normalizedScopePath(pathname: string, depth: 1 | 2 | 3): string {
  const normalized = pathname
    .split('/')
    .filter(Boolean)
    .slice(0, depth)
    .map((part) => part.slice(0, 128))
    .join('/');
  return `/${normalized}`;
}

function persistSync(kind: string, setItems: Readonly<Record<string, unknown>>): Promise<void> {
  return persistSyncCoordinated(kind, setItems);
}
