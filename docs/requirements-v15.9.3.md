# RTLX 15.9.3 Requirements

## Authoritative export decision

- `FAILURE-EXPORT-001`: The final content-runtime snapshot MUST be the authoritative input for failure-evidence export.
- `FAILURE-EXPORT-002`: A final snapshot with `captureReadiness.status=blocked` and reason `document_hidden` or `runtime_inactive` MUST NOT produce a report payload.
- `FAILURE-EXPORT-003`: The background MUST return `RTLX-CAPTURE-VISIBLE-TAB-REQUIRED` for the confirmed blocked conditions.
- `FAILURE-EXPORT-004`: The popup MUST NOT create a Blob or trigger a download for the blocked result.
- `FAILURE-EXPORT-005`: The existing popup preflight MAY remain for early feedback but MUST NOT be the authoritative export gate.

## Compatibility

- `FAILURE-EXPORT-006`: Final `ready` snapshots MUST retain the existing report output shape.
- `FAILURE-EXPORT-007`: Existing non-visibility `partial` report behavior MUST remain unchanged.
- `FAILURE-EXPORT-008`: Other blocked reasons MUST remain unchanged without additional evidence.

## Validation

- `FAILURE-EXPORT-TEST-001`: Tests MUST execute final-snapshot classification rather than search source text.
- `FAILURE-EXPORT-TEST-002`: Tests MUST prove that a blocked result does not invoke the download callback.
- `FAILURE-EXPORT-TEST-003`: Tests MUST prove that valid report data still invokes the existing download path.
