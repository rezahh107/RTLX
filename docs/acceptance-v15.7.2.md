# RTLX 15.7.2 Acceptance Criteria

## Profiles

- [x] Qwen and DeepSeek profiles are version 2.
- [x] Their content-selector arrays are empty rather than speculative.
- [x] Their profile-level mutation-sensitive arrays are empty.
- [x] Stable protective rules remain versioned and schema-valid.

## Direction and typography

- [x] Nested text inside a simple link resolves to the link.
- [x] Complex interactive controls remain protected.
- [x] Natural-language inline code is not blanket-classified as a code typography zone.
- [x] Block and technical code remain protected.

## Evidence

- [x] RuntimeSnapshot is 1.4.0.
- [x] Cache hit/miss/store counters are deterministic aggregates.
- [x] Metric scopes distinguish runtime-lifetime from current-DOM counts.
- [x] ProfileHealth is 1.1.0 with semantic/protective impact.
- [x] Failure Evidence Report is 1.2.0 with separate analysis status.
- [x] Stale selections are cleared to no-data.
- [x] Effective font settings produce the report expectation.

## External validation

- [ ] Same-conversation, same-scroll-position A/B validation on Qwen and DeepSeek under Windows.
- [ ] Exact release ZIP execution in unmanaged Chromium.
- [ ] Exact release ZIP execution in Firefox Desktop.
