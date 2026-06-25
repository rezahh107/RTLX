# RTLX 15.4.0 Acceptance Criteria

| Gate                   | Acceptance condition                                                                                                                       | Current evidence                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Development checks     | format, typecheck, lint, warning audit, schemas, profiles, tests, coverage, build, smoke, manifests, Firefox lint, security and audit pass | executed during delivery                                  |
| RC-001 exact artifact  | browser report mode is `manifest-loaded-exact-release-artifact` and includes artifact SHA-256                                              | environment-dependent                                     |
| RC-002 crash           | required termination cycles complete without state loss                                                                                    | insufficient_evidence unless real browser campaign exists |
| RC-003 update/rollback | installed update and rollback campaign passes                                                                                              | not_run                                                   |
| RC-004 performance     | 30 cold baseline and 30 extension runs per desktop browser meet frozen budgets                                                             | not_run                                                   |
| RC-005 soak            | eight-hour multi-tab retained-memory campaign passes                                                                                       | not_run                                                   |
| RC-006 Edge            | Sleeping Tabs and managed-policy matrix passes                                                                                             | not_run                                                   |
| RC-007 Firefox         | signed Desktop and Android packages pass runtime/device tests                                                                              | not_run                                                   |
| RC-008 accessibility   | manual assistive-technology matrix passes                                                                                                  | not_run                                                   |
| RC-009 store staging   | readiness passes; upload requires protected environment and manual approval                                                                | readiness executable; publication not run                 |
| RC-010 signed artifact | signed/repacked artifact contains no changed executable content                                                                            | insufficient_evidence without signed artifact             |
| RC-011 namespace       | static adapter surface passes and real browser parity is observed                                                                          | static pass; browser parity gated                         |
| RC-012 lint            | zero unreviewed warnings and zero errors                                                                                                   | executable                                                |
| RC-013 attestation     | source, artifacts and evidence hashes verify                                                                                               | executable                                                |
| RC-014 rollout         | RC, limited rollout and rollback rehearsal are recorded                                                                                    | not_run                                                   |

Production readiness requires all applicable release gates to be `passed`. Harness existence is not PASS evidence.
