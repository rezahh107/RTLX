# RTLX 15.9.1 Requirements

## Runtime takeover and startup reconciliation

- `RUNTIME-TAKEOVER-001`: Every active content runtime MUST claim the document with a versioned runtime-owner token.
- `RUNTIME-TAKEOVER-002`: A runtime that no longer owns the document lease MUST stop mutation processing and destroy its local runtime state.
- `STARTUP-RECONCILIATION-001`: Before normal processing, the runtime MUST inspect the document and reachable open shadow roots for pre-existing RTLX classes, wrappers, styles, and ownership metadata.
- `STARTUP-RECONCILIATION-002`: Pre-existing RTLX classes, wrappers, and style elements MUST be removed deterministically before the new runtime applies its own plan.
- `STARTUP-RECONCILIATION-003`: A `dir` attribute MAY be removed during startup only when an explicit RTLX direction-owner marker establishes ownership. Ambiguous legacy `dir` attributes MUST be preserved and diagnosed through telemetry.
- `STARTUP-RECONCILIATION-004`: Startup cleanup MUST expose counts and cleanup failures in Runtime Snapshot evidence.

## Direction ownership

- `DIRECTION-OWNERSHIP-001`: Every RTLX-added `dir` mutation MUST be accompanied by `data-rtlx-dir-owner` in the same journaled mutation plan.
- `DIRECTION-OWNERSHIP-002`: Rollback MUST remove both the direction mutation and its owner marker through the existing journal.
- `DIRECTION-OWNERSHIP-003`: Startup reconciliation MUST NOT infer ownership from an RTLX CSS class alone.

## Detached continuation pruning

- `DETACHED-WORK-PRUNE-001`: Disconnected elements MUST be removed from pending text-block enumeration, typography continuation, and typography-protection reconciliation state.
- `DETACHED-WORK-PRUNE-002`: Pruning MUST preserve connected work and MUST expose cumulative pruned counts.
- `DETACHED-WORK-PRUNE-003`: Capture readiness MUST be evaluated after a deterministic pruning pass.

## Capture stabilization

- `CAPTURE-STABILIZATION-001`: User-initiated runtime and failure snapshots MUST perform a bounded stabilization attempt before final readiness classification.
- `CAPTURE-STABILIZATION-002`: Stabilization MUST poll deterministically, flush available bounded work, prune detached work, and stop at the versioned maximum wait.
- `CAPTURE-STABILIZATION-003`: Snapshot evidence MUST expose initial status, final status, elapsed wait, attempt count, and timeout state.
- `CAPTURE-STABILIZATION-004`: Stabilization MUST NOT convert unresolved work into `ready`; after the bounded wait, unresolved conditions remain `partial` or `blocked`.

## Runtime evidence

- `RUNTIME-SNAPSHOT-1.9.0-001`: Runtime Snapshot schema `1.9.0` MUST include `startupReconciliation`, `detachedWorkPruned`, and `captureStabilization`.
- `RUNTIME-SNAPSHOT-1.9.0-002`: New evidence fields MUST be finite, non-negative, deterministic, and schema-validated.

## Preserved boundaries

All RTLX 15.9.0 requirements remain active unless explicitly superseded above. This patch MUST NOT broaden permissions, collect page text, capture screenshots automatically, invent site selectors, weaken protected-zone behavior, or claim real-site effectiveness without a qualifying real fixture.
