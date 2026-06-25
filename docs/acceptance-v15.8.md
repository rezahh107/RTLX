# RTLX 15.8 Acceptance Criteria

## Unit and synthetic fixtures

- A region containing heading, paragraphs, list items, quote, inline code, and an action row emits only the ordered natural-language text blocks.
- Nested `li > p` content is not mutated twice.
- An inline direction target receives `dir` without a direction-alignment class.
- A block direction target receives logical `text-align: start`.
- A region with more than 100 eligible Text nodes completes across multiple bounded typography slices.
- A changed typography context invalidates the Text-node fingerprint.
- An editor rule wins over a broad content ancestor even when the content rule appears first in JSON.
- Every bundled editor rule preserves direction, alignment, and typography.

## Runtime acceptance

After quiescence:

```yaml
pending_candidates: 0
pending_discovery_roots: 0
typography_continuations_pending: 0
text_blocks_processed_equals_discovered: true
verification_failures: 0
```

For a Qwen-like structured response:

```yaml
persian_headings_rtl: true
persian_paragraphs_rtl: true
persian_list_items_rtl: true
persian_quotes_rtl: true
persian_text_blocks_selected_font: true
inline_code_preserved: true
action_icons_unchanged: true
layout_container_direction_unchanged: true
```

## External verification status

Real same-page Qwen, Claude composer, Edge exact-artifact, Firefox exact-artifact, and Firefox Android execution remain external gates until executed on the corresponding environments. They MUST be reported as `insufficient_evidence` rather than inferred from synthetic fixtures.
