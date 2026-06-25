# RTLX 15.9.2 Architecture Delta

This document describes only the confirmed-repair delta from 15.9.1. Existing architecture remains unchanged.

## Direction decision delta

The decision table now distinguishes local and inherited `auto`:

```text
local dir=auto
  → preserve

ancestor dir=auto + confident Persian/mixed
  → treat inherited context as unresolved
  → apply the same bounded semantic-target decision used when no inherited direction exists
```

No classifier threshold or protected-zone rule changes.

## Continuation recovery

The existing text-block state remains in the runtime, but a pure recovery inspector now checks this invariant before and during capture/flush:

```text
pending continuation
  → queued in visible/background work
  OR cursor is present and task is requeued
  OR invalid/disconnected task is cancelled
```

The recovery path does not create a second processing engine. It only reconnects existing pending state to the existing queue.

## Coverage accounting

`unprocessedTextBlocks` tracks discoveries that have not yet produced a processed record. Invalidation, suspension, abort, or detachment cancels only those unprocessed discoveries. A semantic-region fallback is recorded as `fallback-region` before the processed counter advances.

## Profile-health metadata

Two optional rule fields extend the existing v3 profile structure:

```yaml
healthExpectation: required | optional
alternativeGroup: string
```

The site-profile registry revision is 4. Existing profiles without these fields retain the prior default: standalone semantic rules are required. Selector matching and precedence are unchanged.

## SPA selection scope

Selected-element path identity now reuses the same normalized scope path already used by conversation settings:

```text
site scope          → /
conversation scope  → first configured pathDepth segments
no active profile   → full pathname
```

Document identity, host, frame, and profile scope remain required.

## Hidden-tab report UX

The content runtime still suspends according to the existing lifecycle policy. The popup now recognizes `captureReadiness.status=blocked` with `document_hidden` or `runtime_inactive` and stops before export, displaying an explicit retry instruction. No background polling or hidden-tab processing was added.
