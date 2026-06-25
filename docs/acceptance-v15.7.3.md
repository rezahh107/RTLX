# RTLX 15.7.3 Acceptance Criteria

## Direction safety

- A Persian text leaf inside an icon-bearing flex row receives RTL.
- The flex/grid parent does not receive `dir` or an RTLX direction class.
- SVG, `use`, and `[role="img"]` descendants keep their original direction and geometry.
- A clipped layout container with only direct text and controls is preserved when no safe text owner exists.
- A normal paragraph remains a valid direction target.

## Typography safety

- A safe Persian label leaf inside a button may receive the RTLX typography class.
- The button, SVG, `use`, and role-img elements do not receive the typography class.
- Pseudo-element icon fonts and PUA glyphs are preserved.

## Diagnostics

- Runtime Snapshot schema is `1.5.0`.
- Layout-safety counters are present and deterministic.
- Selected-element evidence reports inherited RTLX direction source and icon/layout evidence.
- Failure export flushes pending diagnostics before completion.

## Regression

- Existing direction, code protection, streaming, rollback, profile, permission, and packaging tests pass.
- Browser smoke asserts layout parent direction and icon rectangle remain unchanged.
