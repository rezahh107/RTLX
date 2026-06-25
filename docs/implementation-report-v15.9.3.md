# RTLX 15.9.3 Implementation Report

```yaml
release: 15.9.3
classification: corrective_authoritative_failure_evidence_export_patch
implementation_status: implemented
confirmed_issues_fixed: [RTLX-DBG-008, RTLX-DBG-009, RTLX-DBG-010]
external_runtime_effectiveness: insufficient_evidence
production_ready_claim: false
```

## Implemented repair

The final content-runtime snapshot is now authoritative. When it is blocked specifically by `document_hidden` or `runtime_inactive`, the background returns `RTLX-CAPTURE-VISIBLE-TAB-REQUIRED` before report assembly. The popup routes that typed result to the existing visible-tab warning and does not create a Blob or trigger a download. Ready exports and non-visibility partial exports retain their prior path.

## Modified files

| Path                                               | Exact reason                                                                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `CHANGELOG.md`                                     | Adds the 15.9.3 authoritative export-gate release entry.                                                                                |
| `README.md`                                        | Updates scope, installation, preserved behavior, and evidence limits for 15.9.3.                                                        |
| `docs/README-DELIVERY-v15.9.3-FA.md`               | Documents the Persian delivery package and live-validation boundary.                                                                    |
| `docs/README-INSTALL-v15.9.3-FA.md`                | Documents installation and the visible-tab report workflow in Persian.                                                                  |
| `docs/acceptance-v15.9.3.md`                       | Defines deterministic acceptance checks for final-snapshot blocking and popup routing.                                                  |
| `docs/architecture-v15.9.3.md`                     | Records the minimal preflight-to-final-capture race repair.                                                                             |
| `docs/migration-v15.9.2-to-v15.9.3.md`             | Documents the patch installation and unchanged data contracts.                                                                          |
| `docs/release-notes/v15.9.3.md`                    | Summarizes fixed and deliberately unchanged behavior.                                                                                   |
| `docs/requirements-v15.9.3.md`                     | Assigns stable requirements to the confirmed export defects.                                                                            |
| `manifest.base.json`                               | Bumps the extension package version to 15.9.3.                                                                                          |
| `package-lock.json`                                | Synchronizes the locked package version; dependency versions are unchanged.                                                             |
| `package.json`                                     | Bumps the package version and release-integrity artifact names to 15.9.3.                                                               |
| `registries/eslint-warning-baseline.v1.json`       | Advances the release marker and relocates reviewed popup warnings after the minimal line shift.                                         |
| `scripts/chromium-runtime-smoke.mjs`               | Updates current-version protocol and runtime-owner assertions to 15.9.3.                                                                |
| `src/background/failure-evidence.ts`               | Applies the authoritative gate immediately after the final runtime snapshot and returns a typed blocked result before report assembly.  |
| `src/content/code-zone-planner.ts`                 | Updates current mutation-owner literals to 15.9.3; behavior is unchanged.                                                               |
| `src/content/fixture-recorder.ts`                  | Updates the recorded productVersion to 15.9.3.                                                                                          |
| `src/content/frame-runtime.ts`                     | Updates current mutation-owner literals to 15.9.3; runtime logic is unchanged.                                                          |
| `src/content/mutation-plan.ts`                     | Updates the mutation-owner type literal to 15.9.3.                                                                                      |
| `src/content/mutation-planner.ts`                  | Updates current mutation-owner literals to 15.9.3; planning behavior is unchanged.                                                      |
| `src/content/typography-planner.ts`                | Updates current mutation-owner literals to 15.9.3; typography behavior is unchanged.                                                    |
| `src/generated/build-fingerprint.ts`               | Regenerates the deterministic build-input hash after the scoped source changes.                                                         |
| `src/shared/constants.ts`                          | Advances product and processor constants to 15.9.3.                                                                                     |
| `src/shared/failure-evidence.ts`                   | Adds the pure final-snapshot visibility/inactivity block decision and updates strict fixture-version validation.                        |
| `src/shared/types.ts`                              | Adds the typed failure-export result union and advances current product-version literals.                                               |
| `src/ui/popup/failure-export.ts`                   | Adds a small pure router that separates blocked, valid-export, and invalid background responses.                                        |
| `src/ui/popup/index.ts`                            | Routes the authoritative background result; blocked captures now show the existing retry message without Blob creation or anchor click. |
| `tests/unit/canonical-messaging-v152.test.ts`      | Updates the current extension-version fixture to 15.9.3.                                                                                |
| `tests/unit/confirmed-fixes-v1592.test.ts`         | Removes the non-behavioral source-string assertion superseded by executable 15.9.3 tests.                                               |
| `tests/unit/direction-owner-v1591.test.ts`         | Updates current runtime-owner token expectations to 15.9.3.                                                                             |
| `tests/unit/document-registry-v152.test.ts`        | Updates the current extension-version fixture to 15.9.3.                                                                                |
| `tests/unit/failure-evidence-export-v1593.test.ts` | Adds executable final-snapshot and popup-routing regression cases, including proof that blocked results never invoke download.          |
| `tests/unit/mutation-rollback.test.ts`             | Updates current mutation-owner fixtures to 15.9.3.                                                                                      |
| `tests/unit/mutation-style-v15.test.ts`            | Updates the current style-mutation owner fixture to 15.9.3.                                                                             |
| `tests/unit/personal-install-v1541.test.ts`        | Updates the current product-version fixture to 15.9.3.                                                                                  |
| `tests/unit/release-certification-v154.test.ts`    | Updates the expected release marker to 15.9.3.                                                                                          |
| `tests/unit/release-integrity-v1581.test.ts`       | Updates release-integrity fixtures and labels to 15.9.3.                                                                                |
| `tests/unit/runtime-stress-v151.test.ts`           | Updates current mutation-owner fixtures to 15.9.3.                                                                                      |
| `tests/unit/text-decision-cache-v1571.test.ts`     | Updates processor-version fixtures to 15.9.3.                                                                                           |
| `tests/unit/typography-protection-v1581.test.ts`   | Updates current mutation-owner fixtures and labels to 15.9.3.                                                                           |
| `tests/unit/update-coordinator-v153.test.ts`       | Updates the target-version update-quiescence fixture to 15.9.3.                                                                         |

