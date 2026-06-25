# Migration: RTLX 15.9.2 to 15.9.3

## User installation

1. Remove or disable the previous unpacked RTLX entry.
2. Load the 15.9.3 unpacked target.
3. Reload the target page or open a new tab.
4. Confirm version `15.9.3` in the extension manager.

## Data compatibility

No settings, profile, storage, report-schema, or permission migration is required.

## Report workflow

The popup still performs an early readiness check. The background now repeats the decisive check against the final content snapshot. If the target page becomes hidden or inactive during capture, no JSON report is generated and the popup asks the user to return to the target tab.
