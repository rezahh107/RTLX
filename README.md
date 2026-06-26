# RTLX 15.9.12 — Runtime Evidence Reliability and Installable Packages

RTLX 15.9.12 is a narrowly scoped reliability release. It preserves the existing RTL, typography, profile, permission, storage, and streaming behavior while improving runtime evidence contracts, CI reliability, and local installable package generation.

## Changes

- Popup failure reports remain downloadable for `RTLX-MESSAGE-005` and request-contract violations.
- Request and response diagnostics carry stable producer, handler, and message provenance without expanding healthy response envelopes.
- Canonical JSON rejects cycles and excessive depth with deterministic `TypeError` codes and paths; it never substitutes sentinel strings.
- Request-side validation uses the same request ID and privacy-bounded diagnostic model as response validation.
- CI rejects Chrome structured-clone manifest opt-in unless a dedicated transport suite exists.
- Exact-artifact harnesses write machine-readable pass/fail/insufficient-evidence JSON and now have bounded CDP command and process execution time.
- The Chromium content-runtime smoke fixture now uses a real local HTTP origin so strict hostname validation is exercised correctly.
- `make_browser_zips.py` provides a root-level convenience wrapper for creating installable browser ZIP packages after a fresh checkout.

## Unchanged boundaries

No site profile, selector, permission, storage schema, direction rule, typography rule, streaming behavior, or lifecycle implementation was changed.

## Build

```bash
npm ci
npm run check
npm run build:release
```

## Local installable browser ZIPs

After downloading or cloning the repository, run:

```bash
python make_browser_zips.py
```

On Windows, use this if `python` is not mapped:

```bash
py make_browser_zips.py
```

The script delegates package creation to `npm run build:release`, which is the project source of truth for browser package ZIP creation and artifact SHA256 manifest generation. It writes installable packages under:

```text
dist/artifacts/
```

Expected outputs:

```text
dist/artifacts/rtlx-chromium-15.9.12.zip
dist/artifacts/rtlx-edge-15.9.12.zip
dist/artifacts/rtlx-firefox-15.9.12.zip
dist/artifacts/rtlx-firefox-android-15.9.12.zip
dist/artifacts/RTLX-v15.9.12-ARTIFACT-SHA256-MANIFEST.json
```

These files are generated artifacts and are intentionally ignored by git.

For installation steps, see [`INSTALLATION_GUIDE.md`](INSTALLATION_GUIDE.md).

## Release evidence boundary

Implementation and deterministic validation are complete. Production release remains blocked until exact-artifact Chrome and Firefox Desktop runs pass in environments that can complete the optional-host-permission interaction.
