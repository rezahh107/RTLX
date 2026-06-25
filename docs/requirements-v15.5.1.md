# RTLX 15.5.2 Requirements — Failure Evidence Capture Hardening

Status: approved and implemented

This patch release implements the verified Phase A findings `WOLF-001` through `WOLF-007`. It does not add permissions, telemetry, automatic upload, remote executable code, new language support, full DOM/HTML capture, screenshots, or Profile Schema v3 changes.

## FEC-H001 — Exact selected-element provenance

Selected-element evidence stored for Failure Evidence Capture must include the current content document identity. Report assembly must only use the saved selection when `tabId`, `frameId`, `browserDocumentId`, content document instance, and document generation still match the current registry entry. Stale legacy selections must be cleared rather than reused.

## FEC-H002 — Single capture transaction

Runtime and fixture evidence in one Failure Evidence report must be collected under one `captureId` and one content-script command. A report must not silently combine multiple page moments for these sections.

## FEC-H003 — Tab delivery reason preservation

Content delivery must preserve deterministic states for delivered, discarded, loading, frozen, unreachable, timeout, invalid response, and missing tab. Failure conclusion codes must distinguish these states where they affect the diagnosis.

## FEC-H004 — Section envelopes

Nullable sections must be replaced by explicit envelopes containing `status`, `reasonCode`, `provenance`, `capturedAt`, and `data`. A missing section, unavailable section, timeout, invalid response, validation failure, and size-limit exclusion must remain distinguishable.

## FEC-H005 — Failure-report selector privacy

Failure Evidence reports must redact selectors that contain email-like, long numeric, or account-like tokens. This redaction is report-specific and must not change normal picker behavior, selector generation, or mutation ownership logic.

## FEC-H006 — Report integrity and provenance

Every generated report must include a `captureId`, `schemaVersion`, `canonicalizationVersion`, `hashAlgorithm`, deterministic `reportHash`, and section provenance. The hash must be computed over canonical report content with the hash field set to `null`.

## FEC-H007 — Deterministic size limits

Failure Evidence reports must enforce versioned per-section budgets and a whole-report hard limit. Oversize optional sections must be excluded with explicit size-limit reason codes instead of producing an unbounded report.

## Preserved boundaries

- Profile Schema remains `3.0.0`.
- Manifest permissions are unchanged.
- Automatic processing still never changes `dir` on `html` or `body`.
- No page text, source HTML, form values, cookies, site storage, console, network traffic, screenshot, or automatic upload is added.
