# RTLX 15.4.1 Requirements — Personal Install Hardening

Status: approved maintenance scope. RTLX-SSOT v12.0.0 remains authoritative.

| ID      | Requirement                                                                                      | Implementation state                                                                     |
| ------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| PIH-001 | Keep Chromium and Edge unpacked extension identity stable across rebuilds and folder replacement | implemented with frozen public manifest key and deterministic ID assertion               |
| PIH-002 | Provide complete, versioned, checksummed personal backup with dry-run restore                    | implemented; permissions, Safe Mode, journals, and diagnostics are not silently restored |
| PIH-003 | Provide atomic local update tooling with hash verification and rollback                          | implemented for Node plus PowerShell/Bash wrappers                                       |
| PIH-004 | Provide a local health and recovery panel                                                        | implemented in Options with bounded, text-free status and recovery actions               |
| PIH-005 | Detect missing, mixed-version, or corrupted critical package files                               | implemented with build-generated SHA-256 package-integrity manifests                     |

## Frozen boundaries

This release adds no language, permission, profile-schema, telemetry, remote-code, selector-repair, arbitrary-CSS, font, or product-scope expansion. Store distribution is not required for the personal-install workflow.
