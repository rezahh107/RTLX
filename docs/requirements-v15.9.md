# RTLX 15.9.0 Requirements

## Streaming resilience

- `STREAMING-QUEUE-COALESCE-001`: The queue MUST remove exact duplicates and MUST coalesce roots covered by a queued ancestor.
- `STREAMING-QUEUE-COALESCE-002`: When a broader root arrives, covered queued descendants MUST be removed without changing the retained root's document boundary.
- `STREAMING-FLUSH-CAPACITY-001`: Reaching capacity MUST attempt a flush before rejecting a new root.
- `STREAMING-FLUSH-CAPACITY-002`: If a flush handler fails, all roots passed to that handler MUST be restored for retry.
- `STREAMING-OVERFLOW-EPISODE-001`: Multiple rejections within one active overflow episode MUST NOT be counted as multiple new degradation failures.
- `STREAMING-TELEMETRY-001`: Runtime evidence MUST expose accepted, duplicate, coalesced, rejected, forced-flush, overflow-episode, and flush-failure counts.

## Degradation recovery

- `DEGRADATION-QUIESCENT-RECOVERY-001`: Nonterminal degradation MUST support condition-based recovery when all bounded-work and pressure signals are quiescent.
- `DEGRADATION-QUIESCENT-RECOVERY-002`: Quiescent recovery from levels `2` or `3` MUST restore bidi capability by transitioning to level `1` without waiting through every timer-only level.
- `DEGRADATION-QUIESCENT-RECOVERY-003`: Level `4` MUST remain terminal and MUST NOT auto-recover.
- `DEGRADATION-TELEMETRY-001`: Runtime evidence MUST expose transition count, recovery-transition count, last transition reason, and finite dwell time per level.
- `DEGRADATION-POLICY-001`: Operational recovery timing MUST be versioned in the performance registry and MUST NOT be presented as a site-independent measured fact without a real benchmark fixture.

## Capture evidence

- `CAPTURE-READINESS-001`: Runtime reports MUST classify capture readiness as `ready`, `partial`, or `blocked` from explicit bounded-work and runtime-state fields.
- `CAPTURE-READINESS-002`: A capture with pending streaming, queues, cursors, enumeration, typography, reconciliation, pressure, or long-task evidence MUST NOT be certification eligible.
- `CAPTURE-READINESS-003`: Readiness reason codes MUST be deterministic and sorted.
- `RUNTIME-PROVENANCE-001`: Runtime Snapshot `1.8.0` MUST contain a valid SHA-256 build-input fingerprint and a valid canonical profile hash or `null`.
- `RUNTIME-PROVENANCE-002`: Documentation and report fields MUST distinguish build-input fingerprint from final release-artifact hash.

## Site profiles

- `PROFILE-EVIDENCE-001`: A bundled site's selectors MUST NOT be changed based only on conversational claims or aggregate `no-match` counters.
- `PROFILE-EVIDENCE-002`: A site-profile change requires controlled positive and protection-negative evidence identifying the loaded product version, profile version, profile hash, route, and selected-element result.
- `PROFILE-EVIDENCE-003`: Until such evidence exists, the affected profile remains unchanged and its claimed real-site verification state remains `insufficient_evidence`.

## Cross-browser scheduling

- `SCHEDULER-FALLBACK-001`: Scheduler APIs MUST remain feature-detected.
- `SCHEDULER-FALLBACK-002`: Unsupported browsers MUST retain a non-throwing bounded-yield fallback.

## Non-regression

All requirements from RTLX 15.8.1 remain active unless explicitly superseded above. This release MUST NOT broaden permissions, privacy capture, profile authority, or mutation ownership.
