# Migration Notes — RTLX 15.5.4 to 15.6.0

## Compatibility

RTLX 15.6.0 is backward compatible with 15.5.4 settings, profiles, personal backup data, optional host grants, and Profile Schema v3. No permission prompt is introduced by the update itself.

## Runtime behavior change

- Offscreen content is now processed in bounded background slices rather than waiting exclusively for scroll visibility.
- Large-page discovery resumes from a cursor instead of ending permanently at the first batch limit.
- Font ownership moves from candidate ancestors alone to safe Persian text-bearing leaves.
- Runtime snapshots advance from `1.1.0` to `1.2.0`; page-debug snapshots advance from `1.0.0` to `1.1.0`.
- FEC report schema remains `1.1.0`, but its runtime section can contain the newer runtime snapshot and its diagnostic list is now exact-document/runtime correlated.

## No migration action required

Users may replace/reload the unpacked extension. Existing site activation state and profiles remain valid. Reload affected tabs after updating so the new content runtime is created.

## Rollback

Downgrading to 15.5.4 does not require storage migration. A 15.6.0 runtime report may not validate in older code because the nested runtime snapshot version is newer; this does not alter saved page/profile data.
