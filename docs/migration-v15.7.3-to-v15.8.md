# Migration: RTLX 15.7.3 → 15.8.0

## Contract changes

- Product and processor version: `15.7.3` → `15.8.0`.
- Runtime Snapshot: `1.5.0` → `1.6.0`.
- Element Inspection: `3.1.0` → `3.2.0`.
- Qwen and DeepSeek bundled profiles: version `2` → `3`.
- Other modified bundled profiles increment by one version.

## Behavioral changes

- A semantic answer region may generate multiple independent text-block tasks.
- Alignment is no longer applied to inline direction targets.
- Direction alignment uses logical `start` instead of physical `right`/`left`.
- Typography work continues after the first 50 Text nodes by requeueing the text block.
- Profile matching uses category precedence before profile-array order.
- Conversational editor rules preserve the site's native behavior.

## Compatibility

The manifest permissions, storage schemas, profile schema, mutation journal, rollback ownership, and focused popup contracts remain unchanged. Old runtime snapshots are not rewritten; new reports use the new schema versions.
