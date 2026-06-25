# Migration: RTLX 15.9.1 to 15.9.2

## User installation

1. Remove or disable the previous unpacked RTLX entry.
2. Load the 15.9.2 unpacked target.
3. Reload the target page or open a new tab.
4. Confirm version `15.9.2` in the extension manager.
5. Keep the target tab visible while creating a problem report.

## Profile compatibility

The site-profile v3 structure accepts two new optional rule fields: `healthExpectation` and `alternativeGroup`. Existing profiles remain valid and retain required standalone semantic health behavior by default.

The bundled `official:chatgpt` profile advances from profile version 2 to 3. Selectors and runtime precedence are unchanged; only health expectations are annotated.

## Report workflow

When the target document is hidden or inactive, the popup now asks the user to return to the target tab instead of exporting a known blocked report.

## No data migration

Settings, activation records, local font preferences, and existing profile IDs require no migration.
