# Migration Notes — RTLX 15.5.3 to 15.5.4

## Compatibility

RTLX 15.5.4 is backward compatible with 15.5.3 settings, profiles, personal backup data, and Profile Schema v3.

## User-visible changes

- The popup now has a clear activation switch for the current page.
- Turning it on prompts for the current site's optional permission and immediately applies RTLX.
- Turning it off disables the current site and rolls back owned RTLX changes.
- The debug-report button now attempts permission preflight before exporting evidence.

## Data and permissions

No migration is required. No new manifest permission is introduced. No telemetry or automatic upload is introduced.
