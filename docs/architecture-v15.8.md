# RTLX 15.8 Architecture Delta

## Status

Implemented architecture delta over RTLX 15.7.3. Existing permission, ownership, rollback, scheduler, profile, privacy, and exclusion boundaries remain unchanged.

## Missing layer addressed

The previous runtime resolved one semantic block to one direction target. That model was sufficient for a simple chat message but did not guarantee consistent processing of document-like responses containing headings, paragraphs, lists, quotes, and table cells.

RTLX 15.8 adds deterministic text-block enumeration:

```text
Candidate Discovery
        ↓
Semantic Region Resolution
        ↓
Ordered Text Block Enumeration
        ↓
Per-Block Classification
        ↓
Per-Block Direction + Alignment Resolution
        ↓
Bounded Typography Slices with Continuation
        ↓
Mutation Journal and Coverage Evidence
```

## Contracts

### Semantic region

A semantic region is only the scope of a structured answer. It is not automatically a direction or typography target.

### Text block

The enumerator recognizes ordered natural-language blocks such as `p`, `li`, `h1`–`h6`, `blockquote`, `dd`, `dt`, `figcaption`, `td`, and `th`. A `div` or `address` is accepted only when it owns direct natural text and is not merely a container for child blocks.

Nested duplicates are removed deterministically. Protected code, math, editor, terminal, icon, and layout-sensitive boundaries are not emitted as natural-language blocks.

### Direction and alignment

Direction and alignment are separate targets. An inline element may receive a bounded `dir` isolation decision, but it cannot receive block alignment. Block-capable targets use logical `text-align: start`, whose physical side follows `dir`.

### Typography continuation

The per-slice limit remains bounded. A completed slice stores per-Text-node fingerprints and requeues the block when uninspected nodes remain. Later slices rescan deterministically, skip unchanged fingerprints, and continue until the block scan completes.

### Profiles

Protective profile categories have deterministic priority over broad content rules:

```text
exclude → editor → terminal → math → code → mutationSensitive → content
```

Within one category, profile order is preserved and `ruleId` is the stable final tie-breaker. Conversational editor rules preserve site direction, alignment, and typography by default.

## Diagnostics

Runtime Snapshot `1.6.0` adds:

- unique semantic-region and text-block coverage;
- typography inspected, eligible, planned, continuation, completion, and skip counters;
- processed-text fingerprint cache aliases;
- layout redirect event and unique-target counters with reason breakdown.

Element Inspection `3.2.0` separates semantic region, selected text block, direction target, alignment target, and typography coverage.

## Preserved boundaries

- no new browser permissions;
- no telemetry or automatic upload;
- no page text or HTML in reports;
- no final direction decision from site profile alone;
- no global `html` or `body` direction mutation;
- hybrid ownership, journaled rollback, and wrapper-minimal behavior remain active;
- CSS Custom Highlight remains a deferred optional debug feature and is not part of the correctness release.
