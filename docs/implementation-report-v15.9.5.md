# RTLX 15.9.5 Implementation Report

## Status

```yaml
version: 15.9.5
release_classification: corrective_runtime_rebind_and_coverage_certification_patch
implementation_status: implemented
local_repository_gates: passed
real_deepseek_15_9_5_effectiveness: insufficient_evidence
production_ready_claim: false
```

## Evidence scope

The implementation responds only to four confirmed failures in the real RTLX 15.9.4 DeepSeek runtime report:

1. `captureReadiness.status=ready` despite `textBlocksDiscovered=193` and `textBlocksProcessed=188`;
2. discovered text blocks suppressed by processed-revision candidate admission;
3. a new same-version runtime reconciling ownership from an existing runtime in the same browser document;
4. selected-element evidence cleared after only the content-runtime instance changed.

No classifier, selector, profile, typography, mutation-intake, streaming-policy, candidate-limit, permission, or privacy behavior was changed.

## Implemented repairs

### Text-block completion

- `unprocessedTextBlocks.has(candidate)` is now treated as required continuation work.
- Connected unprocessed blocks are requeued during bounded capture stabilization.
- Runtime Snapshot `1.10.0` adds `captureReadiness.textBlocksProcessingPending`.
- Readiness remains `partial` and certification remains false while pending text-block processing is non-zero.

### Background/content runtime rebind

- A failed current-epoch ping is followed by a bounded `RTLX_REBIND_RUNTIME_EPOCH` attempt.
- Successful rebind updates the content messaging epoch and repeats `REQUEST_CONTEXT` without recreating `FrameRuntime`.
- Programmatic content-script injection occurs only when both ping and rebind fail.
- Report creation uses `ENSURE_CURRENT_TAB_RUNTIME` and no longer unconditionally reprocesses the target page.

### Physical document identity

- When both sides provide a browser document ID, physical identity uses matching browser document ID plus document generation.
- Content-runtime instance ID remains provenance and the conservative fallback when browser document IDs are unavailable.
- A real browser-document change still invalidates selected evidence.

## Modified files

