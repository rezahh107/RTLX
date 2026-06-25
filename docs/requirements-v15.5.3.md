# RTLX 15.5.4 Requirements — Mixed Persian Typography and Page Debug Report

## RTLX-TYPO-1553-001 — Mixed Persian typography eligibility

When a candidate is classified as `mixed` and contains sufficient Persian evidence, typography planning MUST be eligible under the same protection checks used for `persian`. The rule MUST NOT make Arabic, Hebrew, Urdu, or unrelated RTL text eligible merely because the script is right-to-left.

Verification: `tests/unit/typography-mixed-v1553.test.ts`, `tests/unit/font-policy-v14.test.ts`, `npm run test:browser-smoke`.

## RTLX-TYPO-1553-002 — Bundled Persian font priority

The runtime typography family MUST prefer the bundled mixed-text/Vazirmatn font face before broad platform UI fallbacks. The Persian local-font alias MUST NOT include broad Windows UI fonts such as `Segoe UI` or `Tahoma`, because those can block the bundled Persian font from being used.

Verification: `tests/unit/typography-mixed-v1553.test.ts`, `tests/unit/font-policy-v14.test.ts`, `npm run test:browser-smoke`.

## RTLX-FEC-1553-001 — User-triggered page debug report

The popup MUST expose a Persian primary action that applies RTLX to the current tab, captures the current runtime evidence, and downloads a local JSON debug report. The report MUST remain user-initiated and local-only. It MUST NOT add telemetry, automatic upload, screenshot capture, full DOM/HTML capture, page text capture, form-value capture, cookie capture, site-storage capture, network capture, or console capture.

Verification: `tests/unit/ui-persian-ux-v1552.test.ts`, `tests/unit/failure-evidence-schema-v1551.test.ts`, `npm run test:browser-smoke`.

## RTLX-FEC-1553-002 — Runtime page-debug snapshot

Failure Evidence runtime snapshots MUST include bounded, text-free page-debug facts sufficient for support triage: whether the injected style exists, whether the bundled font-face rule is present, owned candidate/wrapper counts, first owned candidate direction, computed text alignment, computed font family, and active typography/site-mode settings.

Verification: `tests/unit/failure-evidence-schema-v1551.test.ts`, `npm run test:browser-smoke`.

## RTLX-PERM-1553-001 — Permission boundary preservation

The release MUST NOT add `downloads`, `local-fonts`, broad mandatory host permissions, `debugger`, telemetry, or remote executable-code permissions. The debug report download MUST be implemented from a user action without requiring the `downloads` extension API.

Verification: `npm run manifest:validate`, `npm run security:scan`, `npm run store:readiness`.
