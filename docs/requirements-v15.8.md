# RTLX 15.8 Requirements

## Functional requirements

- `RTLX-TEXT-BLOCK-001`: A structured semantic region MUST be decomposed into deterministic, DOM-ordered text blocks.
- `RTLX-TEXT-BLOCK-002`: Nested blocks MUST NOT cause duplicate mutation of the same natural-language content.
- `RTLX-DIRECTION-001`: Each text block MUST be classified independently.
- `RTLX-DIRECTION-002`: Base direction alignment MUST only be applied to a block-capable target.
- `RTLX-DIRECTION-003`: Inline targets MAY receive isolated `dir` but MUST NOT receive block alignment.
- `RTLX-ALIGNMENT-001`: Owned alignment MUST use logical `text-align: start`.
- `RTLX-TYPOGRAPHY-001`: Typography scanning MUST remain bounded per slice.
- `RTLX-TYPOGRAPHY-002`: A bounded scan MUST requeue unfinished blocks until no eligible uninspected Text node remains.
- `RTLX-TYPOGRAPHY-003`: Code, math, editor, terminal, icon, and layout-sensitive targets MUST remain protected.
- `RTLX-PROFILE-001`: Protective rule categories MUST take priority over content rules independent of JSON array position.
- `RTLX-EDITOR-001`: Bundled conversational editor rules MUST preserve site direction, alignment, and typography.

## Evidence requirements

- `RTLX-COVERAGE-001`: Runtime evidence MUST expose incomplete typography continuations.
- `RTLX-COVERAGE-002`: Runtime evidence MUST expose discovered-versus-processed text-block gaps after quiescence.
- `RTLX-INSPECTION-001`: Selected-element evidence MUST separate semantic region, text block, direction target, and alignment target.
- `RTLX-PRIVACY-001`: Coverage evidence MUST remain aggregate and MUST NOT include page text or HTML.

## Determinism requirements

- Text blocks MUST be emitted in DOM order.
- Profile precedence MUST use category rank, profile order, then stable `ruleId`.
- Serialized maps and reason counts MUST use sorted keys.
- Processing MUST remain idempotent under repeated discovery and mutation callbacks.
