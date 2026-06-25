# RTLX 15.7.0 Precision Direction Requirements

## Status

`implemented`

## Deterministic content evidence

- `SEMANTIC-BLOCK-001`: Text nodes SHALL provide evidence, while base direction SHALL be applied to a bounded semantic block.
- `SEMANTIC-BLOCK-002`: Resolution SHALL prefer an existing text-bearing block and MUST NOT promote to `html` or `body`.
- `DIRECTION-EXPLAIN-001`: Every direction decision SHALL expose a stable action and reason code.
- `DIRECTION-EXPLAIN-002`: `document.lang` MAY be recorded as context but MUST NOT be a strong per-block direction signal.
- `DIRECTION-DETERMINISM-001`: Direction scoring SHALL be deterministic, versioned, and free of opaque learned weights.

## Code and interactive text

- `CODE-CONTEXT-001`: Block code SHALL remain LTR and typography-preserved.
- `CODE-CONTEXT-002`: Inline technical code SHALL remain isolated LTR.
- `CODE-CONTEXT-003`: Inline natural Persian text SHALL not be blanket-forced LTR and SHALL use bounded automatic isolation.
- `INTERACTIVE-TEXT-001`: Simple text-only links, labels, summaries, and buttons MAY receive direction and typography repair.
- `INTERACTIVE-TEXT-002`: Complex controls containing icons, media, live regions, editors, or form controls SHALL remain protected.

## Typography

- `LOCAL-FONT-DEFAULT-001`: Fresh settings SHALL prefer locally installed Vazirmatn/Vazir families, then bundled Vazirmatn.
- `LOCAL-FONT-DEFAULT-002`: Fresh settings SHALL prefer local Amazon Ember Display/Amazon Ember, then bundled Inter.
- `LOCAL-FONT-LICENSE-001`: Amazon Ember binaries MUST NOT be bundled or downloaded without verified redistribution authorization.
- `FONT-DIAGNOSTICS-001`: Reports SHALL distinguish declaration/load/cascade evidence from exact local font-file identity, which remains unknown.

## Ownership and recovery

- `OWNERSHIP-HYBRID-001`: Runtime metadata MAY use weak references, but rollback SHALL continue to rely on the mutation journal and minimal owned markers.
- `WRAPPER-MINIMAL-001`: Existing blocks SHALL be preferred over wrappers; wrappers are allowed only for bounded inline isolation and MUST be rollback-owned.
- `MUTATION-INCREMENTAL-001`: Mutation recovery SHALL process coalesced changed roots rather than trigger an unconditional full-page scan.

## Diagnostics and focused UX

- `REPORT-POINT-001`: The popup SHALL allow the user to mark one unfixed area for a report.
- `REPORT-POINT-002`: Marking an area MUST NOT create a site rule, mutate the selected element, or reactivate advanced authoring.
- `REPORT-POINT-003`: Selected-area evidence SHALL exclude page text, HTML, raw sensitive selector tokens, form values, storage, network, console, and screenshots.
- `REPORT-AGGREGATE-001`: Normal reports SHALL contain bounded aggregate classifications, decisions, non-modification reasons, rule effectiveness, wrapper lifecycle, and font status.
- `REPORT-DETAIL-001`: Detailed evidence SHALL be limited to the user-selected problem area and exact runtime/document provenance.
