# RTLX v15.3 Operational Proof & Update Safety — Architecture Delta

```yaml
authority: RTLX-SSOT-v12.0.0
baseline: RTLX 15.2.0
target: RTLX 15.3.0
codename: Operational Proof & Update Safety
change_type: reliability_only
architecture_replacement: false
profile_schema: 3.0.0
```

## Scope

RTLX 15.3 preserves the existing content/background/UI/profile/journal boundaries. It adds update quiescence, persistent Safe Mode, synchronized-storage coordination, runtime-context census, policy-denial throttling, a separate Firefox Android package, and evidence-gate orchestration. It does not add languages, telemetry, remote classification, arbitrary CSS, payment, selector auto-repair, or Amazon Ember assets.

## Update quiescence

`update-coordinator.ts` persists a bounded update marker in `storage.local`, stops new mutation work, rolls back active owned mutations, recovers storage transactions, then requests runtime reload. The marker records previous/target versions, phase, deadline, TTL, and update ID. Recovery is idempotent and does not rely on asynchronous `onSuspend` work.

## Persistent Safe Mode

`safe-mode.ts` activates after three consecutive critical initialization failures. While active, automatic DOM mutation is disabled; rollback, bounded diagnostics, export, status, and explicit reset remain available. Three verified healthy initializations clear Safe Mode. Failure records contain only sanitized codes and sources.

## Synchronized storage

`sync-coordinator.ts` serializes `storage.sync` writes, enforces conservative minute/hour write budgets, validates canonical read-back, and records only SHA-256 hashes for observed changes and conflicts. It does not silently merge concurrent settings or persist raw setting values in conflict evidence.

## Runtime context reconciliation

`runtime-context-reconciler.ts` feature-detects `runtime.getContexts()`, stores a bounded census without URLs, and reconciles extension contexts at startup/recovery boundaries. Unsupported browsers retain the existing fallback.

## Firefox Android boundary

RTLX now produces a dedicated `firefox-android` package. It omits desktop-only `commands`, `menus`, `sidebar_action`, and side-panel assets. Desktop Firefox remains a separate package. Android device execution remains an explicit evidence gate and is not inferred from static lint.

## Permission and enterprise resilience

Optional-permission denials are persisted with a bounded cooldown to prevent prompt loops. Enterprise-policy and browser-evidence scripts record `not_run` or `insufficient_evidence` rather than manufacturing PASS results.

## Messaging compatibility

The established callback plus `sendResponse` contract is retained. RTLX does not migrate to Promise-returning message listeners without cross-baseline proof. Canonical request/response validation and runtime/document identity from 15.2 remain authoritative.

## Evidence architecture

Versioned scripts generate machine-readable reports for cross-browser manifest execution, crash recovery, Firefox Android devices, performance campaigns, enterprise-policy cases, and release gates. Missing artifacts normalize to `not_run`; unavailable environments normalize to `insufficient_evidence`.

## Preserved invariants

All SSOT direction, language, font, accessibility, privacy, permission, declarative-profile, ownership-safe rollback, and no-remote-code constraints remain unchanged. Profile Schema v3 is preserved.
