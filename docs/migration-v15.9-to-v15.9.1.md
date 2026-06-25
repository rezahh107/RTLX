# Migration: RTLX 15.9.0 to 15.9.1

## User installation

1. Remove or disable the previous unpacked RTLX entry.
2. Load the 15.9.1 unpacked target.
3. Reload the target page or open a new tab.
4. Confirm version `15.9.1` in the extension manager.
5. For evidence capture, wait for `captureReadiness.status: ready` when possible.

A page reload remains recommended because content scripts belong to the page into which they were injected. RTLX 15.9.1 also performs startup reconciliation so pre-existing RTLX-owned DOM state is inventoried and safely replaced when the runtime starts on a page containing prior ownership artifacts.

## Runtime schema

Consumers accepting Runtime Snapshot `1.8.0` must add support for `1.9.0` and these required fields:

```text
startupReconciliation
captureStabilization
detachedWorkPruned
```

## Direction ownership

New direction mutations include `data-rtlx-dir-owner`. Do not remove or rewrite this marker outside RTLX; it is required for deterministic rollback and future safe startup cleanup.

## No profile migration

Bundled profile IDs, profile versions, and selectors are unchanged in 15.9.1.
