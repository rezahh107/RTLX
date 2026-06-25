# Using Failure Evidence Capture

1. Visit the page where RTLX does not work correctly.
2. Open the RTLX popup.
3. Optionally choose **Select broken element**, then click the affected element.
4. Reopen the popup and describe the expected and actual behavior.
5. Choose **Build report preview**.
6. Review the JSON and privacy manifest.
7. Download the report and provide it to the engineering model together with an optional manually reviewed screenshot.

## What the report contains

- Capture ID, report schema version, canonicalization version, and SHA-256 report hash.
- Browser/extension identity and operational state.
- Page eligibility, hostname, path depth, and a path hash.
- Active profile and profile-health evidence.
- Bounded runtime, performance, queue, lifecycle, fixture, and diagnostics evidence in explicit status/reason envelopes.
- Optional structural evidence for the selected element, with stale document selections discarded and sensitive selectors redacted in reports.
- Your expected/actual notes.

## What it excludes

- Page or conversation text.
- Full URLs, query strings, and fragments.
- HTML/DOM dumps.
- Passwords, input values, cookies, clipboard, and site local storage.
- Network and console logs.
- Automatic screenshots.
- Automatic upload.

A restricted-page result means the browser blocked extension execution; it does not prove an RTLX selector or classifier defect.
