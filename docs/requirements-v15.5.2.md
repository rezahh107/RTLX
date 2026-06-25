# RTLX 15.5.2 Requirements — Persian UI and Typography Hardening

## RTLX-UI-1552-001 — Persian-first popup

The popup MUST be Persian-first, compact, and focused on the minimum user path: grant site, fix current tab, select site mode, and rollback.

Verification: `tests/unit/ui-persian-ux-v1552.test.ts`.

## RTLX-UI-1552-002 — Persian options help

The options page MUST include Persian usage guidance, typography controls, and local-font behavior disclosure.

Verification: `tests/unit/ui-persian-ux-v1552.test.ts`.

## RTLX-TYPO-1552-001 — Local Persian font preference

The content typography planner and extension UI MUST prefer installed Persian fonts via CSS `local()` before bundled fallback fonts, without adding `local-fonts` permission.

Verification: `tests/unit/font-policy-v14.test.ts`, `tests/unit/ui-persian-ux-v1552.test.ts`, `npm run test:browser-smoke`.

## RTLX-DIR-1552-001 — Auto-safe inherited LTR correction

In `auto-safe` mode, a high-confidence Persian candidate inherited from an LTR ancestor MAY receive `dir="rtl"` on the candidate itself. Automatic processing MUST NOT mutate `html` or `body`, and explicit local `dir` remains authoritative.

Verification: `tests/unit/direction-decider.test.ts`, `npm run test:browser-smoke`.
