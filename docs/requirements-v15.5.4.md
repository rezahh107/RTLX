# RTLX 15.5.4 Requirements — Per-Page Activation UX

## R-15.5.4-001 — Popup activation switch

The popup MUST expose a visible Persian on/off switch for the current page before advanced settings.

## R-15.5.4-002 — Enable flow

When the user turns the switch on for an eligible HTTP/HTTPS page, RTLX MUST request current-site optional host permission from the user gesture, persist an enabled site mode, and apply the current tab.

## R-15.5.4-003 — Disable flow

When the user turns the switch off, RTLX MUST persist `siteMode: disabled` for the current page scope and request rollback of owned mutations.

## R-15.5.4-004 — Debug report permission preflight

When the user requests the current-page debug report, RTLX SHOULD request current-site optional host permission first when possible, then apply the current tab and export Failure Evidence.

## R-15.5.4-005 — Frozen privacy boundary

The activation and debug flows MUST NOT add manifest permissions, telemetry, automatic upload, page text capture, full URL capture, DOM/HTML capture, form value capture, cookie capture, storage capture, network capture, console capture, or screenshot capture.
