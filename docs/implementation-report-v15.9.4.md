# RTLX 15.9.4 Implementation Report

```yaml
release: 15.9.4
classification: corrective_candidate_pipeline_and_popup_locale_patch
implementation_status: implemented
confirmed_issues_fixed:
  - RTLX-DBG-011
  - RTLX-DBG-012
  - RTLX-DBG-013
  - RTLX-DBG-014
partially_confirmed_not_modified:
  - RTLX-DBG-015
  - RTLX-DBG-016
production_ready_claim: false
```

## Scope and evidence

The patch is based on the 15.9.3 Qwen runtime report and popup screenshot. The report recorded a candidate queue near its 500-item limit, three `candidate-queue` degradation transitions in about 98 ms, level-3 dwell, thousands of repeated semantic-region expansion outcomes, active discovery backlog after streaming had become quiet, and an English popup rendered in RTL order.

Only confirmed issues are repaired. The partially confirmed stale popup-status source and possible candidate-loss-at-capacity path are left unchanged.

## Implemented repairs

### Popup locale direction

`chrome.i18n.getUILanguage()` is resolved before localization. Persian UI locales set `lang="fa" dir="rtl"`; currently shipped non-Persian locales use LTR. CSS now inherits document direction and mirrors only direction-sensitive controls.

### Candidate saturation episode

The three existing full-queue call sites now report through a FrameRuntime-local episode controller. The first observation starts one episode and one degradation failure. Additional observations while the queue stays above the existing low watermark do not cause immediate extra transitions. A new episode is possible only after the existing stable-recovery interval below the existing low watermark.

### Precise mutation intake

A new pure planner uses connected inserted elements as discovery roots. Text, attribute, and removal changes directly reprocess the nearest candidate. Full text-block enumeration is invalidated only for structural block changes or protection-boundary attributes.

### Cross-cursor admission deduplication

A candidate processed without further continuation work is not re-admitted by overlapping discovery cursors unless a later mutation marks it dirty. Text-block and typography continuations always remain admissible.

## Modified files

