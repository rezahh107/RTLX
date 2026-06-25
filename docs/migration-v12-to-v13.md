# Migration Guide: RTLX v12 to v14

## Browser baseline change

Firefox minimum version changes from 121 to 140 on desktop and 142 on Android. This supports the v14 optional-host-permission and built-in data-consent manifest contracts. Chromium remains 121+.

## Profile schema migration

Profile schema changes from `1.0.0` to `2.0.0`.

New required fields:

- `profileKind`
- `displayName`
- `metadata`
- selector groups `math`, `editor`, and `terminal`

The versioned normalizer accepts a strict legacy v1 user profile and deterministically maps missing groups to empty arrays. The migrated profile is marked:

```json
{
  "profileKind": "user",
  "metadata": {
    "source": "imported",
    "verification": "unverified",
    "product": null
  }
}
```

No unknown v1 shapes are repaired silently.

## Storage

Existing global settings remain on the v1 settings contract. Per-site settings gain optional `lastEnabledSiteMode` so one-click disable can restore the previous enabled state.

User profiles are stored under `rtlx:user-profile:<hostname>` in local extension storage. Page text is never stored.

## Manifest and commands

Version becomes `14.0.0`. Firefox receives the stable GUID and minimum desktop version 140 and Android version 142. The new `toggle-current-site` command has a suggested shortcut that users may reconfigure through browser extension shortcut settings.

## Rollback

Before upgrading a loaded unpacked v12 build, disable it or invoke rollback. Then load the v14 build. v14 operation ownership uses `RTLX-14.0.0`; it does not claim or rewrite unrelated site mutations.
