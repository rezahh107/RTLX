# RTLX 15.4.1 Architecture Delta — Personal Install Hardening

RTLX 15.4.1 is a maintenance patch over 15.4.0. The runtime classification, mutation, rollback, profile, lifecycle, and storage architectures are unchanged.

## Added personal-install boundary

```text
Deterministic release ZIP
  -> hash-verifying local installer
  -> temporary extraction and package verification
  -> atomic fixed-directory replacement
  -> previous-directory rollback on failure
  -> user-triggered browser Reload
```

The installer never edits browser policy, enables Developer Mode, or reloads the browser automatically.

## Stable identity

A frozen public key is injected only into Chromium and Edge manifests. The private key is not retained or distributed. Firefox keeps its existing Gecko identity contract. The expected Chromium-family ID is held in `registries/personal-install.v1.json` and verified during build.

## Backup boundary

Personal backup owns only validated RTLX settings, site settings, conversation settings, user profiles, and profile history. Permission hints are advisory. Safe Mode, update/journal state, transaction markers, and diagnostics are excluded from automatic restore. Import is checksum-verified and supports a dry-run before any write.

## Health boundary

The Options health panel reports bounded operational metadata only: versions, extension ID, storage sizes, profile/diagnostic counts, pending transaction count, Safe Mode/update state, and package-integrity status. It does not persist page text, form values, or full URLs.

## Package integrity

Each target build receives `package-integrity.json`, generated after bundling. Startup validation detects missing or changed critical files. This is corruption and mixed-version detection, not a cryptographic defense against an attacker able to replace the entire unpacked directory.
