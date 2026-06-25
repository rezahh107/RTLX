# RTLX 15.7.2 Stability Requirements

## Status

`implemented`

## Text-decision cache

- `CACHE-FINGERPRINT-001`: Cached inline text decisions SHALL compare the exact source text and a deterministic structural context fingerprint.
- `CACHE-FINGERPRINT-002`: The fingerprint SHALL include local direction, nearest language, profile identity/version, processor version, code context, matched rule, classification language, wrapping mode, candidate tag/role, and text-parent tag/role.
- `CACHE-FINGERPRINT-003`: A historical decision SHALL be reused only when the complete fingerprint matches; it MUST NOT act as independent direction evidence.
- `CACHE-FINGERPRINT-004`: Evaluated zero-token text nodes SHALL also be cached, so unchanged mixed-text candidates are not tokenized repeatedly.

## Cross-browser script injection

- `INJECTION-RESULT-001`: Programmatic content injection SHALL return a versioned outcome rather than `void`.
- `INJECTION-RESULT-002`: The outcome SHALL distinguish existing-runtime reprocessing, observed main-frame-only injection, and observed multi-frame injection.
- `INJECTION-RESULT-003`: Only observed successful frame IDs MAY be reported; missing-frame identities MUST NOT be guessed.
- `INJECTION-RESULT-004`: A successful result that does not confirm frame `0` SHALL fail closed.
- `INJECTION-RESULT-005`: Callback and Promise forms of `scripting.executeScript()` SHALL be normalized without double settlement.
- `INJECTION-RESULT-006`: Chrome-style total failure and Firefox/Safari-style partial success SHALL have deterministic tests.

## Runtime diagnostics separation

- `RUNTIME-EVIDENCE-001`: Aggregate classification, direction, non-modification, rule-effectiveness, and wrapper-lifecycle counters SHALL be owned by a dedicated collaborator.
- `RUNTIME-EVIDENCE-002`: Extracting the collaborator MUST preserve the existing `RuntimeSnapshot` schema and canonical field ordering.
- `RUNTIME-EVIDENCE-003`: The collaborator SHALL expose aggregate evidence only and MUST NOT retain candidate text or DOM records.

## Release scope

- `PATCH-SCOPE-001`: 15.7.2 is a correctness and cross-browser patch. It SHALL NOT add Custom Highlight UI, new permissions, remote code, telemetry, or new authoring surfaces.
- `PATCH-SCOPE-002`: Custom Highlight debug rendering remains proposed for a later feature release after exact-browser validation.
