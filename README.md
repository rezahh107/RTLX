# RTLX

RTLX is a Manifest V3 browser extension for improving right-to-left Persian/Arabic-script reading and writing on mixed-language web pages while preserving left-to-right technical content such as code, URLs, commands, and identifiers.

Current version: `15.9.12`.

## What RTLX does

RTLX applies conservative, per-element RTL and Persian typography improvements on supported pages. It is designed for mixed Persian/English environments where the whole document must not be flipped.

Core behavior:

- Applies RTL direction correction to eligible content containers, not to the whole `html` or `body` document.
- Preserves code, technical identifiers, terminal/editor zones, math zones, URLs, file paths, email-like tokens, CLI flags, package names, and API signatures as LTR-safe content.
- Uses bidi isolation and owned wrapper/style markers so runtime changes can be tracked and cleaned up safely.
- Supports per-site and conversation-scoped settings.
- Uses bundled and user profile contracts for site-specific selectors and safety rules.
- Provides popup diagnostics and bounded failure evidence for troubleshooting.

## Supported browser targets

The build system produces packages for:

```text
dist/chromium
dist/edge
dist/firefox
dist/firefox-android
```

The installable ZIP packages are generated under:

```text
dist/artifacts/
```

## Browser permissions

The base extension manifest uses Manifest V3 and declares:

```text
permissions: activeTab, alarms, scripting, storage
optional_host_permissions: http://*/*, https://*/*
default_locale: fa
shortcut: Ctrl+Shift+Y / Command+Shift+Y
```

Host access is optional. The extension is designed to request host access only when needed for page processing.

## Privacy and security model

RTLX is privacy-bounded by design:

- Telemetry is disabled in the settings type contract and is not treated as an opt-out data stream.
- Diagnostics use bounded structured data rather than raw page text dumps.
- Failure evidence has explicit byte limits for runtime snapshots, selected elements, profile evidence, fixture summaries, and diagnostic counts.
- The extension CSP for extension pages is restricted to self-hosted scripts and disallows object sources.
- Generated release artifacts include SHA256 manifest verification through the release packaging flow.
- Remote profile delivery is disabled in the current constants contract.

## Architecture overview

Important source areas:

```text
src/content/                  content runtime, classifiers, mutation handling, streaming, evidence
src/background/               extension background services, profile/evidence handling
src/shared/                   shared contracts, constants, message contracts, typed runtime evidence
src/ui/popup/                 popup UI and user-facing controls
profiles/bundled/             bundled site profiles
schemas/                      JSON schemas and validation contracts
scripts/                      build, release, validation, security, and evidence tooling
tests/                        unit, security, regression, and browser/evidence tests
```

Key shared contracts:

- `src/shared/types-core.ts` contains settings, language, direction, profile, selector, rule, and diagnostic contracts.
- `src/shared/runtime-evidence-types.ts` contains performance, streaming, degradation, capture-readiness, runtime snapshot, element inspection, and failure evidence contracts.
- `src/shared/constants.ts` contains product version, schema versions, runtime limits, owned classes/attributes, and build flavor.

## Runtime evidence and diagnostics

RTLX records privacy-bounded runtime state for troubleshooting without expanding normal successful message envelopes. Runtime evidence includes:

- capture readiness status and reason codes;
- profile health and rule match status;
- streaming queue state;
- performance phase summaries;
- degradation level and dwell-time data;
- delayed work and backpressure snapshots;
- text block and typography coverage;
- selected element evidence with selector privacy handling;
- structured failure conclusion and reason code.

This evidence model exists to explain why a page was not modified, why a profile did not match, or why a capture is partial/blocked.

## Requirements

- Node.js `20` or newer
- npm
- Python 3, only for the convenience wrapper `make_browser_zips.py`

## Install dependencies

Use the same public-registry-safe dependency pattern used by CI when reproducibility matters:

```bash
node scripts/ci-sanitize-package-lock-registry.mjs
npm ci --include=dev --ignore-scripts --no-audit --fund=false --registry=https://registry.npmjs.org/ --replace-registry-host=always
```

For ordinary local development, this is usually enough:

```bash
npm ci
```

## Common commands

```bash
npm run format-check          # Prettier check
npm run typecheck             # TypeScript check
npm run lint                  # ESLint
npm run lint:warnings         # Warning audit
npm run validate:schemas      # JSON schema validation
npm run validate:profiles     # Bundled profile validation
npm run validate:message-serialization
npm run test                  # Unit test suite
npm run test:coverage         # Coverage run
npm run build                 # Build browser targets
npm run manifest:validate     # Validate generated manifests
npm run build:release         # Build ZIP packages and SHA256 manifest
npm run check                 # Full local quality gate
```

## Build unpacked browser targets

```bash
npm run build
npm run manifest:validate
```

Outputs:

```text
dist/chromium
dist/edge
dist/firefox
dist/firefox-android
```

These are useful for local unpacked extension testing.

## Create installable browser ZIPs

Recommended local command after downloading or cloning the repository:

```bash
python make_browser_zips.py
```

On Windows, use this if `python` is not mapped:

```bash
py make_browser_zips.py
```

The wrapper delegates package creation to:

```bash
npm run build:release
```

Expected outputs for version `15.9.12`:

```text
dist/artifacts/rtlx-chromium-15.9.12.zip
dist/artifacts/rtlx-edge-15.9.12.zip
dist/artifacts/rtlx-firefox-15.9.12.zip
dist/artifacts/rtlx-firefox-android-15.9.12.zip
dist/artifacts/RTLX-v15.9.12-ARTIFACT-SHA256-MANIFEST.json
```

`dist/`, `*.zip`, and `*.xpi` are generated artifacts and are intentionally ignored by git.

For installation steps, see [`INSTALLATION_GUIDE.md`](INSTALLATION_GUIDE.md).

## Install locally

Chrome or Microsoft Edge:

1. Build or extract the relevant package.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the built or extracted folder containing `manifest.json`.

Firefox Desktop temporary install:

1. Build or extract the Firefox package.
2. Open `about:debugging`.
3. Select **This Firefox**.
4. Select **Load Temporary Add-on**.
5. Choose the Firefox package `manifest.json`.

## CI model

The repository uses layered CI workflows:

- `CI Fast`: deterministic install, `format-check`, `typecheck`, `lint`, and `lint:warnings`.
- `CI Contracts`: release version validation, schema/profile validation, message serialization validation, and targeted regression/security tests.
- `CI Build`: deterministic install, browser target build, generated manifest validation, and `rtlx-development-builds` artifact upload.

The CI install path sanitizes package-lock registry URLs and forces the public npm registry before running `npm ci`.

## Release and artifact integrity

`npm run build:release` creates browser ZIP packages and a SHA256 manifest in `dist/artifacts`. The release packager uses deterministic ZIP metadata and verifies the generated manifest before reporting success.

CI build artifacts are available from the latest green `CI Build` workflow run under:

```text
rtlx-development-builds
```

## Development rules

When changing runtime behavior:

- Keep direction changes scoped to owned candidates; do not globally flip the document.
- Preserve LTR technical content and code zones.
- Keep diagnostic and evidence payloads privacy-bounded.
- Update shared contracts when implementation snapshot shapes change.
- Validate schemas, profiles, manifests, and message serialization after contract changes.
- Prefer typed contracts over `any` compatibility aliases.
- Keep generated artifacts out of git.

## Release evidence boundary

Implementation and deterministic validation are complete. Production release remains blocked until exact-artifact Chrome and Firefox Desktop runs pass in environments that can complete the optional-host-permission interaction.
