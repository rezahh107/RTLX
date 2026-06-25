# RTLX 15.5.2 Architecture Delta — Persian UI and Typography Hardening

RTLX 15.5.2 is a personal-usability hardening release. It does not change the extension boundary, Profile Schema v3, storage architecture, telemetry policy, remote-code policy, or permission model.

## Runtime delta

The deterministic direction decision table now treats high-confidence Persian content inside an inherited LTR context as eligible for candidate-level `dir="rtl"` in `auto-safe` mode. The existing safeguards remain: automatic processing never mutates `html` or `body`, explicit local direction is preserved, protected zones are excluded, and rollback remains ownership-checked.

## Typography delta

The typography planner prepends a local Persian `@font-face` declaration that references installed fonts with CSS `local()` names. It does not enumerate fonts and does not request the browser `local-fonts` permission. Bundled Vazirmatn remains the deterministic fallback.

## UI delta

Popup and options pages are reorganized around Persian-first task flows. Advanced operations are collapsed, help text is visible in options, and typography/default-mode controls are surfaced without adding new permissions.
