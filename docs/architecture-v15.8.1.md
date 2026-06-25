# RTLX 15.8.1 Architecture Delta

## Status

Implemented corrective delta over RTLX 15.8.0. Permission, privacy, profile ownership, scheduler, mutation journal, rollback, and browser-build boundaries remain unchanged.

## Corrected runtime pipeline

```text
Candidate Discovery
        ↓
Semantic Region Resolution
        ↓
Resumable Ordered Text-Block Enumeration
        ↓
Per-Block Classification and Direction
        ↓
Bounded Typography Scan
        ↓
Protection-State Fingerprint and Reconciliation
        ↓
Journaled Mutation / Removal
        ↓
Coverage Evidence
```

## Resumable text-block enumeration

`TextBlockEnumerationCursor` owns a `TreeWalker`, a one-node look-ahead buffer, counters, and fallback state. Every `nextBatch()` call inspects at most the configured descendant budget. The look-ahead buffer distinguishes the exact 512-element boundary from a real continuation without losing or double-processing a node.

`FrameRuntime` stores cursor and accumulated results per semantic region. An unfinished region is requeued. Direction and typography processing begin only after enumeration completes. Mutations invalidate the affected region cursor and completed-result cache.

Runtime evidence schema `1.7.0` exposes inspected elements, queued continuations, completed enumerations, and pending enumerations. Pending work produces `RTLX-COVERAGE-003` instead of a false complete state.

## Typography cache reconciliation

The per-Text-node fingerprint now includes text, tag, role, `dir`, RTLX typography ownership, deterministic structural path, current protection state, and context key. Therefore unchanged text is re-evaluated when it moves, becomes editor/code/icon/layout protected, or becomes eligible again.

`TypographyProtectionCursor` performs bounded reconciliation of existing RTLX-owned typography classes. `removeJournaledClass()` removes only a class addition proven by a committed mutation-journal entry; unrelated site classes remain untouched. Pending reconciliation is exposed in evidence and produces `RTLX-COVERAGE-004` when incomplete.

## Release and evidence integrity

Browser packages are created deterministically and receive a final path/size/SHA-256 manifest. The verifier rejects missing files, duplicate entries, extra unmanifested files, size changes, and one-byte content mutations.

External evidence placeholder generation is distinct from gate success. Placeholder creation reports `operationStatus: placeholder_files_created`; unresolved external gates produce `status: blocked`, `evidenceState: insufficient_evidence`, and exit code `2`.

## Dependency correction

The development-only transitive `undici` dependency is pinned through `overrides` to `7.28.0`. Both production and complete dependency audits use a high-severity threshold.

## Preserved boundaries

- no new permissions;
- no telemetry or automatic upload;
- no remote executable profile code;
- no global `html` or `body` direction mutation;
- no profile-only final direction decision;
- no unjournaled removal of site-owned classes;
- no claim of real-browser certification for unexecuted external gates.
