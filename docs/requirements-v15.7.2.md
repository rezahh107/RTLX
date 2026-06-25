# RTLX 15.7.2 Requirements

## Status

`implemented`

## Profile precision

- `PROFILE-PRECISION-001`: Qwen and DeepSeek SHALL use bundled profile version 2.
- `PROFILE-PRECISION-002`: Their v2 profiles SHALL NOT claim unverified message or conversation selectors.
- `PROFILE-PRECISION-003`: Their v2 profiles SHALL NOT apply blanket profile-level preservation to every anchor, button, label, or summary.
- `PROFILE-PRECISION-004`: Stable code, editor, math, and terminal protections MAY remain as protective hints.

## Semantic interactive content

- `SEMANTIC-INTERACTIVE-001`: A text descendant of a safe, text-only interactive control SHALL resolve to that control as its semantic owner.
- `SEMANTIC-INTERACTIVE-002`: Controls containing images, SVG, form fields, editors, live regions, or other complex descendants SHALL remain protected.

## Inline code

- `CODE-CONTEXT-002`: Block code and technical inline code SHALL preserve code typography and LTR behavior.
- `CODE-CONTEXT-003`: Natural-language inline code SHALL be classified from its text and semantic block instead of being blanket-excluded as code.

## Profile health

- `PROFILE-HEALTH-002`: Profile health schema SHALL be `1.1.0`.
- `PROFILE-HEALTH-003`: Each rule SHALL identify semantic or protective impact.
- `PROFILE-HEALTH-004`: A missing protective selector SHALL NOT by itself degrade a protective-only profile.
- `PROFILE-HEALTH-005`: Invalid or excessive selectors SHALL remain failures regardless of impact.

## Runtime evidence

- `RUNTIME-EVIDENCE-002`: Runtime snapshot schema SHALL be `1.4.0`.
- `RUNTIME-EVIDENCE-003`: Text-decision cache hits, misses, and stores SHALL be reported as bounded aggregate counters.
- `RUNTIME-EVIDENCE-004`: Discovery and processing metrics SHALL identify their lifetime scope; fixture counts SHALL identify current-DOM scope.
- `RUNTIME-EVIDENCE-005`: Rule-effectiveness aliases SHALL clarify selector matches, accepted rules, suppressed rules, committed mutation operations, and preserved direction.

## Failure evidence

- `FAILURE-EVIDENCE-008`: Failure Evidence Report schema SHALL be `1.2.0`.
- `FAILURE-EVIDENCE-009`: Capture completion and analytical completeness SHALL be separate fields.
- `FAILURE-EVIDENCE-010`: Stale selected-element evidence SHALL be cleared and reported as `no_data`.
- `FAILURE-EVIDENCE-011`: Degraded profile health and cleared stale selection SHALL generate privacy-safe deterministic diagnostics.
- `FAILURE-EVIDENCE-012`: Expected behavior text SHALL be derived from effective font and direction settings.
