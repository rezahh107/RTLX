# RTLX 15.7.2 Acceptance Criteria

## Cache correctness

- [x] Identical text and structural context produce an equal fingerprint.
- [x] Text, profile version, matched rule, processor version, code context, wrapping mode, candidate role, or parent role changes invalidate the cache.
- [x] Zero-token evaluated text nodes are stored in the runtime cache.
- [x] Cache state remains runtime-local and is reset on rollback/destroy as before.

## Cross-browser injection

- [x] Existing runtime reprocessing returns a versioned outcome.
- [x] Callback-style partial main-frame success is accepted as observed main-frame-only coverage.
- [x] Promise-style multi-frame results are deduplicated and sorted deterministically.
- [x] `runtime.lastError` remains a hard failure.
- [x] Results without frame `0` fail closed.
- [x] No permission was added.

## Runtime evidence extraction

- [x] Classification, direction, non-modification, rule, and wrapper counters are owned by `RuntimeEvidenceAccumulator`.
- [x] Runtime snapshot schema remains `1.3.0`.
- [x] Aggregate maps/lists remain sorted deterministically.
- [x] Candidate text is not retained by the accumulator.

## Release verification

- [x] Format, typecheck, lint governance, schemas, profiles, tests, coverage, build, manifest validation, Firefox lint, security scan, production audit, store readiness, personal identity, and Chromium runtime smoke pass.
- [x] Two release packaging runs produce identical SHA-256 hashes.
- [x] Clean font-sanitized source rebuild reproduces release hashes.
- [ ] Exact release-artifact Chromium/Edge/Firefox and Firefox Android execution remain evidence-dependent and MUST be reported honestly.
