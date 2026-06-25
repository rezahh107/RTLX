# RTLX 15.5.2 Architecture Delta — Failure Evidence Capture Hardening

RTLX 15.5.2 is a narrow hardening release for the existing user-initiated Failure Evidence Capture path. It preserves the browser-extension architecture, manifest permissions, Profile Schema v3, and privacy boundary.

## Changed components

### Background Failure Evidence Capture

The background report assembler now creates a transaction-level `captureId`, requests runtime and fixture data through a single content command, validates content response shapes, wraps each optional section in a status envelope, and computes a canonical SHA-256 report hash.

### Document identity registry

The document registry exposes current document identity checks. Saved selected-element evidence is accepted only when the saved identity still matches the current tab/frame/document generation. Legacy selections without full provenance are cleared as stale.

### Tab lifecycle delivery

Tab messaging now has a detailed delivery result for Failure Evidence Capture. It preserves discarded, loading, frozen, timeout, invalid-response, missing-tab, and unreachable states without changing the legacy `sendTabCommand` behavior used by existing callers.

### Content runtime command

A bounded `RTLX_FAILURE_SNAPSHOT` command returns runtime and fixture summaries from the same content-script moment. It does not include page text, HTML, form values, cookies, storage, network, console, or screenshots.

### Shared Failure Evidence schema

The Failure Evidence report schema advances to `1.1.0`. Section envelopes, capture provenance, report hashing, selector privacy, delivery status, and size-limit diagnostics are schema-visible.

## Boundaries preserved

- No new permission or host-access model.
- No remote executable code, telemetry, or automatic upload.
- No change to selector generation outside Failure Evidence report redaction.
- No change to mutation ownership, rollback semantics, Profile Schema v3, or automatic `dir` rules.
