# RTLX 15.8.1 Acceptance Criteria

## Deterministic unit acceptance

- 511 blocks complete in one enumeration batch.
- 512 blocks complete in one enumeration batch without a false continuation.
- 513 blocks continue and complete without loss or duplication.
- 600 mixed Persian/Latin paragraphs remain in exact DOM order.
- Nested `li > p` and table cells remain non-duplicated across the continuation boundary.
- An unchanged Text node is re-evaluated after ancestor protection, class protection, or reparenting changes.
- A protected target loses only its journal-owned `rtlx-owned-typography` class.
- A one-byte artifact mutation fails release-integrity verification.
- Unknown, `not_run`, and `insufficient_evidence` external statuses never aggregate to `passed`.

## Repository gates

The following must exit `0` for release assembly:

```text
npm ci
npm run format-check
npm run typecheck
npm run lint
npm run lint:warnings
npm run validate:schemas
npm run validate:profiles
npm run test:coverage
npm run test:property
npm run adapter:conformance
npm run build
npm run test:browser-smoke
npm run manifest:validate
npm run webext:lint
npm run security:scan
npm run audit:production
npm run audit:all
npm run store:readiness
npm run build:release
npm run package:source
npm run release:integrity
```

`npm run evidence:external-status` is expected to exit `2` until all external gates are executed. Exit `2` means `blocked/insufficient_evidence`, not test success or implementation failure.

## Runtime quiescence

A qualifying 15.8.1 real-browser report must show:

```yaml
pendingCandidates: 0
pendingDiscoveryRoots: 0
textBlockEnumerationsPending: 0
typographyContinuationsPending: 0
typographyProtectionReconciliationsPending: 0
verificationFailures: 0
```

## External gates

Exact Chromium, Edge, Firefox Desktop, Firefox Android, real Qwen same-page regression, Claude composer/IME/accessibility, store signing, update rollback, staged rollout, and long soak remain `insufficient_evidence` unless their corresponding reports are produced by the required environment.
