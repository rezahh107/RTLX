# RTLX 15.5.0 Acceptance Criteria — Failure Evidence Capture

| ID      | Criterion                                                                                          | Evidence state                                                                                |
| ------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| FEC-001 | Eligible, restricted, unsupported, and permission-missing pages are classified deterministically.  | verified_by_unit_test                                                                         |
| FEC-002 | A user action creates previewable canonical JSON with no automatic upload.                         | verified_by_unit_test_and_build                                                               |
| FEC-003 | Selected-element evidence contains text shape and computed/structural facts but not source text.   | verified_by_unit_test                                                                         |
| FEC-004 | Active profile, health, matched rules, and selected-element decisions are included when available. | verified_by_implementation_and_typecheck                                                      |
| FEC-005 | Existing bounded runtime, fixture, diagnostics, lifecycle, and performance snapshots are reused.   | verified_by_unit_test_and_runtime_smoke                                                       |
| FEC-006 | Expected/actual notes are normalized and limited to 2,000 characters.                              | verified_by_unit_test                                                                         |
| FEC-007 | Privacy manifest is schema-locked to false for prohibited capture categories.                      | verified_by_schema_validation                                                                 |
| FEC-008 | Restricted pages produce a local classification report without injection bypass.                   | verified_by_unit_test; real-browser restricted-page interaction remains insufficient_evidence |

## Automated gates

- Format, TypeScript, ESLint warning governance, schemas, profiles, tests, coverage, adapter conformance, build, Chromium runtime smoke, manifest validation, Firefox lint, security scan, and dependency audits must pass.
- Four release packages must be deterministic across two independent runs.
- Font-sanitized source reproduction must rebuild the same four artifact hashes.

## External evidence not claimed

- Manual live-site failure capture on every browser.
- Manifest-loaded interaction on browser-protected pages.
- Universal repair effectiveness for arbitrary sites.
