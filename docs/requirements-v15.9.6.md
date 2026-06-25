# RTLX 15.9.6 Requirements

## Scope

This patch addresses only the confirmed nested-list marker-direction failure observed on DeepSeek with RTLX 15.9.5.

## Requirements

- `LIST-MARKER-DIRECTION-001`: A text block nested inside a list item MUST resolve the nearest connected `<li>` as its list marker owner.
- `LIST-MARKER-DIRECTION-002`: When list repair is enabled and a Persian or mixed candidate resolves to RTL, the marker-owning `<li>` MUST receive RTL direction if it has no explicit `dir`.
- `LIST-MARKER-DIRECTION-003`: An English candidate resolving to LTR MAY apply LTR to the marker owner under the same ownership rules.
- `LIST-MARKER-DIRECTION-004`: Existing explicit direction on the list item MUST be preserved.
- `LIST-MARKER-DIRECTION-005`: If the text direction target and marker owner are the same element, duplicate direction mutations MUST NOT be generated.
- `LIST-MARKER-DIRECTION-006`: Nested lists MUST use the nearest list-item owner.
- `LIST-MARKER-DIRECTION-007`: Marker styling MUST be scoped to RTLX-owned direction attributes.
- `LIST-MARKER-DIRECTION-008`: Protected code, editor, math, terminal, icon, hidden, inert, and profile-protected boundaries MUST remain unchanged.

## Non-goals

No change is authorized to text-block enumeration, language classification, profile selectors, queueing, streaming, degradation, typography selection, permissions, report schemas, or explicit host-direction policy.
