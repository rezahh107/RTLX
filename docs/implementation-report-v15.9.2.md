# RTLX 15.9.2 Implementation Report

```yaml
release: 15.9.2
classification: confirmed_runtime_repairs
implementation_status: implemented
local_repository_gates: passed_by_individual_commands
external_runtime_status: insufficient_evidence
production_ready_claim: false
```

## Scope

This release fixes only seven issues confirmed by the supplied RTLX 15.9.1 Qwen and ChatGPT runtime reports:

1. inherited `dir="auto"` falling through to `no-op` for confident Persian/mixed content;
2. RTLX ownership being reported as `already-correct` without outcome validation;
3. connected text-block continuations remaining pending without a queue entry;
4. inconsistent text-block coverage accounting after cancellation or fallback processing;
5. optional/alternative ChatGPT semantic selectors degrading otherwise healthy profile coverage;
6. selected-element evidence being cleared by same-scope SPA path changes;
7. popup export of a known blocked hidden/inactive-tab report.

No classifier threshold, site selector, permission, streaming policy, or protected-zone rule was changed.

## Implemented behavior

### Direction

Inherited `dir="auto"` now follows the same bounded confident-Persian path as missing inherited direction. An explicit local `dir="auto"` remains preserved.

### Diagnostics

`OWNED_CLASS` is no longer treated as proof of correctness. Not-modified reasons now come from the actual decision, exclusion, or typography result.

### Continuation and coverage

A pure recovery inspector identifies pending continuations that are already queued, recoverable, or invalid. The runtime reuses its existing queue; no second scheduler was added. Abandoned unprocessed discoveries are cancelled from current coverage, and a semantic fallback is registered as `fallback-region` before processing.

### Profile health

Profile rules may now carry optional `healthExpectation` and `alternativeGroup` metadata. Existing ChatGPT selectors are unchanged. The required message selector remains required; root and article fallbacks are optional/alternative.

### SPA selection and hidden capture

Selection path identity now uses the active profile's existing site/conversation scope normalization. The popup stops before export when readiness is blocked by `document_hidden` or `runtime_inactive`, and instructs the user to return to the target tab.

## Modified files

