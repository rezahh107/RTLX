# RTLX 15.9.0 Architecture Delta

## Status

`implementation_status: implemented`

RTLX 15.9.0 is an effectiveness and streaming-resilience delta over 15.8.1. It preserves the existing permission, privacy, profile-authority, mutation-journal, rollback, and cross-browser build boundaries.

This release does **not** claim that any site-specific profile has been repaired from undocumented production DOM. In particular, `official:claude` remains unchanged because no controlled real-DOM evidence package proving stable replacement selectors was supplied.

## Runtime pipeline

```text
MutationObserver callback
        ↓ collect roots only
Streaming root normalization
        ↓ duplicate and ancestor/descendant coalescing
Bounded queue
        ↓ flush-on-capacity, quiet-window, or max-wait
Candidate discovery and semantic resolution
        ↓
Text-block enumeration and typography planning
        ↓
Bounded mutation and verification
        ↓
Quiescence evaluation
        ↓
Condition-based degradation recovery
        ↓
Capture-readiness and provenance evidence
```

## Streaming Queue v2

`StreamingStabilityController` owns a bounded set of `Document | ShadowRoot | Element` roots.

It now:

- rejects exact duplicates without growing the queue;
- discards a descendant when an already queued root covers it;
- removes queued descendants when a broader new ancestor arrives;
- attempts a synchronous bounded flush before rejecting work at capacity;
- restores flushed roots if the flush handler throws;
- assigns one overflow episode identifier to one continuous capacity/failure episode;
- exposes accepted, duplicate, coalesced, rejected, forced-flush, overflow, and flush-failure counters.

A successful capacity flush is not a degradation failure. A true rejection can record at most one new `streaming-queue` failure for its active overflow episode.

## Degradation recovery

The 30-second quiet-period recovery remains a conservative fallback. A second, condition-based path checks runtime quiescence after `degradationStableRecoveryMs`.

Quiescent recovery requires:

- active mutable lifecycle;
- no pending streaming roots;
- the streaming quiet interval to have elapsed;
- empty visible/background candidate queues;
- empty discovery queues and cursors;
- zero pending text-block enumeration, typography continuation, and protection-reconciliation work;
- normal adaptive-backpressure state;
- no active long-task signal.

When these conditions hold, levels `3` or `2` recover directly to level `1`, which restores bidi wrapping and deep-shadow discovery. A subsequent quiescent check recovers level `1` to `0`. Level `4` remains terminal and is never auto-recovered.

The value `degradationStableRecoveryMs = 1000` is a versioned operational policy verified by unit tests and the controlled Chromium smoke fixture. It is not represented as a universal browser or site timing fact.

## Capture readiness

Runtime Snapshot schema `1.8.0` includes `captureReadiness` with:

- `status: ready | partial | blocked`;
- sorted reason codes;
- certification eligibility;
- streaming, queue, cursor, continuation, reconciliation, and recent-long-task state.

A report can still be downloaded when readiness is `partial` or `blocked`, but that report is not eligible as final outcome evidence.

## Runtime provenance

Every runtime snapshot records:

- `buildInputHash`: SHA-256 over canonical, sorted build inputs selected by `scripts/generate-build-fingerprint.mjs`;
- `profileHash`: SHA-256 over the canonical loaded profile, or `null` when no profile is loaded.

`buildInputHash` is intentionally named as an input fingerprint. It is not the hash of the final browser ZIP and does not replace the release-artifact manifest.

## Scheduler boundary

Existing feature-detected use of the Prioritized Task Scheduling API is retained. Unsupported browsers continue to use the existing fallback. No release requirement assumes that `scheduler.yield()` or `scheduler.postTask()` is universally available.

## Preserved boundaries

- no new browser permission;
- no automatic upload or telemetry;
- no page-text, DOM-dump, cookie, storage, network, or automatic-screenshot capture;
- no remote executable profile code;
- no global `html` or `body` direction mutation;
- no silent loss of a queued root after a failed flush;
- no site-profile change without evidence supporting that site-specific behavior;
- no production-ready claim without qualifying real-runtime evidence.
