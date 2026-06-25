# RTLX 15.9.1 Architecture Delta

## Status

`implementation_status: implemented`

RTLX 15.9.1 is a corrective runtime-takeover and evidence-stabilization patch over 15.9.0. It addresses two conditions visible in the supplied 15.9.0 Qwen report: pre-existing RTLX-owned DOM state with zero mutations from the current runtime, and pending text-block enumeration while the normal candidate/discovery queues were empty.

The patch does not alter the classifier, site profiles, permission model, privacy model, streaming queue policy, or deterministic rollback architecture.

## Startup pipeline

```text
Content runtime starts
        ↓
Collect document + reachable open shadow roots
        ↓
Inventory pre-existing RTLX ownership
        ↓
Remove owned classes/styles/wrappers
        ↓
Remove dir only with explicit direction-owner proof
        ↓
Preserve ambiguous legacy dir
        ↓
Claim document runtime lease
        ↓
Start normal discovery and processing
```

## Runtime lease

The active runtime writes:

```text
data-rtlx-runtime-owner="<processorVersion>:<runtimeInstanceId>"
```

The lease is checked before mutation flushes and MutationObserver handling. A 15.9.1 runtime that loses the lease destroys itself instead of continuing to mutate the shared page DOM.

The lease cannot retroactively terminate an older implementation that did not implement this contract. Startup reconciliation therefore removes pre-existing owned presentation state before the new runtime begins. Browser-page refresh remains the cleanest installation transition, while the takeover path prevents stale owned DOM from silently being treated as current-runtime output.

## Direction ownership

Every newly planned `dir="rtl"` or `dir="ltr"` operation is paired with:

```text
data-rtlx-dir-owner="<processorVersion>:<runtimeInstanceId>"
```

Both operations use the existing journal. This makes future startup cleanup safe: RTLX removes a prior `dir` only when the owner marker proves that RTLX created it. Direction on elements with no marker is preserved as ambiguous legacy or host-page state.

## Detached work pruning

Text-block enumeration state spans three collections: pending elements, cursors, and partial results. SPA replacement can disconnect the element while leaving those collections populated. RTLX 15.9.1 prunes disconnected entries before snapshots, during bounded stabilization, and when detached candidates are encountered.

The same policy applies to typography continuation and typography-protection reconciliation sets. Pruned work is counted rather than silently disappearing.

## Capture stabilization

`RTLX_RUNTIME_SNAPSHOT` and `RTLX_FAILURE_SNAPSHOT` now use an asynchronous bounded capture transaction:

```text
snapshot
  ↓ if partial and runtime active
prune detached work
  ↓
flush bounded work when available
  ↓
wait captureStabilizationPollMs
  ↓
re-evaluate readiness
  ↓ repeat until ready or max wait
```

The versioned registry values are:

```yaml
captureStabilizationMaxWaitMs: 5500
captureStabilizationPollMs: 50
```

The 5.5-second maximum is aligned with the current internal five-second long-task signal lifetime plus a bounded margin. It is an RTLX operational policy, not a claim about universal site-streaming duration.

The surrounding content-response timeout is eight seconds, leaving bounded transport margin for the capture transaction.

## Runtime Snapshot 1.9.0

New fields:

- `startupReconciliation`: prior marker, inspected roots, prior ownership counts, safe removals, preserved ambiguous directions, and failures;
- `detachedWorkPruned`: cumulative pruned work by continuation category;
- `captureStabilization`: attempted state, initial/final readiness, wait, attempts, and timeout.

## Preserved boundaries

- no new browser permission;
- no page-text, DOM-dump, cookie, storage, network, or automatic screenshot capture;
- no global `html` or `body` direction mutation;
- no removal of unowned `dir` attributes;
- no selector changes to `official:qwen` or `official:claude`;
- no production-ready or real-site-effectiveness claim without fresh 15.9.1 evidence.