## Validation

| Command                              | Result                             | Exit |
| ------------------------------------ | ---------------------------------- | ---: |
| `npm run format-check`               | `passed`                           |  `0` |
| `npm run typecheck`                  | `passed`                           |  `0` |
| `npm run lint`                       | `passed_with_64_reviewed_warnings` |  `0` |
| `npm run lint:warnings`              | `passed`                           |  `0` |
| `npm run validate:schemas`           | `passed`                           |  `0` |
| `npm run validate:profiles`          | `passed`                           |  `0` |
| `npm run test:coverage`              | `passed`                           |  `0` |
| `npm run adapter:conformance`        | `passed`                           |  `0` |
| `npm run build`                      | `passed`                           |  `0` |
| `npm run test:browser-smoke`         | `passed`                           |  `0` |
| `npm run manifest:validate`          | `passed`                           |  `0` |
| `npm run webext:lint`                | `passed`                           |  `0` |
| `npm run security:scan`              | `passed`                           |  `0` |
| `npm run audit:production`           | `passed`                           |  `0` |
| `npm run audit:all`                  | `passed`                           |  `0` |
| `npm run store:readiness`            | `passed`                           |  `0` |
| `npm run build:release`              | `passed`                           |  `0` |
| `npm run package:source`             | `passed`                           |  `0` |
| `npm run release:integrity`          | `passed`                           |  `0` |
| `npm run test:artifact-e2e:chromium` | `insufficient_evidence`            |  `2` |
| `npm run test:artifact-e2e:edge`     | `insufficient_evidence`            |  `2` |
| `npm run test:artifact-e2e:firefox`  | `insufficient_evidence`            |  `2` |

### Test and coverage result

```yaml
test_files: 102
tests_passed: 297
tests_failed: 0
coverage:
  statements: 87.96%
  branches: 78.22%
  functions: 91.61%
  lines: 89.40%
eslint:
  errors: 0
  reviewed_warnings: 64
  unreviewed_warnings: 0
dependency_vulnerabilities:
  production: 0
  all: 0
controlled_chromium_smoke: passed
```

## Browser artifact hashes

- `rtlx-chromium-15.9.3.zip` — `8f6ff326ec19a7301b6f0be2a5116ad4904dde994025138f1d52576d53bc44e8`
- `rtlx-edge-15.9.3.zip` — `609f234d1da8e5476fd4dac248b6d6f747bcf92acece4517b8dfc0beed0d93c0`
- `rtlx-firefox-15.9.3.zip` — `601da561b05d488ec1341ffb401d2cee04302b172ad9c29d296aedb33e2b4018`
- `rtlx-firefox-android-15.9.3.zip` — `fc2601d76c542c2ce0a95995ecd43369018b79bd854b5c6fde9de635b9fc305b`

## Preserved behavior

- No direction, language-classification, profile, selector, streaming, mutation, or readiness-computation behavior was changed.
- The popup preflight remains as early feedback; the background final-snapshot gate is authoritative.
- Non-visibility partial reports retain the existing export behavior.
- No browser permissions, telemetry, page-text capture, screenshot capture, or remote code were added.

## Evidence boundary

Exact artifact execution is `insufficient_evidence` in this environment: Chromium is blocked by administrator policy, and Edge/Firefox executables are unavailable. The final live visibility-transition workflow has not been executed on a user browser.

```text
LOCAL_GATES_PASSED_EXTERNAL_RUNTIME_INSUFFICIENT_EVIDENCE
```