| Path                                                 | Exact reason                                                                                                                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHANGELOG.md`                                       | Adds the 15.9.4 entry for the four confirmed repairs and explicit non-scope.                                                                                                                          |
| `IMPLEMENTATION_REPORT.md`                           | Provides the complete human-readable change, validation, risk, and evidence-boundary report for 15.9.4.                                                                                               |
| `README.md`                                          | Updates release scope, preserved behavior, build instructions, and installation version.                                                                                                              |
| `docs/README-DELIVERY-v15.9.4-FA.md`                 | Documents the Persian delivery contents and external-runtime evidence boundary.                                                                                                                       |
| `docs/README-INSTALL-v15.9.4-FA.md`                  | Documents clean unpacked installation and reload steps in Persian.                                                                                                                                    |
| `docs/acceptance-v15.9.4.md`                         | Defines deterministic acceptance criteria for locale direction, pressure episodes, mutation intake, and readiness.                                                                                    |
| `docs/architecture-v15.9.4.md`                       | Records the narrow architecture delta without changing the wider runtime pipeline.                                                                                                                    |
| `docs/implementation-report-v15.9.4.md`              | Archives the complete versioned implementation and validation report in the project documentation.                                                                                                    |
| `docs/migration-v15.9.3-to-v15.9.4.md`               | Documents the no-data-migration upgrade path from 15.9.3.                                                                                                                                             |
| `docs/release-notes/v15.9.4.md`                      | Summarizes confirmed repairs and deliberately unchanged partially confirmed areas.                                                                                                                    |
| `docs/requirements-v15.9.4.md`                       | Assigns stable requirement IDs to the four confirmed defects and preservation boundary.                                                                                                               |
| `implementation-report.json`                         | Provides the machine-readable implementation, modified-file, validation, and evidence report.                                                                                                         |
| `manifest.base.json`                                 | Bumps the extension package version to 15.9.4; permissions and manifest behavior are unchanged.                                                                                                       |
| `package-lock.json`                                  | Synchronizes the package version; dependency versions remain locked.                                                                                                                                  |
| `package.json`                                       | Bumps the package version and versioned release-integrity artifact path to 15.9.4.                                                                                                                    |
| `registries/eslint-warning-baseline.v1.json`         | Advances the release marker and updates reviewed popup warning line locations after the locale call insertion.                                                                                        |
| `scripts/chromium-runtime-smoke.mjs`                 | Updates current-version assertions and verifies zero candidate/discovery backlog after direct text-node reprocessing.                                                                                 |
| `src/content/candidate-work-controller.ts`           | Adds local candidate admission revisions and one-event-per-continuous-saturation episode tracking, using existing queue thresholds and recovery timing.                                               |
| `src/content/code-zone-planner.ts`                   | Updates the current mutation-owner literal to 15.9.4; code-zone behavior is unchanged.                                                                                                                |
| `src/content/fixture-recorder.ts`                    | Updates the recorded product version to 15.9.4.                                                                                                                                                       |
| `src/content/frame-runtime.ts`                       | Integrates precise mutation intake, cross-cursor unchanged-candidate deduplication, mutation-dirty re-admission, and candidate saturation episode gating at the three existing queue-full call sites. |
| `src/content/mutation-intake.ts`                     | Adds a pure narrow planner for child-list, text, attribute, and removal mutations and conservative structural/protection-boundary enumeration invalidation.                                           |
| `src/content/mutation-plan.ts`                       | Updates the mutation-owner type literal to 15.9.4; operation semantics are unchanged.                                                                                                                 |
| `src/content/mutation-planner.ts`                    | Updates current mutation-owner literals to 15.9.4; planning behavior is unchanged.                                                                                                                    |
| `src/content/typography-planner.ts`                  | Updates current mutation-owner literals to 15.9.4; typography behavior is unchanged.                                                                                                                  |
| `src/generated/build-fingerprint.ts`                 | Regenerates the deterministic build-input hash after the scoped source changes.                                                                                                                       |
| `src/shared/constants.ts`                            | Advances product and processor constants to 15.9.4; operational queue limits are unchanged.                                                                                                           |
| `src/shared/failure-evidence.ts`                     | Updates strict current-version validation to 15.9.4; report decision behavior is unchanged.                                                                                                           |
| `src/shared/types.ts`                                | Advances current product/mutation-owner literal types to 15.9.4; public report schemas are unchanged.                                                                                                 |
| `src/ui/popup/index.ts`                              | Applies the browser UI locale to the popup document before localized strings are inserted.                                                                                                            |
| `src/ui/popup/locale.ts`                             | Adds a pure browser-UI-language to HTML lang/direction resolver: Persian is RTL, shipped non-Persian locales are LTR.                                                                                 |
| `src/ui/popup/styles.css`                            | Inherits document direction, preserves technical host LTR alignment, and mirrors the toggle transform for LTR/RTL.                                                                                    |
| `tests/unit/candidate-work-controller-v1594.test.ts` | Verifies unchanged-candidate suppression, dirty re-admission, and bounded candidate saturation episode lifecycle.                                                                                     |
| `tests/unit/canonical-messaging-v152.test.ts`        | Updates current extension-version fixtures to 15.9.4.                                                                                                                                                 |
| `tests/unit/confirmed-fixes-v1592.test.ts`           | Updates the current-version expectation while retaining prior confirmed-fix coverage.                                                                                                                 |
| `tests/unit/direction-owner-v1591.test.ts`           | Updates runtime-owner token expectations to 15.9.4.                                                                                                                                                   |
| `tests/unit/document-registry-v152.test.ts`          | Updates current extension-version fixtures to 15.9.4.                                                                                                                                                 |
| `tests/unit/failure-evidence-export-v1593.test.ts`   | Updates current-version fixtures while preserving the 15.9.3 authoritative export-gate regressions.                                                                                                   |
| `tests/unit/mutation-intake-v1594.test.ts`           | Verifies precise added-element roots, direct text/removal/attribute work, and narrow enumeration invalidation.                                                                                        |
| `tests/unit/mutation-rollback.test.ts`               | Updates current mutation-owner fixtures to 15.9.4.                                                                                                                                                    |
| `tests/unit/mutation-style-v15.test.ts`              | Updates current style-mutation owner fixtures to 15.9.4.                                                                                                                                              |
| `tests/unit/personal-install-v1541.test.ts`          | Updates current product-version fixtures to 15.9.4.                                                                                                                                                   |
| `tests/unit/popup-locale-v1594.test.ts`              | Verifies Persian RTL and English/non-Persian LTR popup document metadata.                                                                                                                             |
| `tests/unit/release-certification-v154.test.ts`      | Updates the expected release marker to 15.9.4.                                                                                                                                                        |
| `tests/unit/release-integrity-v1581.test.ts`         | Updates versioned artifact fixtures and labels to 15.9.4.                                                                                                                                             |
| `tests/unit/runtime-stress-v151.test.ts`             | Adds/reuses stress coverage for one candidate-pressure episode and updates current owner fixtures.                                                                                                    |
| `tests/unit/text-decision-cache-v1571.test.ts`       | Updates processor-version fixtures to 15.9.4.                                                                                                                                                         |
| `tests/unit/typography-protection-v1581.test.ts`     | Updates current mutation-owner fixtures and labels to 15.9.4.                                                                                                                                         |
| `tests/unit/ui-persian-ux-v1552.test.ts`             | Replaces the permanent-RTL assertion with locale-aware direction requirements while retaining Persian UI checks.                                                                                      |
| `tests/unit/update-coordinator-v153.test.ts`         | Updates the target-version update-quiescence fixture to 15.9.4.                                                                                                                                       |

## Validation

| Command                              | Result                                         | Exit |
| ------------------------------------ | ---------------------------------------------- | ---: |
| `npm run format-check`               | `passed`                                       |  `0` |
| `npm run typecheck`                  | `passed`                                       |  `0` |
| `npm run lint`                       | `passed_with_64_reviewed_warnings`             |  `0` |
| `npm run lint:warnings`              | `passed`                                       |  `0` |
| `npm run validate:schemas`           | `passed`                                       |  `0` |
| `npm run validate:profiles`          | `passed`                                       |  `0` |
| `npm test`                           | `passed_105_files_307_tests`                   |  `0` |
| `npm run test:coverage`              | `passed`                                       |  `0` |
| `npm run adapter:conformance`        | `passed`                                       |  `0` |
| `npm run build`                      | `passed_four_targets`                          |  `0` |
| `npm run test:browser-smoke`         | `passed`                                       |  `0` |
| `npm run manifest:validate`          | `passed`                                       |  `0` |
| `npm run webext:lint`                | `passed`                                       |  `0` |
| `npm run security:scan`              | `passed`                                       |  `0` |
| `npm run audit:production`           | `passed_zero_vulnerabilities`                  |  `0` |
| `npm run audit:all`                  | `passed_zero_vulnerabilities`                  |  `0` |
| `npm run store:readiness`            | `passed`                                       |  `0` |
| `npm run build:release`              | `passed`                                       |  `0` |
| `npm run test:artifact-e2e:chromium` | `insufficient_evidence_admin_policy`           |  `2` |
| `npm run test:artifact-e2e:edge`     | `insufficient_evidence_executable_unavailable` |  `2` |
| `npm run test:artifact-e2e:firefox`  | `insufficient_evidence_executable_unavailable` |  `2` |
| `clean source package rebuild`       | `passed`                                       |  `0` |

### Deterministic results

```yaml
test_files: 105
tests_passed: 307
tests_failed: 0
coverage:
  statements: 87.96%
  branches: 78.39%
  functions: 91.61%
  lines: 89.40%
