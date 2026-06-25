# Requirements Matrix

RTLX-SSOT 12.0.0 and all later approved version deltas remain the normative baseline. No prior LOCK is removed or weakened by RTLX 15.9.1.

Current release traceability:

- `docs/requirements-v15.9.md`
- `docs/acceptance-v15.9.md`
- `docs/architecture-v15.9.md`
- `docs/migration-v15.8.1-to-v15.9.md`
- `docs/release-notes/v15.9.1.md`
- `docs/requirements-v15.9.1.md`
- `docs/architecture-v15.9.1.md`
- `docs/acceptance-v15.9.1.md`

Implemented requirement groups:

| Group                   | Requirement IDs                              | Primary implementation                                                  | Verification                                                  |
| ----------------------- | -------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| Streaming normalization | `STREAMING-QUEUE-COALESCE-001/002`           | `src/content/streaming-stability.ts`                                    | `tests/unit/streaming-resilience-v159.test.ts`                |
| Capacity and retention  | `STREAMING-FLUSH-CAPACITY-001/002`           | `src/content/streaming-stability.ts`                                    | `tests/unit/streaming-resilience-v159.test.ts`                |
| Overflow episode        | `STREAMING-OVERFLOW-EPISODE-001`             | `src/content/streaming-stability.ts`, `src/content/frame-runtime.ts`    | unit tests; controlled smoke has no overflow                  |
| Quiescent recovery      | `DEGRADATION-QUIESCENT-RECOVERY-001/002/003` | `src/content/degradation-controller.ts`, `src/content/frame-runtime.ts` | `tests/unit/backpressure-degradation-v151.test.ts`            |
| Capture readiness       | `CAPTURE-READINESS-001/002/003`              | `src/content/capture-readiness.ts`                                      | `tests/unit/capture-readiness-v159.test.ts`, controlled smoke |
| Runtime provenance      | `RUNTIME-PROVENANCE-001/002`                 | `scripts/generate-build-fingerprint.mjs`, background/content runtime    | `tests/unit/build-provenance-v159.test.ts`, controlled smoke  |
| Runtime takeover        | `RUNTIME-TAKEOVER-001/002`                   | document lease and superseded-runtime shutdown                          | verified by unit/synthetic browser fixture                    |
| Startup reconciliation  | `STARTUP-RECONCILIATION-001..004`            | safe removal of prior RTLX ownership before activation                  | verified by unit/synthetic browser fixture                    |
| Detached work pruning   | `DETACHED-WORK-PRUNE-001..003`               | disconnected continuation state cannot block final readiness            | verified by unit test                                         |
| Capture stabilization   | `CAPTURE-STABILIZATION-001..004`             | bounded wait/flush/prune before final capture classification            | verified by controlled Chromium fixture                       |
| Site profile evidence   | `PROFILE-EVIDENCE-001/002/003`               | change-control rule; bundled profile selectors unchanged                | real-site 15.9.1 evidence remains `insufficient_evidence`     |
| Scheduler fallback      | `SCHEDULER-FALLBACK-001/002`                 | existing `src/content/scheduler.ts`                                     | existing scheduler tests                                      |

Historical requirements not explicitly superseded continue to apply unchanged.