| File                                              | Exact reason                                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CHANGELOG.md`                                    | Adds the 15.9.2 confirmed-repair release entry.                                                                                                                                      |
| `README.md`                                       | Updates the project overview, installation version, scope, and evidence boundary for 15.9.2.                                                                                         |
| `_locales/en/messages.json`                       | Adds the visible-tab capture warning and status text in English.                                                                                                                     |
| `_locales/fa/messages.json`                       | Adds the visible-tab capture warning and status text in Persian.                                                                                                                     |
| `docs/README-DELIVERY-v15.9.2-FA.md`              | Documents the Persian delivery package and claim boundary.                                                                                                                           |
| `docs/README-INSTALL-v15.9.2-FA.md`               | Documents installation and valid visible-tab capture steps in Persian.                                                                                                               |
| `docs/acceptance-v15.9.2.md`                      | Defines deterministic acceptance checks and external evidence limits.                                                                                                                |
| `docs/architecture-v15.9.2.md`                    | Records only the architecture delta for confirmed repairs.                                                                                                                           |
| `docs/migration-v15.9.1-to-v15.9.2.md`            | Documents the version, profile metadata, and capture-workflow migration.                                                                                                             |
| `docs/release-notes/v15.9.2.md`                   | Summarizes implemented and deliberately unchanged behavior.                                                                                                                          |
| `docs/requirements-v15.9.2.md`                    | Assigns explicit requirements to each confirmed repair.                                                                                                                              |
| `manifest.base.json`                              | Bumps the extension package version to 15.9.2.                                                                                                                                       |
| `package-lock.json`                               | Synchronizes the locked package version with 15.9.2; dependency versions are unchanged.                                                                                              |
| `package.json`                                    | Bumps the package version and release-integrity artifact names to 15.9.2.                                                                                                            |
| `profiles/bundled/chatgpt.json`                   | Advances the ChatGPT profile metadata to v3 and marks existing semantic selectors as required, optional, or alternatives without changing selectors.                                 |
| `registries/eslint-warning-baseline.v1.json`      | Updates the release marker and reviewed warning positions after targeted line additions; one new bounded popup path-access warning is reviewed.                                      |
| `schemas/site-profile.schema.json`                | Adds optional profile-health metadata fields and advances the schema registry revision to 4 while preserving schemaVersion 3.0.0 compatibility.                                      |
| `scripts/chromium-runtime-smoke.mjs`              | Updates the exact current-version protocol and runtime-lease assertions to 15.9.2.                                                                                                   |
| `src/background/failure-evidence.ts`              | Uses active-profile site/conversation scope for selected-element path identity so same-scope SPA route changes do not clear evidence.                                                |
| `src/background/settings-repository.ts`           | Extracts the existing deterministic conversation path normalizer for reuse by selected-element evidence.                                                                             |
| `src/content/code-zone-planner.ts`                | Updates current mutation owner literals to 15.9.2; behavior is unchanged.                                                                                                            |
| `src/content/direction-decider.ts`                | Handles inherited dir=auto as unresolved context for confident Persian/mixed text while preserving local explicit auto.                                                              |
| `src/content/fixture-recorder.ts`                 | Updates recorded productVersion to 15.9.2.                                                                                                                                           |
| `src/content/frame-runtime.ts`                    | Removes ownership-as-correctness, reconnects orphaned text-block continuations to the existing queue, cancels abandoned discoveries, and records fallback regions before processing. |
| `src/content/mutation-plan.ts`                    | Updates the mutation owner type literal to 15.9.2.                                                                                                                                   |
| `src/content/mutation-planner.ts`                 | Updates current mutation owner literals to 15.9.2; planning behavior is unchanged.                                                                                                   |
| `src/content/profile-health.ts`                   | Evaluates required, optional, and alternative semantic rules without degrading healthy fallback coverage.                                                                            |
| `src/content/runtime-evidence-accumulator.ts`     | Adds bounded cancellation of unprocessed text-block discoveries for consistent coverage accounting.                                                                                  |
| `src/content/text-block-continuation-recovery.ts` | Adds a pure deterministic inspector for pending continuation tasks that are queued, recoverable, or invalid.                                                                         |
| `src/content/typography-planner.ts`               | Updates current mutation owner literals to 15.9.2; typography behavior is unchanged.                                                                                                 |
| `src/generated/build-fingerprint.ts`              | Regenerates the canonical build-input SHA-256 after the approved source changes.                                                                                                     |
| `src/shared/constants.ts`                         | Advances product and processor constants to 15.9.2.                                                                                                                                  |
| `src/shared/failure-evidence.ts`                  | Updates the strict failure-report productVersion validator to 15.9.2.                                                                                                                |
| `src/shared/profile-schema.ts`                    | Validates the two new optional health metadata fields while retaining strict unknown-field rejection.                                                                                |
| `src/shared/types.ts`                             | Adds optional rule-health fields and advances current product-version literal types.                                                                                                 |
| `src/ui/popup/index.ts`                           | Stops export when readiness is blocked by hidden/inactive state and displays an explicit retry instruction.                                                                          |
| `tests/unit/canonical-messaging-v152.test.ts`     | Updates the expected current extension version in canonical message metadata.                                                                                                        |
| `tests/unit/confirmed-fixes-v1592.test.ts`        | Adds focused regressions for inherited auto, ownership diagnostics, continuation recovery, coverage cancellation, profile health, SPA scope, and hidden capture.                     |
| `tests/unit/direction-decider.test.ts`            | Adds the direct inherited-dir=auto decision-table assertion.                                                                                                                         |
| `tests/unit/direction-owner-v1591.test.ts`        | Updates current runtime owner-token expectations to 15.9.2.                                                                                                                          |
| `tests/unit/document-registry-v152.test.ts`       | Updates current extension-version request metadata.                                                                                                                                  |
| `tests/unit/mutation-rollback.test.ts`            | Updates current mutation owner fixtures to 15.9.2.                                                                                                                                   |
| `tests/unit/mutation-style-v15.test.ts`           | Updates the current style-mutation owner fixture to 15.9.2.                                                                                                                          |
| `tests/unit/personal-install-v1541.test.ts`       | Updates the current package-integrity productVersion fixture.                                                                                                                        |
| `tests/unit/release-certification-v154.test.ts`   | Updates the expected reviewed-warning baseline release.                                                                                                                              |
| `tests/unit/release-integrity-v1581.test.ts`      | Updates the release-manifest fixture version.                                                                                                                                        |
| `tests/unit/runtime-stress-v151.test.ts`          | Updates current mutation owner fixtures used in lifecycle stress testing.                                                                                                            |
| `tests/unit/text-decision-cache-v1571.test.ts`    | Updates processorVersion inputs so cache invalidation tests exercise the current release.                                                                                            |
| `tests/unit/typography-protection-v1581.test.ts`  | Updates current typography mutation owner fixtures.                                                                                                                                  |
| `tests/unit/update-coordinator-v153.test.ts`      | Updates the target-version update-quiescence fixture to 15.9.2.                                                                                                                      |

## Validation

### Passed commands

| Command                       | Exit | Result                                                                                                                   |
| ----------------------------- | ---: | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`           |    0 | TypeScript passed; canonical build fingerprint generated.                                                                |
| `npm run validate:schemas`    |    0 | 11 schemas passed.                                                                                                       |
| `npm run validate:profiles`   |    0 | 12 bundled profiles, certification index, and malformed fixtures passed.                                                 |
| `npm test`                    |    0 | 101 files and 290 tests passed before the final added profile-group case.                                                |
| `npm run test:coverage`       |    0 | 101 files and 291 tests passed. Statements 87.96%, branches 78.04%, functions 91.61%, lines 89.40%.                      |
| `npm run format-check`        |    0 | All matched files formatted.                                                                                             |
| `npm run lint`                |    0 | 0 errors; 64 reviewed warnings.                                                                                          |
| `npm run lint:warnings`       |    0 | 64/64 warnings matched the reviewed baseline; no stale or unreviewed entries.                                            |
| `npm run adapter:conformance` |    0 | Callback and Promise adapter shapes passed.                                                                              |
| `npm run build`               |    0 | Chromium, Edge, Firefox, and Firefox Android builds completed.                                                           |
| `npm run test:browser-smoke`  |    0 | Controlled Chromium runtime and rollback passed; capture readiness was `ready`; coverage was 8 discovered / 8 processed. |
| `npm run manifest:validate`   |    0 | Generated manifests passed.                                                                                              |
| `npm run webext:lint`         |    0 | Firefox: 0 errors/1 warning; Firefox Android: 0 errors/0 warnings.                                                       |
| `npm run security:scan`       |    0 | Security scan passed.                                                                                                    |
| `npm run audit:production`    |    0 | 0 vulnerabilities.                                                                                                       |
| `npm run audit:all`           |    0 | 0 vulnerabilities.                                                                                                       |
| `npm run store:readiness`     |    0 | Readiness-only gate passed; no upload performed.                                                                         |
| `npm run build:release`       |    0 | Four deterministic browser ZIPs and artifact manifest produced and verified.                                             |

