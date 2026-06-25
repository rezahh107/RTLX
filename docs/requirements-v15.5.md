# RTLX 15.5.0 Requirements — Failure Evidence Capture

Status: approved and implemented

This release adds a user-initiated, privacy-bounded evidence export for pages where RTLX does not behave as expected. It does not add remote services, telemetry, new host permissions, automatic repair, or a parallel analysis engine.

## FEC-001 — Page eligibility probe

Classify the active page as eligible, permission-missing, browser-restricted, or unsupported. Preserve only scheme, hostname, pathname depth, and SHA-256 of pathname. Never preserve query or fragment.

## FEC-002 — One-click failure export

From the popup, generate a canonical JSON report only after an explicit user action. The report must be previewable before download and must never upload automatically.

## FEC-003 — Selected-element evidence

Allow an optional picker to capture only structural identifiers, computed style facts, classification decisions, frame/shadow depth, mutation ownership counts, and text-shape counts. Do not export element text, HTML, form values, clipboard data, cookies, or site storage.

## FEC-004 — Profile-rule evidence

Include the active profile, profile version/source, profile health, matched rule IDs, accepted/suppressed rule context, and the selected element classification decision when available.

## FEC-005 — Runtime and performance snapshot

Reuse existing bounded runtime, fixture, diagnostics, lifecycle, queue, backpressure, performance, and ownership evidence. Do not start continuous recording.

## FEC-006 — User expected/actual note

Accept optional user-authored expected and actual observations, normalized and bounded to 2,000 characters each. These are explicit user input, not automatic page-text collection.

## FEC-007 — Preview and privacy manifest

Display the exact JSON before download. Include an explicit privacy manifest whose fields certify that page text, full URL, query, fragment, form values, cookies, site local storage, network capture, screenshots, and automatic upload are absent.

## FEC-008 — Restricted-page classification

Produce a useful restricted-page report even when the browser forbids content-script execution. Do not attempt to bypass browser-protected schemes or domains.

## Frozen boundaries

- No new language support.
- No new host permissions.
- No remote executable code or remote classifier.
- No telemetry or automatic upload.
- No full DOM/HTML export.
- No automatic screenshot, console interception, or network logging.
- No automatic selector repair.
- Profile Schema v3 remains unchanged.
- Automatic processing still never sets `dir` on `html` or `body`.
