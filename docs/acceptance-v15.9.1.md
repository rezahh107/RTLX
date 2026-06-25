# RTLX 15.9.1 Acceptance Criteria

## Startup reconciliation

A controlled browser fixture containing pre-existing RTLX classes, style elements, wrappers, a prior runtime marker, and an explicitly owned direction MUST show:

```yaml
startupReconciliation:
  cleanupPerformed: true
  previousRuntimeMarker: 15.9.0:stale-runtime
  preexistingOwnedCandidates: 1
  preexistingTypographyTargets: 1
  preexistingDirectionTargets: 1
  preexistingWrappers: 1
  ownedDirectionAttributesRemoved: 1
  classesRemoved: 3
  wrappersUnwrapped: 1
  cleanupFailures: 0
```

After takeover, the document runtime marker MUST start with `15.9.1:` and the previous direction-owner token MUST not remain.

An ambiguous legacy `dir` without `data-rtlx-dir-owner` MUST be preserved.

## Detached work

- A disconnected text-block element present in pending, cursor, and result state is removed from all three collections and counted once.
- Connected entries remain unchanged.
- Disconnected typography continuation and protection-reconciliation entries are removed and counted.
- A capture with only disconnected stale continuation work can become `ready` after pruning.

## Capture stabilization

A controlled qualifying snapshot MUST show:

```yaml
schemaVersion: 1.9.0
processorVersion: 15.9.1
captureReadiness:
  status: ready
  certificationEligible: true
  reasonCodes: []
captureStabilization:
  attempted: true
  finalStatus: ready
  timedOut: false
textBlockCoverage:
  textBlockEnumerationsPending: 0
  typographyContinuationsPending: 0
  typographyProtectionReconciliationsPending: 0
```

A genuinely unresolved workload after the bounded wait MUST remain non-certifiable and report `timedOut: true` when applicable.

## Direction ownership and rollback

- `planMutations()` emits the `dir` operation and `data-rtlx-dir-owner` operation together.
- Code-zone and editable-input direction operations use the same owner token.
- Journal rollback removes both operations without changing text order or host-owned direction.

## Repository gates

These commands must exit `0` for local release assembly:

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

## External gates

The following remain `insufficient_evidence` until executed against the final 15.9.1 artifacts:

- clean-tab Qwen and Claude runtime captures;
- an active-streaming capture and a later `ready` capture;
- selected-element evidence for any still-visible failure;
- reviewed before/after screenshots;
- exact installed-artifact execution on supported Chromium, Edge, Firefox Desktop, and Firefox Android environments.