eslint:
  errors: 0
  reviewed_warnings: 64
  unreviewed_warnings: 0
dependency_vulnerabilities:
  production: 0
  all: 0
controlled_chromium_smoke:
  status: passed
  degradation_level: 0
  degradation_transitions: 0
  pending_candidates: 0
  pending_discovery_roots: 0
  capture_readiness: ready
  text_blocks_discovered: 8
  text_blocks_processed: 8
  text_block_enumerations_pending: 0
  typography_verification_failures: 0
build_input_hash: sha256:91545d4177913f924f0052f490349f5bbfa89625e93cb8af62b3bc059a0dc52d
clean_source_rebuild: passed
```

## Browser artifact hashes

- `rtlx-chromium-15.9.4.zip` — `f46d11a838cbdf200865cf5a1cdca2a5134687925b331b6547f8131d5e5f9135`
- `rtlx-edge-15.9.4.zip` — `92b2c892588ae72434ae5ba89d8b0b10c0a2c56c5c3d78712eed0d44431cc97c`
- `rtlx-firefox-15.9.4.zip` — `27237730ba1b4867ed58e443121c6394609cbc763b36c43271db80ec883babee`
- `rtlx-firefox-android-15.9.4.zip` — `6941edc3c249e0807e1fe6f21246f42e4fa69e6337f3272793de79f3bed71d30`

## Regression risks and controls

- **Under-processing indirect framework changes:** replacement, removal-only, inserted text, inserted elements, and protection-boundary attributes have dedicated tests; structural insertions still use discovery.
- **Stale semantic block maps:** structural block additions/removals and semantic/protection attributes still invalidate enumeration.
- **Under-reporting sustained pressure:** one continuous episode is coalesced, but a later episode is allowed after stable low-watermark recovery.
- **Candidate starvation:** continuations bypass unchanged-work deduplication, visible/background queue behavior and capacity values are unchanged.
- **Locale layout regression:** Persian and English direction resolution and direction-sensitive toggle transforms are tested.

## Preserved behavior

- No profile, selector, language classifier, direction threshold, typography policy, queue-limit, browser-permission, evidence-privacy, or report-schema change.
- The 15.9.3 authoritative final-snapshot export gate remains unchanged.
- The partially confirmed hard-cap candidate-loss path is not modified.

## Evidence boundary

Exact release-artifact execution remains `insufficient_evidence`: Chromium unpacked extensions are blocked by administrator policy, and Edge/Firefox executables are unavailable. No real Qwen/ChatGPT/Claude 15.9.4 report has yet been captured.

```text
LOCAL_GATES_PASSED_EXTERNAL_RUNTIME_INSUFFICIENT_EVIDENCE
```
