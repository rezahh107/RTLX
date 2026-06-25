# RTLX 15.9.8 Requirements

- `R1598-001`: Popup report download MUST remain available for response and request contract violations.
- `R1598-002`: `RTLX-MESSAGE-005` MUST have deterministic popup coverage including a downloaded privacy-bounded report.
- `R1598-003`: Diagnostic contract issues MUST include stable producer, handler ID, and message type; healthy envelopes MUST NOT gain these fields.
- `R1598-004`: Canonical JSON MUST throw deterministic `TypeError` for active-path cycles and depth beyond `LIMITS.maxCanonicalJsonDepth`.
- `R1598-005`: Canonical validation MUST NOT sanitize invalid values into sentinel strings.
- `R1598-006`: Request-side diagnostics MUST preserve the request ID used by the rejected request.
- `R1598-007`: CI MUST fail if Chrome structured-clone manifest opt-in exists without dedicated transport tests.
- `R1598-008`: Exact-artifact Chrome and Firefox Desktop attempts MUST emit machine-readable JSON evidence even on failure or environmental blockage.
- `R1598-009`: Product lifecycle, profile, selector, permission, storage, direction, typography, and streaming behavior MUST remain unchanged.
