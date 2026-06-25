# RTLX 15.9.6 Implementation Report

## Status

```yaml
version: 15.9.6
release_classification: corrective_nested_list_marker_direction_patch
implementation_status: implemented
confirmed_issue_fixed: RTLX-DBG-021
production_ready_claim: false
```

## Scope

This patch fixes only the confirmed failure where Persian list text was RTL while the standard list marker remained on the left because direction was applied to a nested text block rather than the marker-owning list item. CSS list items generate a separate marker box, so the text target and marker owner are now resolved independently.

No classifier, profile, queue, streaming, permission, report-schema, or explicit host-direction policy was changed.

## Implementation

- `resolveDirectionTarget()` now returns the nearest safe connected `<li>` as `listMarkerElement`.
- `planMutations()` applies the resolved RTL/LTR direction to that marker owner only when list repair is enabled, the marker owner differs from the text target, and the list item has no explicit `dir`.
- The normal RTLX direction-owner attribute and journal path are used, preserving rollback.
- Marker CSS is scoped to RTLX-owned list items.
- Text-block enumeration remains unchanged; nested `<p>` remains the text block.

## Modified files

| File                                                 | Exact reason                                                                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHANGELOG.md`                                       | Prepends the 15.9.6 corrective release entry and preserves prior history.                                                                            |
| `IMPLEMENTATION_REPORT.md`                           | Records scope, every modified file, executed validation, risks, and evidence boundaries for 15.9.6.                                                  |
| `README.md`                                          | Updates the project overview, scope, commands, and evidence boundary for 15.9.6.                                                                     |
| `docs/README-DELIVERY-v15.9.6-FA.md`                 | Adds the Persian delivery-package guide for the nested-list marker repair.                                                                           |
| `docs/README-INSTALL-v15.9.6-FA.md`                  | Adds Persian unpacked-install and real DeepSeek verification steps for 15.9.6.                                                                       |
| `docs/acceptance-v15.9.6.md`                         | Defines deterministic acceptance cases and release gates for list marker ownership.                                                                  |
| `docs/architecture-v15.9.6.md`                       | Documents separate text-direction and list-marker targets without changing enumeration.                                                              |
| `docs/implementation-report-v15.9.6.md`              | Archives the human-readable implementation report inside versioned project documentation.                                                            |
| `docs/migration-v15.9.5-to-v15.9.6.md`               | Documents the bounded upgrade and reload procedure from 15.9.5.                                                                                      |
| `docs/release-notes/v15.9.6.md`                      | Summarizes the confirmed repair, unchanged behavior, and external evidence boundary.                                                                 |
| `docs/requirements-v15.9.6.md`                       | Defines stable requirement IDs LIST-MARKER-DIRECTION-001 through 008.                                                                                |
| `implementation-report.json`                         | Provides the same implementation and validation record in machine-readable form.                                                                     |
| `manifest.base.json`                                 | Bumps the extension manifest version to 15.9.6.                                                                                                      |
| `package-lock.json`                                  | Synchronizes the deterministic package lock root version to 15.9.6.                                                                                  |
| `package.json`                                       | Bumps the package version and versioned release-integrity artifact names.                                                                            |
| `registries/eslint-warning-baseline.v1.json`         | Updates current-version source labels while preserving the reviewed 64-warning baseline.                                                             |
| `scripts/chromium-runtime-smoke.mjs`                 | Adds nested paragraph list fixtures, computed ::marker RTL assertions, protected inline-code assertions, and 15.9.6 message metadata.                |
| `src/content/code-zone-planner.ts`                   | Updates mutation owner literals to the 15.9.6 release owner; code-zone behavior is unchanged.                                                        |
| `src/content/direction-target-resolver.ts`           | Resolves the nearest safe connected li as listMarkerElement while retaining the existing text and alignment targets.                                 |
| `src/content/fixture-recorder.ts`                    | Updates emitted productVersion to 15.9.6; fixture semantics are unchanged.                                                                           |
| `src/content/frame-runtime.ts`                       | Passes the separately resolved list marker owner into mutation planning and updates current release owner literals.                                  |
| `src/content/mutation-plan.ts`                       | Updates the closed mutation-operation owner literal to RTLX-15.9.6.                                                                                  |
| `src/content/mutation-planner.ts`                    | Adds owned direction planning for a separate list marker target, preserves explicit li direction, avoids duplicate mutations, and honors listRepair. |
| `src/content/typography-planner.ts`                  | Adds ::marker direction/isolation CSS scoped only to list items carrying the RTLX direction-owner attribute.                                         |
| `src/generated/build-fingerprint.ts`                 | Regenerated deterministic build input SHA-256 after the approved source changes.                                                                     |
| `src/shared/constants.ts`                            | Bumps PRODUCT_VERSION and PROCESSOR_VERSION to 15.9.6.                                                                                               |
| `src/shared/failure-evidence.ts`                     | Updates the current product-version literal without changing report structure.                                                                       |
| `src/shared/types.ts`                                | Updates current product-version literal types; schema versions remain unchanged.                                                                     |
| `tests/unit/candidate-work-controller-v1594.test.ts` | Updates current-version owner fixtures only; admission behavior remains unchanged.                                                                   |
| `tests/unit/canonical-messaging-v152.test.ts`        | Updates extension-version message fixtures to 15.9.6.                                                                                                |
| `tests/unit/confirmed-fixes-v1592.test.ts`           | Updates current-version source assertions only.                                                                                                      |
| `tests/unit/direction-owner-v1591.test.ts`           | Updates direction-owner token fixtures to the 15.9.6 release owner.                                                                                  |
| `tests/unit/document-registry-v152.test.ts`          | Updates current-version registry/message fixtures only.                                                                                              |
| `tests/unit/failure-evidence-export-v1593.test.ts`   | Updates product-version report fixtures only.                                                                                                        |
| `tests/unit/list-marker-direction-v1596.test.ts`     | Adds six focused tests for nearest-li resolution, RTL ownership, explicit-dir preservation, listRepair opt-out, nested lists, and scoped marker CSS. |
| `tests/unit/mutation-intake-v1594.test.ts`           | Updates current-version owner fixtures only; mutation-intake behavior remains unchanged.                                                             |
| `tests/unit/mutation-rollback.test.ts`               | Updates current owner fixtures so rollback continues to validate 15.9.6 journal entries.                                                             |
| `tests/unit/mutation-style-v15.test.ts`              | Updates current style-owner fixture only.                                                                                                            |
| `tests/unit/personal-install-v1541.test.ts`          | Updates expected installed version to 15.9.6.                                                                                                        |
| `tests/unit/popup-locale-v1594.test.ts`              | Updates current-version UI fixture only; locale behavior remains unchanged.                                                                          |
| `tests/unit/release-certification-v154.test.ts`      | Updates release-version certification fixtures to 15.9.6.                                                                                            |
| `tests/unit/release-integrity-v1581.test.ts`         | Updates versioned artifact and manifest fixture names to 15.9.6.                                                                                     |
| `tests/unit/runtime-stress-v151.test.ts`             | Updates current owner/version fixtures only; stress policy remains unchanged.                                                                        |
| `tests/unit/text-decision-cache-v1571.test.ts`       | Updates processor-version cache fixtures so cache identity matches 15.9.6.                                                                           |
| `tests/unit/typography-protection-v1581.test.ts`     | Updates mutation-owner fixtures only; protection behavior remains unchanged.                                                                         |
| `tests/unit/update-coordinator-v153.test.ts`         | Updates target-version quiescence fixtures to 15.9.6.                                                                                                |

## Validation steps

| Command                       | Status                          | Result                                                                                                                        |
| ----------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`           | `passed`                        | TypeScript noEmit passed; build fingerprint generated.                                                                        |
| `npm run format-check`        | `passed`                        | All tracked files matched Prettier formatting.                                                                                |
| `npm run lint`                | `passed_with_reviewed_warnings` | 0 errors, 64 warnings.                                                                                                        |
| `npm run lint:warnings`       | `passed`                        | 64 reviewed, 0 unreviewed, 0 stale baseline entries.                                                                          |
| `npm run validate:schemas`    | `passed`                        | All versioned JSON schemas passed.                                                                                            |
| `npm run validate:profiles`   | `passed`                        | All bundled profiles and certification index passed.                                                                          |
| `npm test`                    | `passed`                        | 106 test files, 317 tests, 0 failures.                                                                                        |
| `npm run test:coverage`       | `passed`                        | 87.84% statements, 77.52% branches, 91.01% functions, 89.25% lines.                                                           |
| `npm run adapter:conformance` | `passed`                        | Callback and promise namespace shapes passed.                                                                                 |
| `npm run build`               | `passed`                        | All four browser build trees generated.                                                                                       |
| `npm run test:browser-smoke`  | `passed`                        | Nested li direction and computed ::marker direction were RTL; inline code remained LTR; readiness was ready; rollback passed. |
| `npm run manifest:validate`   | `passed`                        | Generated manifests passed.                                                                                                   |
| `npm run webext:lint`         | `passed`                        | Firefox 0 errors/1 warning; Firefox Android 0 errors/0 warnings.                                                              |
| `npm run security:scan`       | `passed`                        | Security scan passed.                                                                                                         |
| `npm run audit:production`    | `passed`                        | 0 vulnerabilities.                                                                                                            |
| `npm run audit:all`           | `passed`                        | 0 vulnerabilities.                                                                                                            |
| `npm run store:readiness`     | `passed`                        | Readiness-only store gate passed; no upload attempted.                                                                        |

## Controlled Chromium assertions

```yaml
processorVersion: 15.9.6
captureReadiness: ready
certificationEligible: true
textBlocksDiscovered: 8
textBlocksProcessed: 8
textBlockEnumerationsPending: 0
textBlocksProcessingPending: 0
pendingCandidates: 0
pendingDiscoveryRoots: 0
degradationLevel: 0
nestedListItemDirections: [rtl, rtl]
nestedMarkerComputedDirections: [rtl, rtl]
inlineCodeDirection: ltr
typographyVerificationFailures: 0
rollback: passed
```

## Risks

- Applying dir to li changes inherited direction for descendants; protected code receives independent LTR and is covered by controlled smoke.
- Custom bullets implemented with ::before or SVG are not proven by the available evidence and remain outside scope.
- Host-owned explicit li direction is preserved, so an explicitly conflicting site direction remains unchanged by this patch.

## Evidence boundary

Local tests and the controlled Chromium fixture verify standard CSS list markers. They do not establish that every DeepSeek list uses a native `::marker`; final real-site visual confirmation remains `insufficient_evidence` until a 15.9.6 screenshot and runtime report are captured.
