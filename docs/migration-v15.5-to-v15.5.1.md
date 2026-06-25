# Migration Guide — RTLX 15.5.0 to 15.5.2

1. Build or download the RTLX 15.5.2 package for the target browser.
2. For personal Chromium/Edge installs, install into the same fixed local directory used by the personal installer.
3. Existing profiles and personal backups remain compatible. Profile Schema stays at `3.0.0`.
4. Existing Failure Evidence reports with schema `1.0.0` remain historical evidence. New reports use schema `1.1.0` and include section envelopes, capture provenance, selector privacy metadata, and report hashing.
5. No user data migration is required. Stale selected-element evidence saved by older versions is discarded during new report assembly instead of being reused.

## Compatibility notes

- Manifest permissions are unchanged.
- Bundled profile files are unchanged.
- Release artifact names now use `15.5.2`.
- Store-side signing, staged rollout, and installed update/rollback still require external release infrastructure evidence.
