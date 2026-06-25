# RTLX 15.9.5 Architecture Note

## Runtime epoch rebind

The background worker may restart independently of a page content runtime. RTLX now distinguishes three states:

```text
content runtime responds to current epoch → alive
content runtime responds only to rebind → alive, stale background epoch
no response to ping or bounded rebind → absent/unreachable
```

Only the final state permits programmatic injection. Rebind updates the content messaging epoch and repeats `REQUEST_CONTEXT`; it does not recreate `FrameRuntime`, change the content document instance, or mutate the page.

## Physical document identity

When browser-provided document identity is available:

```text
(tabId, frameId, browserDocumentId, documentGeneration)
```

is the physical document key. `contentDocumentInstanceId` remains runtime provenance and the conservative fallback when browser document identity is unavailable.

## Text-block work and readiness

Text-block discovery and generic candidate processing are separate states. A discovered entry in `unprocessedTextBlocks` is required work and bypasses processed-revision suppression until it is processed or cancelled.

Runtime Snapshot `1.10.0` adds:

```text
captureReadiness.textBlocksProcessingPending
```

Readiness is partial while this value is greater than zero, even if candidate and discovery queues are currently empty.

## Report workflow

```text
popup report request
→ ENSURE_CURRENT_TAB_RUNTIME
→ ping
→ bounded epoch rebind when stale
→ inject only when absent
→ bounded runtime stabilization
→ failure-evidence capture
```

Explicit apply behavior remains separate and unchanged.
