# RTLX v15.1 Browser Harmony Hardening — Architecture Delta

```yaml
authority: RTLX-SSOT-v12.0.0
baseline: RTLX 15.0.0
target: RTLX 15.1.0
codename: Browser Harmony Hardening
change_type: reliability_only
architecture_replacement: false
profile_schema: 3.0.0
```

## Scope

RTLX 15.1 retains the v15 background/content/UI/profile/journal boundaries. The release adds bounded runtime coordination and termination recovery at existing seams; it does not add product languages, remote classification, arbitrary CSS, telemetry, payment, selector auto-repair, or a new profile model.

## Content-runtime delta

The content runtime now composes these reliability components:

- `BrowserLifecycleCoordinator`: explicit `active`, `passive`, `hidden`, `frozen`, `resumed`, and `destroyed` states with generation changes, idempotent observer recreation, bounded resume discovery, BFCache handling, and prerender activation gating.
- `PerformanceMonitor`: deterministic online count/min/max/sum/average aggregates plus a registry-bounded raw sample ring per phase. Non-finite input is rejected.
- `Scheduler`: success/failure/abort cleanup for abort listeners, idle callbacks, MessageChannel ports, timeout fallbacks, and stale-generation tasks.
- `VisibilityRegistry`: bounded IntersectionObserver admission, disconnected-target pruning, and deterministic capacity fallback.
- `SharedDelayQueue`: deterministic shared delay buckets with bounded timers/candidates and lifecycle cancellation.
- `OwnedMutationSuppression`: exact node/attribute/child signatures scoped by lifecycle generation and expiring TTL.
- `AdaptiveBackpressure`: deterministic normal/pressure/hidden budgets from registered queue, mutation-burst, visibility, and optional long-task signals.
- `DegradationController`: levels 0–4, coded transitions, quiet-period step-down, and fail-closed repeated-failure behavior.
- `DiagnosticBatcher`: stable deduplication, bounded count/time/payload/rate, immediate fatal/rollback-failure flush, and retry retention.
- `InputEventCoalescer`: composition-safe processing, one post-composition pass, frame coalescing, and a maximum 512-code-unit caret window without modifying input content.

All limits are sourced from `registries/performance-budgets.v1.json` and surfaced through `src/shared/registry-data.ts`; no hidden runtime fallback expands those bounds.

## Background delta

`src/background/storage-transaction.ts` defines versioned, idempotent, transaction-marked writes/removals for local and sync storage. Prepared markers are stored in `storage.session` where available and fall back to local storage so recovery survives service-worker process termination. Startup recovery executes before normal background initialization.

Profile history, user profiles, community imports, settings, temporary-disable state, and persisted diagnostics use the transaction boundary. Mutable module state remains reconstructable cache only.

## Snapshot and diagnostic delta

The runtime snapshot advances from `1.0.0` to `1.1.0` and adds text-free lifecycle, degradation, backpressure, delay, visibility, diagnostic-batch, observer, and owned-signature counts. It still excludes page text, full URL, query, and fragment data.

## Packaging delta

Chromium/Edge remain MV3 service-worker packages. Firefox remains a separate background-script/event-page package. `scripts/browser-manifest-e2e.mjs` provides manifest-loaded Chromium/Edge interaction coverage and explicit environment evidence; Firefox absence or lack of a WebDriver-capable environment is reported as `insufficient_evidence`, not PASS.

Binary fonts remain generated from exact lockfile-pinned `@fontsource/vazirmatn` and `@fontsource/inter` dependencies. Amazon Ember is neither downloaded nor bundled.

## Preserved invariants

- no automatic `dir` on `html` or `body`;
- semantic `dir`, not CSS direction substitution;
- Persian RTL/Vazirmatn and English LTR/Inter;
- Arabic, Urdu, and Hebrew are not treated as Persian;
- code, math, editor, terminal, icon, form, and accessibility protection;
- declarative Profile Schema v3;
- optional host access and minimal permissions;
- journaled, ownership-checked, idempotent rollback;
- no remote executable code or telemetry.
