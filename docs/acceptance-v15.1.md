# RTLX v15.1 Acceptance Criteria and Executed Status

## Contract and scope

| Criterion                                    | Status | Evidence                                                 |
| -------------------------------------------- | ------ | -------------------------------------------------------- |
| package and generated manifests are `15.1.0` | pass   | build and manifest-validation logs                       |
| SSOT unchanged                               | pass   | no SSOT file is part of the implementation diff          |
| Profile Schema v3 preserved                  | pass   | schema/profile validation; no breaking profile migration |
| reliability-only scope                       | pass   | changed-file review and architecture delta               |

## BH implementation

BH-001 through BH-012 are implemented and covered by executed unit/stress tests. BH-013 instrumentation is implemented, but its real performance/memory thresholds are `insufficient_evidence`. BH-014 harnessing is implemented; this environment could not execute unpacked manifest-loaded Chromium because of administrator policy, and has no Edge or Firefox executable.

## Automated development gates

| Gate                              | Status                                 | Executed result                                                                           |
| --------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| format                            | pass                                   | Prettier check                                                                            |
| strict TypeScript                 | pass                                   | `tsc --noEmit`                                                                            |
| ESLint                            | pass                                   | zero errors; warnings retained in log                                                     |
| schemas/profiles                  | pass                                   | seven schemas and twelve bundled profiles plus certification/index fixtures               |
| unit/property/security/regression | pass                                   | 53 files, 138 tests                                                                       |
| coverage                          | pass as development evidence           | 92.69% statements/lines, 82.09% branches, 90% functions                                   |
| listener/timer/observer stress    | pass                                   | required deterministic stress suites                                                      |
| all target builds                 | pass                                   | Chromium, Edge, Firefox generated                                                         |
| manifest validation               | pass                                   | generated target manifests                                                                |
| Firefox web-ext lint              | pass                                   | zero errors and zero documented compatibility warnings                                    |
| prohibited remote code scan       | pass                                   | security scan                                                                             |
| production dependency audit       | pass                                   | zero production vulnerabilities                                                           |
| full development dependency audit | partial                                | six high advisories in Vitest/Vite/esbuild toolchain; zero critical under configured gate |
| deterministic release packages    | pass                                   | two consecutive byte-identical runs                                                       |
| clean-source reproduction         | pending until final source package run | final report/log records result                                                           |

## Browser and release gates

| Gate                                          | Status                | Reason                                                                         |
| --------------------------------------------- | --------------------- | ------------------------------------------------------------------------------ |
| real Chromium content-runtime smoke           | pass                  | final built content bundle executed in Chromium with no uncaught runtime error |
| Chromium manifest-loaded E2E                  | insufficient_evidence | browser administrator policy disables unpacked extensions                      |
| Edge manifest-loaded E2E                      | insufficient_evidence | Edge executable unavailable                                                    |
| Firefox WebExtension E2E                      | insufficient_evidence | Firefox executable unavailable                                                 |
| BH-013 pinned performance/memory/CLS campaign | insufficient_evidence | required benchmark environment not available                                   |
| manual accessibility matrix                   | not_run               | NVDA, zoom/reflow, forced-colors, and text-spacing gates unavailable           |
| store signing/review                          | not_run               | external release authority required                                            |

## Release decision

`production_ready` remains false and release is blocked by missing real cross-browser manifest-loaded E2E, BH-013 performance/memory evidence, manual accessibility evidence, and store signing/review evidence.
