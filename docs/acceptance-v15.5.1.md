# RTLX 15.5.2 Acceptance Criteria — Failure Evidence Capture Hardening

| ID       | Criterion                                                                                                 | Evidence state                              |
| -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| FEC-H001 | Stale selected-element evidence is rejected when document identity differs.                               | verified_by_unit_test                       |
| FEC-H002 | Runtime and fixture evidence share a single capture transaction.                                          | verified_by_unit_test_and_typecheck         |
| FEC-H003 | Discarded, loading, frozen, unreachable, timeout, invalid-response, and missing-tab states are preserved. | verified_by_unit_test                       |
| FEC-H004 | Runtime, fixture, selected-element, and profile sections use explicit status/reason envelopes.            | verified_by_schema_validation_and_unit_test |
| FEC-H005 | Sensitive selectors are redacted in Failure Evidence reports.                                             | verified_by_unit_test                       |
| FEC-H006 | Reports include capture provenance and canonical SHA-256 report hash.                                     | verified_by_unit_test_and_schema_validation |
| FEC-H007 | Per-section and whole-report size limits are enforced deterministically.                                  | verified_by_unit_test_and_schema_validation |

## Automated gates

The following gates must pass before delivery: format check, TypeScript typecheck, ESLint, reviewed-warning governance, schema validation, profile validation, unit tests, coverage thresholds, API adapter conformance, build, direct Chromium runtime smoke, manifest validation, Firefox lint, security scan, production dependency audit, store readiness, personal-install verifier, two-run release packaging, and clean source rebuild.

## External evidence not claimed

- Exact release-artifact Chromium execution is blocked in this environment by administrator policy.
- Edge and Firefox Desktop executables are unavailable.
- Firefox Android device or emulator evidence is unavailable.
- Store signing/validation, staged rollout rehearsal, installed update/rollback, eight-hour soak, and manual accessibility remain `insufficient_evidence`.
