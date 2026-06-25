# RTLX 15.7.0 Acceptance Criteria

## Direction and semantics

- [x] Nested inline text resolves to an existing semantic block.
- [x] Direction decisions return deterministic action/reason pairs.
- [x] Explicit local direction is preserved.
- [x] Automatic processing does not mutate `html` or `body` direction.
- [x] Persian/mixed blocks use RTL/right and confident Latin blocks use LTR/left.

## Code and controls

- [x] Block code remains LTR.
- [x] Technical inline code remains LTR-isolated.
- [x] Natural Persian inline code is not blanket-forced LTR.
- [x] Simple text-only interactive elements can be repaired.
- [x] Complex controls and protected zones remain excluded.

## Typography

- [x] Fresh Persian default is local-first with bundled Vazirmatn fallback.
- [x] Fresh Latin default is local Amazon Ember with bundled Inter fallback.
- [x] Amazon Ember binaries are absent from source and release packages.
- [x] Typography and direction remain separate decisions.

## Reporting and privacy

- [x] Popup exposes a report-only problem-area selector.
- [x] The selector does not save profile rules or mutate the selected target.
- [x] Runtime reports include bounded aggregate classification, direction, rule, wrapper, and font evidence.
- [x] Detailed selected-area evidence remains text-free and HTML-free.
- [x] No new permission, telemetry, automatic upload, or remote executable code is introduced.

## Verification

- [x] Targeted deterministic unit tests cover semantic blocks, code contexts, direction reasons, and report-only selection.
- [ ] Exact target-page validation on the user's Windows browser remains `insufficient_evidence` until externally executed.
