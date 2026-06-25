# Migration Notes — RTLX 15.5.2 to 15.5.4

## Compatibility

RTLX 15.5.4 is backward compatible with 15.5.2 settings, profiles, personal backup data, and Profile Schema v3.

## User-visible changes

- Mixed Persian/English technical content receives the Persian typography path when eligible.
- Bundled Vazirmatn/mixed-text font is preferred before broad Windows UI fallbacks.
- Popup includes a Persian debug-report button for the current page.

## Data and permissions

No migration is required. No new extension permission is introduced. No telemetry or automatic upload is introduced.

## Debug report use

When a page still does not render correctly, open the popup on that page and choose the Persian debug-report action. Send the generated JSON report to the maintainer for deterministic diagnosis. The report is designed to omit page text, full DOM/HTML, form values, cookies, site storage, network capture, console logs, and screenshots.
