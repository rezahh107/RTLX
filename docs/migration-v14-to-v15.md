# Migration Guide — RTLX v14 to v15

## Compatibility

- Profile Schema remains `3.0.0`.
- Settings Schema remains `2.0.0`.
- Existing v14 profiles, per-rule settings, conversation scopes, picker selections, and signed envelopes remain readable.
- No new permission is introduced.
- Browser minimum versions and target-specific background/sidebar architecture remain unchanged.

## Automatic behavior

No user migration action is required. On the first profile replacement or deletion, v15 begins storing bounded canonical history snapshots under a new local storage prefix.

## New stored data

```text
rtlx:profile-history:<hostname>
```

Each entry contains a profile, profile version, UTC timestamp, and SHA-256 hash. At most ten unique entries are retained. No page text or full URL is stored.

## New diagnostics

The persistent control panel can request:

- profile health;
- runtime performance summary;
- streaming status;
- rule-conflict explanation;
- text-free fixture summary;
- profile history and restore.

## Restore semantics

Restoring a history entry creates a new monotonically increasing profile version. It does not reduce the current version or bypass anti-rollback rules.

## Rollback compatibility

DOM rollback contracts are unchanged. v15 additionally fixes document stylesheet placement so owned styles are inserted in `head` and removed through the existing journal.
