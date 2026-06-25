# RTLX v15 Hardening Architecture Delta

## Authority and intent

`RTLX-SSOT 12.0.0` remains the highest authority. RTLX v15 is a stabilization release over v14. It does not expand the language scope, weaken any architectural lock, or redesign the established background/content/UI/profile boundaries.

```yaml
release_intent: hardening
source_baseline: RTLX 14.0.0
product_version: 15.0.0
language_scope:
  persian: target
  english: target
  other_languages: no_automatic_persian_processing
```

## Hardening components

### Profile Health Engine

The content runtime evaluates each active profile rule against registered document and Shadow DOM roots. It reports deterministic states:

```text
healthy | degraded | no-match | excessive-match | invalid-selector | disabled
```

Health evaluation is observational. It never repairs, rewrites, or activates a selector automatically.

### Streaming Stability Controller

Mutation bursts are coalesced before discovery and reprocessing:

```text
mutation records
→ bounded root set
→ quiet window or maximum wait
→ one deterministic flush
→ existing discovery/visibility/mutation pipeline
```

Limits are registry-backed. Rollback, destroy, and BFCache suspension cancel pending streaming work.

### Runtime observability

The content runtime exposes bounded, text-free snapshots containing:

- runtime state;
- profile health;
- phase duration summaries;
- streaming queue statistics;
- pending candidate/discovery counts;
- observed-root, wrapper, and journal counts.

Snapshots do not contain page text, full URLs, DOM snapshots, or form values.

### Rule Conflict Inspector

Selected-element diagnostics preserve profile rule order and explain which matching rule was accepted or suppressed. The inspector does not compute a second precedence model; it explains the existing deterministic rule order.

### Last Known Good Profile

Before replacing or deleting a user profile, the background stores a canonical SHA-256 snapshot. History is bounded to ten unique entries per host. Restore creates a new profile version rather than silently rolling storage backward.

### Structural Fixture Recorder

The recorder exports counts and profile identifiers only. `textIncluded` is always `false`. Full page text, selectors discovered from the page, URLs, and snapshots are excluded.

### Official Profile Certification Metadata

Each bundled profile has an explicit evidence record. Synthetic fixture coverage, live checks, and browser checks are distinct. Missing live evidence remains `not-run`; the UI and catalog must not present it as verified.

## Browser smoke boundary

The v15 automated Chromium smoke executes the built content runtime in a real headless Chromium document with a bounded browser-API stub. It verifies semantic Persian direction, LTR code protection, typography ownership, BiDi wrappers, streaming coalescing, accessibility-name preservation, and rollback.

This is stronger than a DOM emulator test but is not a full manifest-loaded extension E2E and does not establish Firefox, Edge, live-site, accessibility, or performance gates.

## Browser presentation remains unchanged

- Chrome/Edge: MV3 service worker and native Side Panel.
- Firefox: MV3 background scripts/event page and `sidebar_action`.
- Popup/options/side panel do not analyze page DOM.
- Each accessible frame owns an independent content runtime.
