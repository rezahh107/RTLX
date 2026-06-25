# RTLX 15.7.0 Architecture Delta

## Evolution, not rewrite

15.7.0 evolves the existing deterministic runtime rather than replacing it. The active pipeline is:

```text
Bounded DOM Discovery
→ Deterministic Text Evidence
→ Semantic Block Resolution
→ Versioned Direction Decision
→ Minimal Inline Isolation
→ Independent Typography
→ Hybrid Ownership and Journal
→ Incremental Mutation Recovery
→ Aggregate plus On-Demand Diagnostics
```

The governing principle is:

```text
Text-informed, block-applied, profile-assisted,
explicit-direction-respecting, wrapper-minimal, deterministic.
```

## Semantic block resolution

Candidate discovery does not decide direction. Text evidence is sampled from the candidate and nearby semantic context. Existing paragraphs, list items, messages, articles, table cells, and simple text-only interactive elements are preferred. Resolution is bounded and never promotes automatic mutation to `html` or `body`.

## Direction engine

Direction decisions return both an action and a stable reason. Strong Persian/mixed evidence maps to RTL, strong Latin evidence maps to LTR, explicit local direction remains authoritative, and block code remains LTR. Document language is context only and is not treated as truth for a message block.

## Code context

Code handling is split into block code, technical inline code, and natural inline text. `pre`, code roles, syntax-highlighted regions, and block-display code stay protected LTR. Natural Persian inline code is not blanket-forced LTR and receives only bounded automatic isolation.

## Interactive text

The former blanket preserve rule for every link/button is narrowed. A simple text-only control may receive direction/font repair. Controls with SVG/media, live regions, form descendants, editors, or other complex structure remain protected.

## Ownership

RTLX retains hybrid ownership:

- weak references for runtime-local metadata;
- versioned mutation journal for previous values and idempotent rollback;
- minimal owned classes/markers for cross-callback identity;
- runtime/document identity for provenance.

WeakMap-only ownership is intentionally rejected because it cannot support enumeration, runtime recreation, or full rollback.

## Diagnostics

Normal runtime evidence is aggregate and bounded. A report-only selector can capture one detailed structural decision trace without saving a profile rule or modifying the selected element. Exact local font file use is not claimed; reports record font-face status, readiness, computed family alias, and cascade verification only.
