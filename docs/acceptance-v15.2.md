# RTLX v15.2 Acceptance Criteria and Executed Status

## Contract gates

| Criterion                       | Required result                                    | Executed status            |
| ------------------------------- | -------------------------------------------------- | -------------------------- |
| package and generated manifests | exactly `15.2.0`                                   | pass                       |
| SSOT                            | unchanged and compliant                            | pass                       |
| Profile Schema                  | `3.0.0`, no breaking migration                     | pass                       |
| scope                           | reliability-only                                   | pass                       |
| permissions                     | minimal; host access optional                      | pass                       |
| Amazon Ember                    | no bundled/downloaded font asset                   | pass for source/build scan |
| source archive                  | no binary fonts; pinned vendoring scripts retained | pass                       |

## Automated development gates

| Gate                                            | Executed result                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| formatting                                      | pass                                                                     |
| strict TypeScript                               | pass                                                                     |
| ESLint                                          | pass: 0 errors, 58 warnings                                              |
| schemas                                         | pass: 7                                                                  |
| profiles/certification/index/malformed fixtures | pass: 12 profiles plus all supporting checks                             |
| unit/property/security/stress tests             | pass: 63 files, 163 tests                                                |
| coverage                                        | pass: 85.43% statements, 75.05% branches, 90.20% functions, 87.03% lines |
| Chromium/Edge/Firefox builds                    | pass                                                                     |
| direct Chromium content-runtime smoke           | pass                                                                     |
| manifest validation                             | pass                                                                     |
| Firefox `web-ext lint`                          | pass: 0 errors, 0 documented compatibility warnings                      |
| prohibited-code/security scan                   | pass                                                                     |
| production dependency audit                     | pass: 0 vulnerabilities                                                  |
| complete dependency audit                       | pass: 0 vulnerabilities                                                  |
| deterministic two-run release packaging         | pass: byte-identical packages                                            |
| clean-source reproduction                       | recorded in delivery evidence; must match release hashes                 |

The aggregate `npm run check` process itself was interrupted by the execution environment limit. All of its constituent gates were run independently against the final lockfile and passed.

## Browser gates

| Gate                                 | Status                | Missing evidence                                   |
| ------------------------------------ | --------------------- | -------------------------------------------------- |
| manifest-loaded Chromium             | insufficient_evidence | administrator policy permits no unpacked extension |
| manifest-loaded Edge                 | insufficient_evidence | Edge executable unavailable                        |
| manifest-loaded Firefox              | insufficient_evidence | Firefox executable unavailable                     |
| real worker/process crash recovery   | insufficient_evidence | browser execution environment                      |
| discarded/sleeping-tab real behavior | insufficient_evidence | manifest-loaded browser environment                |
| Firefox opaque/empty-frame parity    | insufficient_evidence | Firefox executable and frame matrix                |

## Performance and accessibility gates

| Gate                                                    | Status                |
| ------------------------------------------------------- | --------------------- |
| bounded deterministic unit/stress resource tests        | pass                  |
| eight-hour multi-tab soak                               | insufficient_evidence |
| pinned real-browser memory/long-task/CLS thresholds     | insufficient_evidence |
| manual keyboard/screen-reader/high-contrast/zoom review | not_run               |
| store signing and review                                | not_run               |

## Release rule

`production_ready` remains false until every inherited SSOT release gate and all real-browser, long-duration, accessibility, signing, and store gates pass with executed evidence.
