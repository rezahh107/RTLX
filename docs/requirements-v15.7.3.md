# RTLX 15.7.3 Requirements

## Status

`implemented`

## Scope

RTLX 15.7.3 is a correctness patch over 15.7.2. It addresses a real Qwen regression in which RTL direction inherited from an RTLX-owned flex/grid ancestor moved SVG and `role="img"` controls across the layout.

## Frozen requirements

- `LAYOUT-SAFETY-001`: Direction mutation SHALL NOT target a flex/grid layout container when it contains icons, controls, a layout role, or clipping.
- `DIRECTION-TARGET-001`: Semantic analysis scope and direction mutation target SHALL be resolved separately.
- `DIRECTION-TARGET-002`: When a semantic block is layout-sensitive, RTLX SHALL prefer the nearest safe text-bearing descendant.
- `DIRECTION-TARGET-003`: If no safe text-bearing target exists, direction mutation SHALL be suppressed.
- `ICON-SAFETY-001`: `svg`, `use`, `img`, `[role="img"]`, and icon descendants SHALL NOT become direction or typography targets.
- `ICON-SAFETY-002`: Controls containing SVG/icon descendants SHALL preserve their own typography unless a safe text leaf can be targeted independently.
- `ICON-SAFETY-003`: Pseudo-element icon evidence and Private Use Area characters SHALL be protected from RTLX font replacement.
- `TYPOGRAPHY-LEAF-001`: Typography MAY be applied to a safe text leaf inside an icon-bearing control without modifying the control or icon.
- `DIAGNOSTICS-001`: Runtime evidence SHALL count layout-sensitive semantic blocks, redirected direction targets, and suppressed direction mutations.
- `DIAGNOSTICS-002`: Selected-element evidence SHALL identify inherited direction source, layout properties, and icon evidence without including page text.
- `DIAGNOSTICS-003`: Failure snapshot export SHALL flush the bounded diagnostic batch before returning.
- `ROLLBACK-001`: All new direction and typography mutations SHALL remain journaled and rollback-safe.
- `PRIVACY-001`: No page text, HTML snapshot, full URL, cookies, storage, network trace, or screenshot SHALL be added.
- `PATCH-SCOPE-001`: No permission, telemetry, remote-code, or custom-authoring surface SHALL be added.

## Verification state

- Real Qwen before/after evidence: `verified_root_cause_input`
- Layout-safe unit fixtures: `verified_by_unit_test`
- Synthetic flex/grid fixture: `verified_by_synthetic_fixture`
- Chromium runtime smoke: pending execution in release validation
- Same Qwen conversation with 15.7.3: `insufficient_evidence`