| File                                                 | Exact reason                                                                                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHANGELOG.md`                                       | Adds the 15.9.5 corrective release entry and records only the four confirmed repairs.                                                                             |
| `README.md`                                          | Updates the project overview, scoped changes, boundaries, installation, and validation commands for 15.9.5.                                                       |
| `manifest.base.json`                                 | Advances the browser-extension manifest version to 15.9.5; permissions and capabilities are unchanged.                                                            |
| `package-lock.json`                                  | Synchronizes the locked root package version with 15.9.5; dependency versions are unchanged.                                                                      |
| `package.json`                                       | Advances the package version and versioned release-integrity artifact names to 15.9.5.                                                                            |
| `registries/eslint-warning-baseline.v1.json`         | Advances the release marker and relocates existing reviewed warning entries after scoped line shifts; no new warning classification was added.                    |
| `scripts/chromium-runtime-smoke.mjs`                 | Updates current-version messages and verifies Runtime Snapshot 1.10.0 with zero pending text-block processing.                                                    |
| `src/background/document-registry.ts`                | Separates physical browser-document identity from content-runtime instance identity when browser document IDs are available.                                      |
| `src/background/index.ts`                            | Adds the non-mutating runtime-ensure request and ensures a live/rebound runtime before failure-evidence export.                                                   |
| `src/background/permission-manager.ts`               | Adds bounded stale-epoch rebind and injects only when ping and rebind both prove no usable content runtime exists.                                                |
| `src/background/tab-lifecycle-registry.ts`           | Retries failed content commands once after bounded runtime-epoch rebind, preserving existing unavailable/queue behavior on failure.                               |
| `src/content/capture-readiness.ts`                   | Adds pending text-block processing to readiness reasons and certification eligibility.                                                                            |
| `src/content/code-zone-planner.ts`                   | Updates current mutation-owner literals to 15.9.5; code-zone behavior is unchanged.                                                                               |
| `src/content/fixture-recorder.ts`                    | Updates the current recorded-fixture product version to 15.9.5.                                                                                                   |
| `src/content/frame-runtime.ts`                       | Re-admits discovered unprocessed text blocks, recovers connected unqueued blocks during stabilization, emits Runtime Snapshot 1.10.0, and updates owner literals. |
| `src/content/index.ts`                               | Accepts the authenticated epoch-rebind command, updates the messaging epoch, and re-registers context without restarting FrameRuntime.                            |
| `src/content/mutation-plan.ts`                       | Updates the current mutation-owner literal type to 15.9.5.                                                                                                        |
| `src/content/mutation-planner.ts`                    | Updates current mutation-owner literals to 15.9.5; planning behavior is unchanged.                                                                                |
| `src/content/typography-planner.ts`                  | Updates current mutation-owner literals to 15.9.5; typography behavior is unchanged.                                                                              |
| `src/generated/build-fingerprint.ts`                 | Regenerates the deterministic build-input hash after scoped source changes.                                                                                       |
| `src/shared/constants.ts`                            | Advances product and processor constants to 15.9.5; operational limits are unchanged.                                                                             |
| `src/shared/failure-evidence.ts`                     | Validates Runtime Snapshot 1.10.0 and its new readiness field; advances current fixture version.                                                                  |
| `src/shared/messages.ts`                             | Adds typed ENSURE_CURRENT_TAB_RUNTIME and RTLX_REBIND_RUNTIME_EPOCH contracts plus bounded rebind validation.                                                     |
| `src/shared/types.ts`                                | Adds textBlocksProcessingPending, advances Runtime Snapshot to 1.10.0, and advances current-version literal types.                                                |
| `src/ui/popup/index.ts`                              | Replaces unconditional report-time APPLY_CURRENT_TAB with non-mutating runtime ensure.                                                                            |
| `tests/unit/candidate-work-controller-v1594.test.ts` | Updates current release labeling and documents required follow-up work bypassing generic revision suppression.                                                    |
| `tests/unit/canonical-messaging-v152.test.ts`        | Updates current-version fixtures and verifies epoch-rebind command acceptance independently of the stale epoch.                                                   |
| `tests/unit/capture-readiness-v159.test.ts`          | Verifies pending text-block processing blocks certification while complete processing remains ready.                                                              |
| `tests/unit/confirmed-fixes-v1592.test.ts`           | Updates the current-version label while retaining prior confirmed-fix regression coverage.                                                                        |
| `tests/unit/direction-owner-v1591.test.ts`           | Updates current direction-owner token fixtures to 15.9.5.                                                                                                         |
| `tests/unit/document-registry-v152.test.ts`          | Verifies same browser document plus new content-runtime instance remains current, while a different browser document is rejected.                                 |
| `tests/unit/failure-evidence-export-v1593.test.ts`   | Updates Runtime Snapshot fixtures with the new readiness field while preserving authoritative export-gate tests.                                                  |
| `tests/unit/mutation-intake-v1594.test.ts`           | Updates current release labeling; mutation-intake assertions are unchanged.                                                                                       |
| `tests/unit/mutation-rollback.test.ts`               | Updates current mutation-owner fixtures to 15.9.5.                                                                                                                |
| `tests/unit/mutation-style-v15.test.ts`              | Updates current style-mutation owner fixture to 15.9.5.                                                                                                           |
| `tests/unit/permission-injection-v1571.test.ts`      | Verifies stale-epoch rebind prevents duplicate injection and report-time ensure does not reprocess the page.                                                      |
| `tests/unit/personal-install-v1541.test.ts`          | Updates current product-version fixture to 15.9.5.                                                                                                                |
| `tests/unit/popup-activation-v1554.test.ts`          | Verifies report creation uses ENSURE_CURRENT_TAB_RUNTIME rather than unconditional APPLY_CURRENT_TAB.                                                             |
| `tests/unit/popup-locale-v1594.test.ts`              | Updates current release labeling; locale-direction assertions are unchanged.                                                                                      |
| `tests/unit/release-certification-v154.test.ts`      | Updates the expected current release marker to 15.9.5.                                                                                                            |
| `tests/unit/release-integrity-v1581.test.ts`         | Updates versioned release-integrity fixtures and labels to 15.9.5.                                                                                                |
| `tests/unit/runtime-stress-v151.test.ts`             | Updates current mutation-owner fixture to 15.9.5; stress behavior is unchanged.                                                                                   |
| `tests/unit/text-decision-cache-v1571.test.ts`       | Updates current processor-version fixtures to 15.9.5.                                                                                                             |
| `tests/unit/typography-protection-v1581.test.ts`     | Updates current mutation-owner fixtures and release label to 15.9.5.                                                                                              |
| `tests/unit/update-coordinator-v153.test.ts`         | Updates target-version update-quiescence fixtures to 15.9.5.                                                                                                      |
| `docs/README-DELIVERY-v15.9.5-FA.md`                 | Documents the Persian delivery package, scope, and external evidence boundary.                                                                                    |
| `docs/README-INSTALL-v15.9.5-FA.md`                  | Documents Persian unpacked installation and the new readiness field.                                                                                              |
| `docs/acceptance-v15.9.5.md`                         | Defines deterministic acceptance cases and release gates for the confirmed repairs.                                                                               |
| `docs/architecture-v15.9.5.md`                       | Documents runtime epoch rebind, physical document identity, text-block readiness, and report workflow.                                                            |
| `docs/migration-v15.9.4-to-v15.9.5.md`               | Documents upgrade steps and Runtime Snapshot 1.10.0 consumer impact.                                                                                              |
| `docs/release-notes/v15.9.5.md`                      | Summarizes fixed behavior, unchanged boundaries, and verification status.                                                                                         |
| `docs/requirements-v15.9.5.md`                       | Defines versioned requirements and explicit non-goals for this corrective patch.                                                                                  |
| `IMPLEMENTATION_REPORT.md`                           | Provides the complete human-readable implementation and validation record.                                                                                        |
| `implementation-report.json`                         | Provides the machine-readable implementation, validation, and evidence-status record.                                                                             |
| `docs/implementation-report-v15.9.5.md`              | Archives the versioned human-readable implementation report inside project documentation.                                                                         |

## Validation

| Command                       | Result                                        | Exit |
| ----------------------------- | --------------------------------------------- | ---: |
| `npm run format-check`        | passed                                        |    0 |
| `npm run typecheck`           | passed                                        |    0 |
| `npm run lint`                | passed with 64 reviewed warnings and 0 errors |    0 |
| `npm run lint:warnings`       | passed, 64 reviewed, 0 unreviewed             |    0 |
| `npm run validate:schemas`    | passed                                        |    0 |
| `npm run validate:profiles`   | passed                                        |    0 |
| `npm test`                    | passed: 105 files, 311 tests                  |    0 |
| `npm run test:coverage`       | passed                                        |    0 |
| `npm run adapter:conformance` | passed                                        |    0 |
| `npm run build`               | passed for four targets                       |    0 |
| `npm run test:browser-smoke`  | passed                                        |    0 |
| `npm run manifest:validate`   | passed                                        |    0 |
| `npm run webext:lint`         | passed                                        |    0 |
| `npm run security:scan`       | passed                                        |    0 |
| `npm run audit:production`    | passed, zero vulnerabilities                  |    0 |
| `npm run audit:all`           | passed, zero vulnerabilities                  |    0 |
| `npm run store:readiness`     | passed                                        |    0 |
| `npm run build:release`       | passed                                        |    0 |
| exact Chromium artifact       | insufficient evidence: administrator policy   |    2 |
| exact Edge artifact           | insufficient evidence: executable unavailable |    2 |
| exact Firefox artifact        | insufficient evidence: executable unavailable |    2 |

### Deterministic results

```yaml
test_files: 105
tests_passed: 311
tests_failed: 0
coverage:
  statements: 87.84%
  branches: 77.52%
  functions: 91.01%
  lines: 89.25%
