import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, migrateSettings, mergeSettings } from '../../src/shared/settings';
describe('settings migration', () => {
  it('uses safe defaults', () => expect(migrateSettings(null)).toEqual(DEFAULT_SETTINGS));
  it('forces telemetry false', () =>
    expect(migrateSettings({ telemetry: true }).telemetry).toBe(false));
  it('applies per-site precedence', () =>
    expect(mergeSettings(DEFAULT_SETTINGS, { siteMode: 'disabled' }).siteMode).toBe('disabled'));
});
