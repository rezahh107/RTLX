# RTLX 15.7.2 Architecture Delta

## Scope

15.7.2 is a behavior-preserving stability patch over 15.7.0. It does not redesign the direction pipeline or add a new user-facing feature.

## Structural text-decision fingerprint

The previous runtime compared a signature containing profile version against a stored signature that omitted profile version. It also stored cache entries only for text nodes that produced wrappers, after mutation had already changed those nodes. The cache therefore provided little or no useful reuse.

The corrected pipeline is:

```text
text node + semantic context
→ immutable ProcessedTextFingerprint
→ exact equality check
→ tokenize only on cache miss
→ store every evaluated fingerprint
```

The fingerprint is runtime-local in a `WeakMap`. It contains source text and bounded structural metadata, is never serialized into Failure Evidence, and is discarded with the document/runtime.

## Injection outcome normalization

`injectCurrentTab()` now returns:

```text
ContentInjectionOutcome 1.0.0
```

The outcome reports only successful frame IDs returned by the browser. Because RTLX does not request `webNavigation`, it cannot know the complete expected frame set and therefore labels coverage certainty as `observed-results-only`.

```text
existing runtime pinged
→ reprocess
→ coverage: existing-runtime

executeScript result contains frame 0 only
→ coverage: main-frame-only

executeScript result contains frame 0 plus other frames
→ coverage: multiple-frames

no frame 0
→ fail closed
```

This avoids falsely presenting Firefox partial execution as complete while also avoiding invented failed-frame IDs.

## Runtime evidence collaborator

Classification, direction-decision, not-modified, rule-effectiveness, and wrapper-lifecycle aggregation moved from `FrameRuntime` into `RuntimeEvidenceAccumulator`.

`FrameRuntime` remains the orchestrator. The collaborator stores only bounded counters/maps and produces the same snapshot fields as 15.7.0.

## Deferred Custom Highlight work

CSS Custom Highlight is not introduced in this patch. A future feature release may add a feature-detected debug renderer with a box-overlay fallback. That work is intentionally separated from cache and injection correctness changes.
