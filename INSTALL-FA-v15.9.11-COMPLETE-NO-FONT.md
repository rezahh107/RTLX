# RTLX v15.9.11 no-font local install

This package is the no-font-binaries local-install handoff for RTLX v15.9.11.

## Chrome and Edge

1. Extract the package.
2. Open the browser extensions page.
3. Enable Developer mode.
4. Choose Load unpacked.
5. Select one target directory:
   - install/unpacked/chromium
   - install/unpacked/edge

## Firefox Desktop

Use install/unpacked/firefox or the Firefox ZIP only for local runtime testing. This version is not public-store-ready.

## Font status

All .woff2 font binaries are intentionally omitted. This build uses installed system fonts or browser fallbacks.

## Local retest criteria

- profileHealth.status must be healthy.
- captureReadiness.status must be ready.
- typography.verificationFailures must be 0.
- degradationLevel must be 0.
- privacy page text, full URL, query, and cookies must not be included.

## Checksums

See install/checksums/SHA256SUMS-install-zips.txt in the complete package.
