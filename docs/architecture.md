# Architecture

## Authority and scope

`RTLX-SSOT 12.0.0` is the normative product contract. This implementation does not translate text, mirror site layout, alter saved source, perform OCR, or send page text to a server.

## Runtime boundaries

### Background

The background bundle registers listeners synchronously and owns settings persistence, optional host permission synchronization, dynamic content-script registration, profile alarm lifecycle, bundled profile selection, cryptographic profile verification primitives, and text-free diagnostic aggregation. It never receives page text.

### Content frame runtime

Each injected frame creates its own `FrameRuntime` and `RuntimeContext`. State, observers, queues, WeakMaps, journal entries, and abort controllers belong to that instance. The analyzer produces immutable mutation plans; only `mutation-applier.ts` writes to DOM. Rollback uses committed journal entries in reverse order and validates extension-owned preconditions before restoration.

### UI

Popup and options pages request permissions only from user gestures, edit settings, show coarse status, revoke grants, export diagnostics, and trigger rollback. UI does not analyze page DOM.

## Processing pipeline

```text
root discovery
→ candidate discovery with limits
→ exclusions/accessibility guards
→ NFKC analysis copy
→ Persian language classification and first-strong direction
→ deterministic direction decision
→ independent token detectors
→ deterministic overlap resolution
→ immutable mutation plan
→ precondition validation
→ write phase and journal commit
→ WeakMap state commit
```

## Cross-browser build

- Chromium: MV3 module service worker.
- Firefox: MV3 module background scripts/event page with a separately generated manifest.
- Shared code uses the callback-based `chrome` namespace through local adapters and does not assume persistent background memory.

## Profiles

Bundled profiles are declarative JSON and selected from `profiles/bundled/index.json`. Selectors are parsed with `css-tree` and constrained by the SSOT safety rules. Remote profiles are disabled because no authoritative endpoint and production key lifecycle were supplied. The cryptographic verifier is implemented fail-closed for future activation.

## Determinism

Serialization sorts unordered keys, canonical JSON rejects non-finite numbers, resolver tie-breakers are explicit, fixtures are versioned, build locale/timezone are pinned by scripts, and release ZIP timestamps are fixed.
