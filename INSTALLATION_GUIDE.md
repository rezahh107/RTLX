# RTLX Installation and Local Package Guide

This guide explains how to create and use local installable RTLX browser packages from a fresh repository checkout.

## What `make_browser_zips.py` does

`make_browser_zips.py` is a root-level convenience wrapper for local package generation. It does not replace the release packager. Instead, it delegates to:

```bash
npm run build:release
```

The release packager remains the source of truth for browser ZIP creation and SHA256 artifact manifest generation.

When `node_modules` is missing, the wrapper also prepares dependencies using the same public npm registry safeguards used by CI:

```bash
npm ci --include=dev --ignore-scripts --no-audit --fund=false --registry=https://registry.npmjs.org/ --replace-registry-host=always
```

## Requirements

- Node.js 20 or newer
- npm
- Python 3

## Create installable packages

From the repository root, run:

```bash
python make_browser_zips.py
```

On Windows, use this if `python` is not mapped:

```bash
py make_browser_zips.py
```

If dependencies are already installed and you want to skip `npm ci`, run:

```bash
python make_browser_zips.py --skip-install
```

## Output location

The generated browser packages are written to:

```text
dist/artifacts/
```

Expected outputs for version `15.9.12`:

```text
dist/artifacts/rtlx-chromium-15.9.12.zip
dist/artifacts/rtlx-edge-15.9.12.zip
dist/artifacts/rtlx-firefox-15.9.12.zip
dist/artifacts/rtlx-firefox-android-15.9.12.zip
dist/artifacts/RTLX-v15.9.12-ARTIFACT-SHA256-MANIFEST.json
```

The ZIP files and `dist/` directory are generated artifacts and are intentionally ignored by git.

## Install in Chrome or Microsoft Edge

1. Extract `rtlx-chromium-15.9.12.zip` or `rtlx-edge-15.9.12.zip`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted extension folder containing `manifest.json`.

## Install temporarily in Firefox Desktop

1. Extract `rtlx-firefox-15.9.12.zip`.
2. Open `about:debugging`.
3. Select **This Firefox**.
4. Click **Load Temporary Add-on**.
5. Select `manifest.json` from the extracted Firefox package.

## Notes

- For normal local testing, use `make_browser_zips.py`.
- For CI-produced builds, download the `rtlx-development-builds` artifact from the latest green `CI Build` workflow run.
- Do not commit generated ZIP files back to the repository.
