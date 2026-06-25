# RTLX v15.3 Acceptance Criteria and Executed Status

## Contract gates

| Criterion             | Required result                             | Executed status                                   |
| --------------------- | ------------------------------------------- | ------------------------------------------------- |
| package and manifests | exactly `15.3.0`                            | pass                                              |
| SSOT                  | unchanged and compliant                     | pass                                              |
| Profile Schema        | `3.0.0`, no breaking migration              | pass                                              |
| scope                 | reliability-only                            | pass                                              |
| permissions           | minimal; host access optional               | pass                                              |
| Amazon Ember          | no bundled/downloaded font asset            | pass for source/build scan                        |
| Firefox Android       | dedicated package without desktop-only APIs | pass for static package; device gate insufficient |

## Automated development gates

| Gate                                            | Executed result                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| formatting                                      | pass                                                               |
| strict TypeScript                               | pass                                                               |
| ESLint                                          | pass: 0 errors, 61 warnings                                        |
| schemas                                         | pass: 7                                                            |
| profiles/certification/index/malformed fixtures | pass: 12 profiles plus supporting checks                           |
| unit/property/security/stress tests             | pass: 69 files, 176 tests                                          |
| coverage                                        | 85.43% statements, 75.05% branches, 90.20% functions, 87.03% lines |
| Chromium/Edge/Firefox/Firefox Android builds    | pass                                                               |
| direct Chromium content-runtime smoke           | pass                                                               |
| manifest validation                             | pass                                                               |
| Firefox lint                                    | desktop 0 errors/1 documented warning; Android 0 errors/0 warnings |
| prohibited-code/security scan                   | pass                                                               |
| production dependency audit                     | pass: 0 vulnerabilities                                            |
| complete dependency audit                       | pass: 0 vulnerabilities                                            |
| deterministic release packaging                 | pass: four byte-identical artifacts across two runs                |

## Operational proof gates

| Gate                                | Status                | Missing evidence                                |
| ----------------------------------- | --------------------- | ----------------------------------------------- |
| manifest-loaded Chromium            | insufficient_evidence | administrator policy blocks unpacked extensions |
| manifest-loaded Edge                | insufficient_evidence | Edge executable unavailable                     |
| manifest-loaded Firefox Desktop     | insufficient_evidence | Firefox executable unavailable                  |
| Firefox Android device              | insufficient_evidence | device/emulator execution unavailable           |
| real crash campaign                 | insufficient_evidence | browser/process crash environment unavailable   |
| eight-hour multi-tab soak           | not_run               | pinned long-duration environment absent         |
| 30-run/browser performance campaign | not_run               | pinned three-browser hardware matrix absent     |
| enterprise managed-policy matrix    | not_run               | managed browser environment absent              |
| manual accessibility                | not_run               | assistive-technology review absent              |
| store signing and review            | not_run               | store credentials/review absent                 |

## Release rule

`production_ready` remains false until the inherited real-browser, long-duration, accessibility, signing, and store gates pass with executed evidence.
