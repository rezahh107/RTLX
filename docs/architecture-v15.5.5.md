# RTLX 15.6.0 Architecture Delta — Complete-Page Runtime

## Scope

This release changes scheduling, discovery continuation, typography targeting, degradation semantics, and diagnostic correlation. It does not alter Profile Schema v3, manifest permissions, optional-host policy, content/background boundaries, declarative profiles, mutation journal ownership, or rollback.

## Runtime queues

`FrameRuntime` owns three bounded work sets:

1. `pending`: visible/promoted candidates;
2. `backgroundPending`: connected offscreen candidates guaranteed a cooperative drain path;
3. `pendingDiscovery`: roots with new or resumable discovery work.

IntersectionObserver promotes an offscreen candidate from the background set to the visible set. It no longer controls whether the candidate is eventually processed.

## Resumable discovery

`CandidateDiscoveryCursor` has deterministic selector and text-walker phases. `nextBatch(candidateBudget, visitBudget)` returns candidates plus `hasMore`, `stopReason`, and cumulative counters. The cursor remains mapped to its discovery root until complete; route/full reprocess intentionally replaces it.

Candidate ranking is stable: profile selectors, semantic content tags/roles, and direct Persian text gain priority; toolbar/navigation/button chrome loses priority; original batch order breaks ties.

## Typography cascade

The document style defines the bundled/local font faces and a single scoped owned typography class. The mutation planner adds that class only to bounded safe parents of Persian/Arabic-script text nodes. Protected zones are rejected before mutation. `!important` is limited to that owned class rather than a broad descendant selector.

After apply, bounded computed styles are sampled. A mismatch increments runtime counters and emits `RTLX-FONT-001` with counts only.

## Diagnostic provenance

The content runtime stamps each diagnostic with `runtimeInstanceId`. The background document registry attaches `tabId`, `frameId`, browser document ID, content document instance ID, and generation after authorization. The FEC assembler filters persisted diagnostics against the current main document and runtime snapshot before serialization.

## Degradation

Non-terminal queue/delay/streaming pressure is capped at level 3. Terminal level 4 requires repeated `runtime-exception` or `rollback` failures. Transition diagnostics carry failure key, terminal flag, visible/background/discovery counts, visibility target count, and current backpressure signals.

## Scheduling compatibility

`cooperativeYield()` uses `scheduler.yield()` when present, then validates lifecycle generation again. Otherwise it uses the existing scheduled-task adapter and its `postTask`, idle callback, MessageChannel, or timer fallback chain.
