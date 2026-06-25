# RTLX 15.9.9 — Diagnostic Reliability and Artifact Verification

RTLX 15.9.9 is a narrowly scoped reliability release over 15.9.7. It preserves the existing RTL, typography, profile, permission, storage, and streaming behavior while making message-contract failures diagnosable and bounded.

## Changes

- Popup failure reports remain downloadable for `RTLX-MESSAGE-005` and request-contract violations.
- Request and response diagnostics carry stable producer, handler, and message provenance without expanding healthy response envelopes.
- Canonical JSON rejects cycles and excessive depth with deterministic `TypeError` codes and paths; it never substitutes sentinel strings.
- Request-side validation uses the same request ID and privacy-bounded diagnostic model as response validation.
- CI rejects Chrome structured-clone manifest opt-in unless a dedicated transport suite exists.
- Exact-artifact harnesses write machine-readable pass/fail/insufficient-evidence JSON and now have bounded CDP command and process execution time.
- The Chromium content-runtime smoke fixture now uses a real local HTTP origin so strict hostname validation is exercised correctly.

## Unchanged boundaries

No site profile, selector, permission, storage schema, direction rule, typography rule, streaming behavior, or lifecycle implementation was changed.

## Build

```bash
npm ci
npm run check
npm run build:release
```

## Release evidence boundary

Implementation and deterministic validation are complete. Production release remains blocked until exact-artifact Chrome and Firefox Desktop runs pass in environments that can complete the optional-host-permission interaction.
