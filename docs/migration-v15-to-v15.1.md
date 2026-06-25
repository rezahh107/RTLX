# Migration Guide — RTLX 15.0.0 to 15.1.0

## User migration

No manual user migration is required. Existing settings, per-site scope, bundled profiles, user profiles, Profile Schema v3 documents, history, and rollback ownership data remain compatible.

## Internal data behavior

RTLX 15.1 adds versioned storage-transaction markers for durable writes. Startup recovery replays prepared writes/removals idempotently and clears committed markers. Session storage is preferred for temporary markers; local storage is the deterministic fallback when `storage.session` is unavailable. Existing v15 data is read without conversion.

Runtime snapshots advance to schema `1.1.0`. Consumers that parse snapshots must accept the added lifecycle, backpressure, degradation, delay, visibility, diagnostic, observer, and signature fields. Profile and settings schemas do not break.

## Developer/build migration

```bash
npm ci
npm run check
npm run build:release
```

The canonical Vitest commands use one deterministic fork to avoid worker teardown instability under the stress suite. Font binaries are intentionally absent from the sanitized source package; `npm run build` vendors exact Vazirmatn and Inter assets from lockfile-pinned dependencies and verifies hashes. Amazon Ember remains local-only.

The manifest-loaded E2E commands are:

```bash
npm run test:manifest-e2e:chromium
npm run test:manifest-e2e:edge
npm run test:manifest-e2e:firefox
```

Set `CHROMIUM_BIN`, `EDGE_BIN`, or `FIREFOX_BIN` when binaries are outside `PATH`. Environment policy or missing browser executables produce explicit `insufficient_evidence` reports.

## Rollback compatibility

The v15 journal and ownership identifiers are intentionally retained where they identify DOM ownership across upgrades. Rollback remains idempotent and ownership-checked. No automatic selector repair or profile rewrite occurs.
