# RTLX v15.2 Browser Survival Hardening — Architecture Delta

```yaml
authority: RTLX-SSOT-v12.0.0
baseline: RTLX 15.1.0
target: RTLX 15.2.0
codename: Browser Survival Hardening
change_type: reliability_only
architecture_replacement: false
profile_schema: 3.0.0
```

## Scope

RTLX 15.2 preserves the v15.1 content/background/UI/profile/journal boundaries. The release adds restart-durable state recovery, race-free background coordination, document/tab identity, quota control, canonical cross-browser messages, and environment-aware crash/soak evidence. It does not add languages, telemetry, remote classification, arbitrary CSS, payment, selector auto-repair, or Amazon Ember assets.

## Background durability

- `storage-transaction.ts` uses a bounded, checksummed v2 write-ahead journal in `storage.local`. States are `prepared`, `target_applied`, and `committed`; restart recovery is deterministic and expired or corrupted records are discarded rather than replayed.
- `storage-quota-governor.ts` applies registry-backed soft/hard budgets, deterministic low-priority eviction, per-item sync limits, and hard rejection before protected writes exceed budget.
- `storage-access.ts` restricts local/sync/session areas to trusted extension contexts where the browser exposes `setAccessLevel`.
- `alarm-lease.ts` persists run leases and success/failure state, deduplicates concurrent delivery, and detects missed runs.

## Race elimination

- Background initialization is single-flight. Explicit reinitialization is serialized behind any in-flight generation.
- Dynamic content-script reconciliation uses a monotonic generation, compares the current registration, prefers `updateContentScripts`, supports capability fallback, and restores the prior registration if replacement fails.
- Background errors are classified, retried only within bounded policy, and exposed through a bounded circuit state instead of being silently swallowed.

## Document and tab identity

- Every content request carries protocol version, extension version, document instance, generation, and runtime epoch metadata.
- Background validation binds tab/frame identity to browser `documentId` when available and rejects stale epoch, mismatched documents, prerender, and pending-deletion contexts.
- Tab lifecycle state tracks active/background/loading/discarded/unreachable/removed states. Discarded tabs receive bounded expiring intents rather than immediate wake-up traffic.
- Broadcasts are sorted and limited to eight concurrent sends. Tab removal/replacement clears or transfers bounded state.

## Cross-browser capability boundary

`registries/browser-capabilities.v1.json` records feature-detected behavior and explicit fallback. Browser-name sniffing and remote capability registries are forbidden. Content-script registration explicitly uses the isolated world and tests `matchOriginAsFallback` with fallback omission when unsupported.

## Evidence harnesses

- `browser-manifest-e2e.mjs`: manifest-loaded optional-permission, iframe, shadow DOM, SPA, rollback, and worker-restart evidence where permitted.
- `browser-crash-campaign.mjs`: aggregates worker-termination recovery and records full crash gaps explicitly.
- `browser-soak-campaign.mjs`: bounded SPA-cycle heap/DOM/listener/CLS/long-task observations; it never upgrades the required eight-hour multi-tab gate by itself.
- `.github/workflows/browser-evidence.yml`: separate Chromium, Edge, and Firefox evidence jobs.

## Preserved invariants

All SSOT direction, language, font, accessibility, privacy, permission, declarative-profile, ownership-safe rollback, and no-remote-code constraints remain unchanged. Profile Schema v3 is preserved.
