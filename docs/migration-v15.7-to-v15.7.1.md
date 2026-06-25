# Migration: RTLX 15.7.0 → 15.7.2

## User-visible behavior

No new control or permission is introduced. Existing site settings, profiles, reports, and popup behavior remain compatible.

## Runtime changes

- Inline text caching now uses a complete structural fingerprint.
- Unchanged zero-token mixed-text nodes can be reused instead of repeatedly tokenized.
- Current-tab injection returns observed frame coverage evidence.
- Missing main-frame confirmation fails closed.
- Runtime aggregate counters are maintained by a dedicated collaborator.

## Compatibility

- Settings schema remains `2.1.0`.
- Runtime snapshot schema remains `1.3.0`.
- Failure Evidence schema remains unchanged.
- Manifest permissions remain unchanged.
- Amazon Ember remains local-only with bundled Inter fallback.

## Deferred work

Custom Highlight debug visualization is not part of this patch and remains proposed for 15.8.0 or later.
