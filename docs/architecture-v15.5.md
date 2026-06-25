# RTLX 15.5.0 Architecture Delta — Failure Evidence Capture

## Scope

RTLX 15.5.0 adds a bounded evidence-export path over existing runtime diagnostics. The feature is initiated from the popup and does not introduce a background collector, remote transport, persistent recording loop, or new permission.

## Data flow

```text
Popup user gesture
  → optional failure-element picker
  → content-side structural evidence
  → strict message validation
  → background eligibility/runtime/profile aggregation
  → canonical JSON + privacy manifest
  → popup preview
  → local download
```

## New components

- `src/shared/failure-evidence.ts`: URL classification, observation normalization, evidence validation, deterministic conclusion codes.
- `src/content/failure-evidence-picker.ts`: optional element selection and text-free structural/computed evidence.
- `src/background/failure-evidence.ts`: scoped selection storage, runtime/profile/diagnostic aggregation, canonical export.
- `schemas/failure-evidence.schema.json`: strict export envelope and privacy locks.
- Popup capture/preview/download controls.

## Trust boundaries

Page-derived evidence is treated as untrusted. Content-origin messages are schema-validated and authorized before storage. Selected evidence is scoped to tab, hostname, and pathname hash and is discarded after navigation mismatch or tab removal.

## Privacy boundary

The exporter preserves structural identifiers and text-shape counts only. It does not preserve page text, outerHTML, input values, cookies, site storage, network traffic, full URLs, query strings, fragments, or screenshots. User observations are separately labeled explicit input.

## Determinism

The report uses canonical JSON, stable key ordering, bounded collections, SHA-256 pathname hashing, fixed reason codes, and no locale-dependent serialization.
