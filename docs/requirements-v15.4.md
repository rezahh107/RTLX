# RTLX 15.4.0 Requirements — Release Certification & Distribution Hardening

Status: approved implementation scope for this repository build. RTLX-SSOT v12.0.0 remains authoritative.

| ID     | Requirement                                                                            | Implementation state                                                    |
| ------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| RC-001 | Execute manifest-loaded tests from exact packaged ZIP artifacts                        | implemented                                                             |
| RC-002 | Provide real worker/process termination campaign hooks                                 | implemented harness; environment evidence required                      |
| RC-003 | Provide installed update/rollback campaign contract                                    | implemented harness/gate; browser evidence required                     |
| RC-004 | Preserve versioned performance budgets and 30-run certification gate                   | implemented harness; threshold certification not run                    |
| RC-005 | Provide eight-hour multi-tab memory-retention gate                                     | implemented harness; not run                                            |
| RC-006 | Provide Edge Sleeping Tabs/policy certification matrix                                 | implemented evidence contract; managed Edge not run                     |
| RC-007 | Preserve separate Firefox Desktop/Android artifacts and device gate                    | implemented; signed/device execution not run                            |
| RC-008 | Preserve manual accessibility certification matrix                                     | documented gate; not run                                                |
| RC-009 | Add manual-only store staging pipeline                                                 | implemented; no automatic publishing                                    |
| RC-010 | Verify signed/store-repacked artifacts against unsigned release                        | implemented; signed artifacts unavailable                               |
| RC-011 | Add Chrome/browser namespace adapter conformance evidence                              | implemented static contract evidence; real-browser parity remains gated |
| RC-012 | Make all existing lint warnings reviewed and fail on new warnings                      | implemented versioned baseline                                          |
| RC-013 | Produce tamper-evident SHA-256 release attestation                                     | implemented and locally verified                                        |
| RC-014 | Require release-candidate tags, manual approval, staged rollout and rollback rehearsal | implemented workflow/docs; external rollout not run                     |

## Frozen boundaries

No language, permission, profile-schema, telemetry, remote-code, font, selector-repair, or UI-scope expansion is permitted by this release.