eslint:
  errors: 0
  reviewed_warnings: 64
  unreviewed_warnings: 0
dependency_vulnerabilities:
  production: 0
  all: 0
controlled_chromium_smoke:
  status: passed
  runtime_snapshot_schema: 1.10.0
  processor_version: 15.9.5
  degradation_level: 0
  pending_candidates: 0
  pending_discovery_roots: 0
  capture_readiness: ready
  text_blocks_processing_pending: 0
  text_blocks_discovered: 8
  text_blocks_processed: 8
  typography_verification_failures: 0
build_input_hash: sha256:93c364ae1208828be3ebdabb16b9dc25a5af94dd7927a2d0a5aec7ae17385627
```

## Browser artifact hashes

- `rtlx-chromium-15.9.5.zip` — `5146574b5a12b39d478c72e4d3493d98964a6e82780122752efe4c8d6663b770`
- `rtlx-edge-15.9.5.zip` — `8c1832e3041130cc142ecdf7411b74baf55da5710db48a621aa69f3538b4eabe`
- `rtlx-firefox-15.9.5.zip` — `2c4fb3f8dfe0737b88b4537f3ef2b202d842657392022384d6e1a1b49a7de770`
- `rtlx-firefox-android-15.9.5.zip` — `0569230d8618a6a7c2e10d9f412b423406fa81cc14e536e9ecb376e3624f058d`

## Risks and controls

- **Rebind timeout:** bounded to 500 ms before existing injection fallback.
- **Rebind authorization:** sender extension ID, protocol, extension version, command metadata, and target document constraints remain enforced.
- **Duplicate text-block work:** existing candidate queue sets deduplicate admissions; processed blocks are removed from the unprocessed map.
- **Stale selection retention:** runtime changes are tolerated only when a valid browser document ID and generation match; real document changes remain rejected.
- **Schema compatibility:** Runtime Snapshot advanced explicitly from `1.9.0` to `1.10.0`.

## External evidence boundary

Local and controlled gates do not establish real-site effectiveness. A clean RTLX 15.9.5 DeepSeek report is still required to confirm:

```yaml
startupReconciliation:
  previousRuntimeMarker: null
  cleanupPerformed: false
captureReadiness:
  status: ready
  certificationEligible: true
  textBlocksProcessingPending: 0
textBlockCoverage:
  textBlocksDiscovered: N
  textBlocksProcessed: N
selectedElement:
  status: available
```

Final classification:

```text
LOCAL_GATES_PASSED_EXTERNAL_RUNTIME_INSUFFICIENT_EVIDENCE
```
