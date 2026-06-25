# RTLX 15.4.1 Acceptance Criteria — Personal Install Hardening

| ID        | Acceptance criterion                                                                              | Evidence                                          |
| --------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| PIH-001-A | Chromium and Edge manifests contain the frozen public key                                         | manifest validation and personal-install verifier |
| PIH-001-B | The derived ID equals `hilpenggipeilpdadnfdaokfocfpapjd`                                          | deterministic unit/script assertion               |
| PIH-001-C | Firefox manifests do not receive the Chromium public key                                          | manifest validation                               |
| PIH-002-A | Exported backup is canonical, versioned, bounded, and SHA-256 checksummed                         | unit test                                         |
| PIH-002-B | Import supports dry-run and rejects checksum/schema/version errors                                | unit test and schema validation                   |
| PIH-002-C | Restore does not grant permissions or activate Safe Mode/journal state                            | deterministic assertions                          |
| PIH-002-D | Managed settings absent from the backup are removed deterministically                             | unit test                                         |
| PIH-003-A | Installer verifies ZIP hash, manifest version, and critical-file hashes before replacement        | installer contract test                           |
| PIH-003-B | Fixed install directory is replaced atomically and previous directory is restored on failure      | installer implementation and contract test        |
| PIH-004-A | Options can run health check, export backup/support data, clear diagnostics, and attempt recovery | typecheck/build and message-contract tests        |
| PIH-004-B | Recovery and diagnostics clearing remain available while Safe Mode is active                      | message mutability contract                       |
| PIH-005-A | Every target build contains a versioned critical-file integrity manifest                          | build and manifest validation                     |
| PIH-005-B | Missing or mismatched critical files produce degraded/recovery status rather than silent PASS     | unit test                                         |

Store signing, public listing, staged rollout, and store review are not applicable to the approved personal-use scope.
