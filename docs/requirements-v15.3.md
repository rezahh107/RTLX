# RTLX v15.3 OU-001–OU-010 Traceability

Status terms distinguish implementation from executed verification. Browser, device, long-duration, accessibility, and store gates are not marked PASS without evidence.

| ID     | Requirement                            | Primary implementation                                           | Executed verification                                          | Status                                                               |
| ------ | -------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| OU-001 | Update-safe quiescence                 | `update-coordinator.ts`, lifecycle/background entry points       | phase, recovery, duplicate-ready, timeout and version tests    | implemented; verified_by_unit_test                                   |
| OU-002 | Real cross-browser/crash/soak campaign | existing browser harnesses, evidence workflow, release gates     | attempted in current environment                               | harness implemented; insufficient_evidence                           |
| OU-003 | Firefox Android support decision       | dedicated manifest/build/package and Android evidence script     | manifest validation and `web-ext lint`                         | implemented; static packaging verified; device evidence insufficient |
| OU-004 | Sync conflict governor                 | `sync-coordinator.ts`, settings repository, operational registry | serialization, read-back conflict, hash-only observation tests | implemented; verified_by_unit_test                                   |
| OU-005 | Runtime context census                 | `runtime-context-reconciler.ts`, lifecycle                       | supported/unsupported/bounded census tests                     | implemented; verified_by_unit_test                                   |
| OU-006 | Measured performance budget            | performance campaign and release-gate scripts                    | campaign executed without required 30-run browser matrix       | instrumentation implemented; not_run for certification               |
| OU-007 | Persistent Safe Mode                   | `safe-mode.ts`, background/content gates                         | threshold and verified-recovery tests                          | implemented; verified_by_unit_test                                   |
| OU-008 | Messaging compatibility tests          | callback messaging retained; v15.2 canonical contract            | v15.3 message/status tests and full regression suite           | implemented; verified_by_unit_test                                   |
| OU-009 | Enterprise policy matrix               | permission cooldown and policy evidence script                   | deterministic denial tests; managed-browser cases not run      | partial verification; real policy matrix not_run                     |
| OU-010 | Evidence-based release gates           | `release-evidence-gates.mjs`, operational registry               | gate report generation executed                                | implemented; verified_by_script; release remains blocked             |

## Boundary assessment

No OU requirement changes RTLX SSOT 12.0.0, Profile Schema v3, Persian/English scope, semantic direction, font policy, minimal permissions, optional-host model, privacy constraints, or ownership-checked rollback.
