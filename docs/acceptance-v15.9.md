# RTLX 15.9.0 Acceptance Criteria

## Deterministic streaming acceptance

- Exact duplicate roots do not increase `queuedRoots`.
- A queued ancestor covers a later descendant without retaining both.
- A later ancestor removes all covered queued descendants.
- Capacity causes a successful forced flush before the next root is accepted.
- A failed flush restores the previous roots and rejects the new root without data loss.
- Repeated attempts during one failed overflow episode expose one episode identifier and one episode-start event.
- A successful later non-capacity flush closes the active overflow episode.

## Degradation acceptance

- Three independent failures can still deterministically reach level `3`.
- One transient queue-capacity event with a successful forced flush produces no degradation failure.
- A quiescent runtime transitions level `3` or `2` to level `1` and restores bidi capability.
- A subsequent quiescent transition reaches level `0` and clears accumulated nonterminal failures.
- Level `4` does not auto-recover.
- Dwell-time values are finite and non-negative.

## Capture and provenance acceptance

A controlled qualifying report must show:

```yaml
schemaVersion: 1.8.0
processorVersion: 15.9.0
captureReadiness:
  status: ready
  certificationEligible: true
  reasonCodes: []
streaming:
  pending: false
  rejectedRoots: 0
  flushFailures: 0
pendingCandidates: 0
pendingDiscoveryRoots: 0
textBlockCoverage:
  textBlockEnumerationsPending: 0
  typographyContinuationsPending: 0
  typographyProtectionReconciliationsPending: 0
typography:
  verificationFailures: 0
provenance:
  buildInputHash: 'sha256:<64 lowercase hexadecimal characters>'
```

`profileHash` may be `null` only when the controlled page has no loaded profile.

## Repository gates

The following must exit `0` for local release assembly:

```text
npm ci --ignore-scripts
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

## External outcome gates

The following remain mandatory before a production-ready or real-site effectiveness claim:

- at least five controlled Claude cases and five controlled Qwen cases for version 15.9.0;
- selected-element evidence for each visibly incorrect or corrected block;
- reviewed before/after screenshots stored separately from privacy-safe JSON reports;
- `captureReadiness.status: ready` for final captures;
- positive assistant/user content coverage and negative code/math/editor/composer protection checks;
- exact installed-artifact execution in supported Chromium, Edge, Firefox Desktop, and Firefox Android environments;
- no false RTL on English-only controls or protected zones.

Until these artifacts are supplied, those conclusions remain `insufficient_evidence`.