### Composite command history

- The first `npm run check` attempt stopped at `lint:warnings` because approved source additions shifted warning line positions and added one bounded popup path-access warning. The baseline was reviewed and updated; the next standalone warning audit passed.
- The second composite `npm run check` invocation was terminated by the execution environment while `test:coverage` was running. No test failure was emitted. `npm run test:coverage` and every remaining constituent command were then executed separately and passed. The composite command is therefore not claimed as a single-process pass; its individual gates are verified above.
- Source packaging initially encountered the workspace-only `node_modules` directory symlink as a file. The packaging script was not changed; the command was rerun with a temporary local package-directory layout, then passed. This does not affect the delivered source tree.

### Exact-artifact external checks

| Command                              | Exit | Evidence state                                                                 |
| ------------------------------------ | ---: | ------------------------------------------------------------------------------ |
| `npm run test:artifact-e2e:chromium` |    2 | `insufficient_evidence`: unpacked extensions disabled by administrator policy. |
| `npm run test:artifact-e2e:edge`     |    2 | `insufficient_evidence`: Edge executable unavailable.                          |
| `npm run test:artifact-e2e:firefox`  |    2 | `insufficient_evidence`: Firefox executable unavailable.                       |
| `npm run evidence:external-status`   |    2 | `blocked`: five external/manual gates remain `not_run`.                        |

## Determinism and integrity

```yaml
build_input_hash: sha256:2bf157f1553b2be116409a338e1d70ba37949f56a961e0526247b61684332
browser_artifact_manifest: RTLX-v15.9.2-ARTIFACT-SHA256-MANIFEST.json
browser_artifacts_verified: 4
```

## Remaining evidence boundary

```yaml
status: insufficient_evidence
affected_conclusion: live_site_visual_effectiveness
missing_evidence:
  - clean-tab Qwen 15.9.2 selected-element capture
  - clean-tab ChatGPT 15.9.2 selected-element capture
  - final ready capture after active streaming
  - exact packaged artifact execution on available target browsers
partial_processing_possible: true
```

## Release conclusion

RTLX 15.9.2 is locally implemented and validated for the confirmed repair scope. It is suitable for controlled live-site validation. It is not claimed production-ready or visually proven on specific live sites.
