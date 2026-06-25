# Migration: RTLX 15.8.1 to 15.9.0

## User migration

No settings migration is required. Install 15.9.0 over the previous unpacked build or load the new unpacked directory. Existing site activation and font preferences remain compatible.

## Contract changes

- Runtime Snapshot schema: `1.7.0 → 1.8.0`.
- Performance registry: `performance-budgets.v1.json → performance-budgets.v2.json`.
- Product and processor version: `15.8.1 → 15.9.0`.

Consumers of Runtime Snapshot must accept the new required fields:

```text
provenance.buildInputHash
provenance.profileHash
captureReadiness
degradation
streaming.acceptedRoots
streaming.duplicateRoots
streaming.coalescedRoots
streaming.rejectedRoots
streaming.forcedFlushes
streaming.overflowEpisodes
streaming.flushFailures
streaming.activeOverflowEpisodeId
streaming.lastFlushReason
streaming.quietForMs
```

## Behavioral change

A successful capacity flush no longer counts as a streaming failure. A real rejected root starts at most one degradation failure per active overflow episode. Nonterminal degradation can recover from level `3` or `2` to level `1` after explicit quiescence, while the existing timer path remains a fallback.

## Profile compatibility

No bundled profile schema or selector set is changed. Existing profile hashes will remain stable only if their canonical JSON is unchanged.

## Evidence compatibility

Historical 15.8.1 runtime reports remain valid historical evidence but cannot certify 15.9.0 behavior. Final 15.9.0 evidence should be captured only when `captureReadiness.status` is `ready`.
