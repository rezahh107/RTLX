# Migration: RTLX 15.8.0 → 15.8.1

## Scope

This is a corrective patch release. No new permission, user setting, profile format, storage migration, or remote service is introduced.

## Runtime changes

- Ordered text-block discovery now uses resumable cursors instead of stopping after a one-shot 512-descendant inspection.
- Typography fingerprints include protection and structural context.
- RTLX-owned typography classes are reconciled when a target becomes protected.
- Runtime Snapshot schema advances from `1.6.0` to `1.7.0` with additional coverage counters.

## Evidence and release changes

- External placeholder creation no longer reports `passed`; unresolved gates return `blocked` and exit code `2`.
- Browser packages receive a final verifiable SHA-256 manifest.
- The full development dependency audit now fails at high severity.

## Installation

Remove or disable 15.8.0, load the corresponding 15.8.1 browser package, and confirm the extension version is `15.8.1`. Existing settings remain compatible.

## Rollback

Disable 15.8.1 and reinstall 15.8.0. No data transformation is required. Runtime ownership remains journal-based and the extension rollback command remains available.
