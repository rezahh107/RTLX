# RTLX 15.9.8 Acceptance

| ID        | Acceptance criterion                                                                     | Verification                                         |
| --------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| R1598-001 | Report button enabled for `statusResponseContractViolation` and request-contract failure | deterministic popup test                             |
| R1598-002 | `RTLX-MESSAGE-005` produces downloadable schema `2.1.0` report                           | deterministic popup test                             |
| R1598-003 | Provenance exists only in issue/report diagnostics                                       | unit/source assertions                               |
| R1598-004 | Cycle and depth failures have stable code and JSON path                                  | canonical guard tests                                |
| R1598-005 | No cycle/depth sentinel replacement exists                                               | source and unit tests                                |
| R1598-006 | Invalid request error retains original request ID                                        | request-contract test                                |
| R1598-007 | Manifest opt-in without dedicated suite fails CI guard                                   | structured-clone guard test/script                   |
| R1598-008 | Exact-artifact attempts write JSON result                                                | Chromium and Firefox evidence files                  |
| R1598-009 | Existing behavior remains intact                                                         | full suite, real Chromium content smoke, four builds |

Production release gate: exact-artifact Chrome and Firefox Desktop MUST both report `pass`.
