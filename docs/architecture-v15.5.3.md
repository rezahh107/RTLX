# RTLX 15.5.4 Architecture Delta — Mixed Typography and Page Debug Report

RTLX 15.5.4 is a targeted runtime and supportability hardening release. It does not change the extension boundary, Profile Schema v3, storage architecture, host-permission strategy, telemetry policy, remote-code policy, mutation ownership model, or rollback contract.

## Runtime typography delta

The content runtime now treats high-confidence `mixed` Persian/English technical text as typography-eligible when the same protected-zone and icon safeguards pass. This specifically covers pages that combine Persian prose with English technical terms, CSS identifiers, filenames, and inline code labels.

The runtime font stack now prefers the bundled mixed-text font face before the Persian local alias. The local Persian alias is restricted to Persian font names and no longer includes broad platform UI fonts such as `Segoe UI` or `Tahoma`; those fonts remain browser/platform fallbacks only after the bundled font path.

## Failure Evidence delta

The popup exposes a Persian page-debug action. The action is user-initiated, applies the current tab through the existing `activeTab`/scripting path, then captures the existing Failure Evidence report. No new extension permission is introduced.

The runtime snapshot adds a bounded `pageDebug` object. It is diagnostic metadata, not content evidence. It records injected-style presence, bundled font-face presence, owned candidate counts, first owned candidate direction and computed style summaries, and effective settings. It does not include page text, HTML, form values, cookies, site storage, network logs, console output, or screenshots.

## UI delta

The popup adds a primary Persian button for downloading a per-page debug report. Existing selected-element evidence remains optional and separate.
