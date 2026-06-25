# RTLX v15.8.0 — گزارش ممیزی Wolf

- `generatedAt`: `2026-06-19T05:46:08Z`
- `mode`: `AUDIT_MODE`
- `source_modified`: `false`
- `release_generated`: `false`

## 1. وضعیت اجرایی

**نتیجه:** `CHANGES_REQUIRED`  
**توصیه انتشار:** `DO_NOT_CERTIFY_15.8.0_AS_FINAL`  
**نسخه پیشنهادی بعدی:** `15.8.1`

سه یافته با شدت `high` و اطمینان `high` پذیرفته شد: قطع خاموش enumeration پس از ۵۱۲ descendant، cache نامعتبر typography در تغییر وضعیت protection، و ناسازگاری top-level release manifest. گزارش واقعی Qwen برای `15.8.0` معتبر و در وضعیت quiescent است، اما صفحه ثبت‌شده فقط ۱۷۵ text block دارد و سناریوی تغییر protection را اجرا نکرده است؛ بنابراین دو یافته runtime را رد نمی‌کند.

## 2. موجودی بسته و Hash

- ورودی: `/mnt/data/RTLX-v15.8.0-WOLF-AUDIT-HANDOFF.zip`
- SHA-256 ورودی: `735730704cb60731e99ad2bea621b0393f535cd1aa502167f877eed562176fb0`
- ریشه سورس: `SOURCE/rtlx-v15.8.0-source/`؛ نسخه: `15.8.0`؛ package manager: `npm with package-lock.json`
- فایل‌های بسته: `543`؛ فایل‌های سورس: `510`؛ پوشه‌های سورس: `86`
- `MANIFEST-SHA256.json`: تعداد `542` رکورد، پوشش دقیق تمام فایل‌ها به‌جز خود manifest، `0` mismatch.
- ZIPها: `7` آرشیو top-level و `14` آرشیو در بررسی بازگشتی؛ `0` CRC failure، `0` unsafe path، `0` encrypted entry و `0` symlink entry.
- ZIP سورس nested و درخت `SOURCE/` در `510/510` فایل بدون اختلاف path/content یکسان‌اند.
- در سورس اشتراکی: `0` binary font، `0` backup artifact، `0` private key و `0` نام فایل مشکوک به secret. فقط font manifest و متن مجوزهای OFL وجود دارد.

Hashهای artifactهای اصلی:

- `rtlx-chromium-15.8.0.zip` → `616ba7c492e6134b596c3db2ca0b91df31a5e01c35dbde602b92bd9fff3446f3`
- `rtlx-edge-15.8.0.zip` → `8cc48179bac7ced93d338ae50875310072a26d1381d7a4921999b97c6c45798e`
- `rtlx-firefox-15.8.0.zip` → `bfcdac073be58f0ef2e5ad9a0719aeed6574319709106156b6b110306acc0344`
- `rtlx-firefox-android-15.8.0.zip` → `fb0004373aec66cb693e115056f2dd770fbff2e9d9735ec724bcc1f99d61df1d`
- `RTLX-v15.8.0-UNPACKED-INSTALL.zip` → `d77f30b371718f5f7b5a34fd9c40dd51710551257bd46ae8ee8a75a0fb22f136`
- `RTLX-v15.8.0-NEXT-DELIVERY.zip` → `412420cc525d347af0aa6483d0fc257e5180dae5124637653eaf7dd5491e7051`

## 3. نگاشت قرارداد و تقدم منابع

ترتیب اعمال‌شده: architecture/requirements فعال → schema/registry نسخه‌دار → fixture/test معتبر → implementation → implementation report/artifact → شواهد تاریخی → proposal.

| Contract                                         | Source/Test                                                                                                                      | نتیجه ممیزی                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `RTLX-TEXT-BLOCK-001/002`                        | `src/content/text-block-enumerator.ts; frame-runtime.ts` / `tests/unit/text-block-enumerator-v158.test.ts`                       | RTLX-TEXT-BLOCK-003 shows >512 completion gap                                                          |
| `RTLX-DIRECTION-001/002/003; RTLX-ALIGNMENT-001` | `frame-runtime.ts; direction-target-resolver.ts; mutation-planner.ts` / `direction/alignment v15.8 unit tests and browser smoke` | No confirmed boundary regression; standard suite and smoke passed                                      |
| `RTLX-TYPOGRAPHY-001/002`                        | `typography-planner.ts; frame-runtime.ts` / `tests/unit/typography-continuation-v158.test.ts`                                    | Bounded continuation passes; cache dependency defect is RTLX-CACHE-001                                 |
| `RTLX-TYPOGRAPHY-003`                            | `typographySkipReason; profile-zone.ts; exclusion registries` / `profile/typography fixtures`                                    | Static protections exist, but dynamic invalidation fails                                               |
| `RTLX-PROFILE-001; RTLX-EDITOR-001`              | `profile-zone.ts; bundled profiles` / `profile precedence/editor preservation tests; validate:profiles`                          | Source/test confirmed; real Claude composer remains insufficient_evidence                              |
| `RTLX-COVERAGE-001/002`                          | `runtime-evidence-accumulator.ts; frame-runtime.ts` / `runtime snapshot tests; real Qwen report`                                 | Typography pending state works; text-block cap can produce false-complete subset                       |
| `RTLX-INSPECTION-001`                            | `FrameRuntime.inspectElement; element-selection schema` / `selection/provenance tests`                                           | Current Qwen mismatch selection was cleared rather than reused; no stale projection reproduced         |
| `RTLX-PRIVACY-001`                               | `failure-evidence.ts; failure-evidence.schema.json` / `schema/security tests; real report`                                       | Confirmed privacy flags false and no page text/full URL/form/cookie/storage/network/screenshot payload |
| `Determinism and SHA-256`                        | `canonical-json.ts; package-release.mjs; manifests` / `hash recomputation; artifact compare; integrity verifier`                 | Canonical report and browser ZIPs pass; aggregate release manifest is stale                            |

## 4. فرمان‌های اجراشده و Exit Code

| ID        | Command                                                                                | Exit |  مدت (s) | نتیجه                                                                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------- | ---: | -------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CMD-001` | `npm ci`                                                                               |  `0` | `12.044` | `passed` — 468 packages installed; npm reported one high-severity dev dependency vulnerability.                                                                                  |
| `CMD-002` | `npm run format-check`                                                                 |  `0` |  `3.992` | `passed` — Prettier check passed.                                                                                                                                                |
| `CMD-003` | `npm run typecheck`                                                                    |  `0` |  `3.481` | `passed` — tsc --noEmit passed.                                                                                                                                                  |
| `CMD-004` | `npm run lint`                                                                         |  `0` |  `7.934` | `passed_with_reviewed_warnings` — 0 errors; 63 warnings.                                                                                                                         |
| `CMD-005` | `npm run lint:warnings`                                                                |  `0` |   `7.61` | `passed` — 63/63 warnings present in the reviewed baseline; no stale or unreviewed entries.                                                                                      |
| `CMD-006` | `npm run validate:schemas`                                                             |  `0` |  `0.499` | `passed` — 11 schemas validated.                                                                                                                                                 |
| `CMD-007` | `npm run validate:profiles`                                                            |  `0` |   `0.46` | `passed` — 12 bundled profiles, certification index and malformed fixtures passed.                                                                                               |
| `CMD-008` | `npm run test:coverage`                                                                |  `0` | `12.302` | `passed` — 90 test files and 249 tests passed; statements 85.87%, branches 75.09%, functions 90.72%, lines 86.95%.                                                               |
| `CMD-009` | `npm run adapter:conformance`                                                          |  `0` |  `0.292` | `passed` — Callback and Promise adapter contract shapes passed; script explicitly does not prove real-browser behavior.                                                          |
| `CMD-010` | `npm run build`                                                                        |  `0` |  `2.438` | `passed` — Schemas, profiles, package manifests, fonts and generated manifests validated; four browser builds completed.                                                         |
| `CMD-011` | `npm run test:browser-smoke`                                                           |  `0` |  `6.186` | `passed` — Controlled Chromium smoke passed, queues drained, typography verification failures were zero, rollback removed owned mutations.                                       |
| `CMD-012` | `npm run manifest:validate`                                                            |  `0` |  `0.284` | `passed` — Generated browser manifests validated.                                                                                                                                |
| `CMD-013` | `npm run webext:lint`                                                                  |  `0` |  `5.634` | `passed_with_warning` — Firefox: 0 errors/1 warning; Firefox Android: 0 errors/0 warnings.                                                                                       |
| `CMD-014` | `npm run security:scan`                                                                |  `0` |  `0.372` | `passed` — Repository security scan passed.                                                                                                                                      |
| `CMD-015` | `npm run audit:production`                                                             |  `0` |  `0.827` | `passed` — No production dependency vulnerabilities.                                                                                                                             |
| `CMD-016` | `npm run store:readiness`                                                              |  `0` |  `0.305` | `passed_readiness_only` — Readiness-only check passed; no upload or credential use.                                                                                              |
| `CMD-017` | `npm run test:artifact-e2e:chromium`                                                   |  `2` | `21.113` | `blocked` — Exact release artifact identified, but unpacked extensions are disabled by browser administrator policy.                                                             |
| `CMD-018` | `npm run test:artifact-e2e:edge`                                                       |  `2` |  `0.622` | `blocked` — Edge executable unavailable.                                                                                                                                         |
| `CMD-019` | `npm run test:artifact-e2e:firefox`                                                    |  `2` |  `0.462` | `blocked` — Firefox executable unavailable.                                                                                                                                      |
| `CMD-020` | `npx vitest run tests/audit-wolf/high-severity-repro.audit.test.ts --reporter=verbose` |  `0` |   `1.96` | `passed_reproducer` — Four audit-only tests reproduced the text-block cap, falsified Latin alternate-discovery rescue, and reproduced both protection-cache transition failures. |
| `CMD-021` | `npm run audit:all`                                                                    |  `0` |   `1.48` | `passed_threshold_but_vulnerability_reported` — The command uses audit-level=critical; npm reported one high-severity undici vulnerability but returned zero.                    |
| `CMD-022` | `npm run personal:verify`                                                              |  `0` |   `0.28` | `passed` — Personal install identity verified.                                                                                                                                   |
| `CMD-023` | `npm run evidence:verify`                                                              |  `1` |   `0.27` | `blocked_prerequisite_missing` — dist/evidence/release-attestation.json was absent because attestation generation was not performed in this audit.                               |
| `CMD-024` | `npm run artifact:signed-verify`                                                       |  `2` |   `0.26` | `blocked` — RTLX_UNSIGNED_ARTIFACT and RTLX_SIGNED_ARTIFACT were not supplied.                                                                                                   |
| `CMD-025` | `npm run evidence:external-status`                                                     |  `0` |   `0.25` | `false_positive_output_reproduced` — Script emitted status=passed while writing five status=not_run reports.                                                                     |
| `CMD-026` | `npm run evidence:gates`                                                               |  `2` |   `0.26` | `blocked` — Aggregate release gates correctly remained blocked because external and signed-artifact gates were not passed.                                                       |
| `CMD-027` | `npm run test:firefox-android-device`                                                  |  `2` |   `0.24` | `blocked` — Static packaging passed; real device/emulator execution not supplied.                                                                                                |
| `CMD-028` | `node verify_user_report.mjs`                                                          |  `0` |   `0.22` | `passed` — User-supplied Qwen 15.8.0 report passed failure-evidence schema 1.2.0 and canonical SHA-256 recomputation.                                                            |
| `CMD-029` | `python /mnt/data/rtlx_audit_integrity_check.py`                                       |  `1` |   `1.58` | `finding_reproduced` — Outer manifest and ZIP safety passed, but three records in the top release SHA manifest did not match delivered files.                                    |
| `CMD-030` | `python /mnt/data/rtlx_artifact_compare.py`                                            |  `0` |   `1.28` | `passed` — Current build output and all four release ZIPs matched exactly: 56/56 files each, no path or content differences.                                                     |
| `CMD-031` | `npm audit --json`                                                                     |  `1` |      `—` | `finding_reproduced` — One high-severity, fix-available transitive dev dependency vulnerability in undici 7.27.2.                                                                |

Exit codeهای `2` در exact-artifact و external gates به‌عنوان `blocked/insufficient_evidence` ثبت شده‌اند، نه test pass. `CMD-023` نیز به‌علت نبود attestation تولیدشده در validation copy مسدود شد. Audit-only test فقط در `/mnt/data/rtlx_audit_run/source/tests/audit-wolf/` ساخته شد و در سورس اصلی بسته تغییری ایجاد نکرد.

## 5. یافته‌های تأییدشده به‌ترتیب شدت

### RTLX-CACHE-001 — Typography Text-node fingerprints omit protection and DOM-state dependencies, producing stale eligibility decisions

- `status`: `test_reproduced`
- `severity`: `high`
- `confidence`: `high`
- `contractImpact`: `compatible`
- `verificationState`: `verified_by_synthetic_fixture`
- `affectedFiles`: `SOURCE/rtlx-v15.8.0-source/src/content/typography-planner.ts`, `SOURCE/rtlx-v15.8.0-source/src/content/observer-manager.ts`, `SOURCE/rtlx-v15.8.0-source/src/content/frame-runtime.ts`, `SOURCE/rtlx-v15.8.0-source/docs/requirements-v15.8.md`
- `affectedSymbols`: `collectTypographyBatch`, `typographyFingerprint`, `typographySkipReason`, `ObserverManager.observe`, `FrameRuntime.processedTypographyNodes`

**Evidence trail**

- `source` — `src/content/typography-planner.ts:156-190`: The cache comparison happens before typographySkipReason is reevaluated; fingerprints are stored for protected and eligible nodes alike.
- `source` — `src/content/typography-planner.ts:271-299`: Protection depends on code/icon/layout state and element/ancestor selectors, but the fingerprint contains only text, parent tag, role, dir and contextKey.
- `source` — `src/content/observer-manager.ts:7-23`: class, role, contenteditable, hidden and inert mutations are observed, but mutation handling does not invalidate the per-Text typography fingerprint for those dependency changes.
- `source` — `src/content/frame-runtime.ts:249-255,1113-1123`: The cache is reset on settings changes/teardown, not on ordinary protection-class or ancestor-state mutations; batch fingerprints are persisted after each scan.
- `test` — `/mnt/data/rtlx_audit_logs/20_audit_high_severity_repro.log`: Both transitions reproduced: protected→eligible remained skipped with inspectedNodes=0, and eligible→protected bypassed protection reevaluation with inspectedNodes=0.

**Impact**

- Typography may fail to apply after a protected region becomes normal content.
- An already-processed node that becomes code/editor/icon/layout-protected can retain or reuse stale typography state instead of honoring the current hard/protective boundary.
- Dynamic React/Vue class and ancestor changes are specifically exposed because Text node identity can remain stable while eligibility changes.

**Reproduction**

- Run CMD-020.
- Process a Persian Text node under .profile-protected and persist fingerprints; remove the class and rescan with the same context.
- Reverse the transition by adding the protection class after the eligible scan.

**Required fix**

- Make the cache key cover every dependency used by typographySkipReason, including relevant ancestor/protection state, or explicitly invalidate affected Text nodes on matching mutations.
- Reconcile already-owned typography mutations when a target transitions into a protected state; skipping future planning alone is insufficient.
- Keep invalidation bounded and deterministic.

**Required tests/evidence**

- Protected→eligible and eligible→protected transitions on the element and an ancestor.
- contenteditable, role=textbox, code/math/editor/terminal/icon/layout-sensitive transition fixtures.
- Stable Text-node identity under class replacement and framework-style rerender fixtures.
- Verification that stale TYPOGRAPHY_CLASS ownership is removed or rolled back when protection becomes active.

### RTLX-RELEASE-001 — Top-level release SHA-256 manifest is stale for three delivered artifacts

- `status`: `test_reproduced`
- `severity`: `high`
- `confidence`: `high`
- `contractImpact`: `compatible`
- `verificationState`: `verified_by_real_fixture`
- `affectedFiles`: `RELEASE-ARTIFACTS/RTLX-v15.8.0-SHA256-MANIFEST.json`, `RELEASE-ARTIFACTS/RTLX-v15.8.0-NEXT-DELIVERY.zip`, `EVIDENCE/RTLX-v15.8.0-EVIDENCE.zip`
- `affectedSymbols`: `artifacts[]`

**Evidence trail**

- `artifact` — `RELEASE-ARTIFACTS/RTLX-v15.8.0-SHA256-MANIFEST.json`: The records for RTLX-v15.8.0-COMPONENT-SHA256-MANIFEST.json, RTLX-v15.8.0-EVIDENCE.zip and RTLX-v15.8.0-NEXT-DELIVERY.zip match no delivered candidate by both bytes and SHA-256.
- `test` — `/mnt/data/rtlx_audit_logs/29_integrity_check.log`: Deterministic verifier exited 1 and printed all three expected/actual size and hash differences.
- `artifact` — `MANIFEST-SHA256.json`: The outer handoff manifest is internally valid: 542/542 listed non-manifest files matched with exact coverage.
- `artifact` — `RTLX-v15.8.0-NEXT-DELIVERY.zip!/RTLX-v15.8.0-COMPONENT-SHA256-MANIFEST.json`: The actual nested component manifest validates all 12 components, limiting the defect to stale top-level release metadata rather than corrupted browser ZIP contents.

**Impact**

- Consumers cannot authenticate the complete delivered release set using the advertised top-level manifest.
- Automation may reject valid components or trust hashes for artifacts that are not present.
- The release cannot be certified as a coherent immutable bundle until the manifest is regenerated and reverified.

**Reproduction**

- Run CMD-029 against the delivered handoff.
- Compare expected and actual bytes/SHA-256 for the three unmatched names.

**Required fix**

- Generate the top-level release manifest only after every component and container ZIP is finalized.
- Add a release gate that resolves every manifest record to exactly one delivered file and fails on extra, missing, size-mismatched or hash-mismatched artifacts.
- Regenerate the outer handoff manifest after correcting release artifacts.

**Required tests/evidence**

- A clean-room release assembly test validating all top-level and nested manifests.
- A mutation test proving a one-byte change fails the release gate.
- A deterministic rebuild test proving repeated packaging produces identical component and container hashes.

### RTLX-TEXT-BLOCK-003 — Ordered text-block enumeration silently stops after 512 inspected descendants and has no continuation contract

- `status`: `test_reproduced`
- `severity`: `high`
- `confidence`: `high`
- `contractImpact`: `compatible`
- `verificationState`: `verified_by_synthetic_fixture`
- `affectedFiles`: `SOURCE/rtlx-v15.8.0-source/src/content/text-block-enumerator.ts`, `SOURCE/rtlx-v15.8.0-source/src/content/frame-runtime.ts`, `SOURCE/rtlx-v15.8.0-source/src/content/candidate-discovery.ts`, `SOURCE/rtlx-v15.8.0-source/docs/requirements-v15.8.md`
- `affectedSymbols`: `ENUMERATION_LIMIT`, `enumerateTextBlocks`, `FrameRuntime.processCandidate`, `CandidateDiscoveryCursor.nextBatch`

**Evidence trail**

- `source` — `src/content/text-block-enumerator.ts:25,49-67`: ENUMERATION_LIMIT is 512; traversal exits when inspected reaches the cap and returns only the selected array, without hasMore/cursor/continuation metadata.
- `source` — `src/content/frame-runtime.ts:849-877`: FrameRuntime records discovered and processed counters only from the truncated array and marks the semantic region expanded; no enumeration continuation is queued.
- `source` — `src/content/candidate-discovery.ts:150-168`: The text-walker rescue path creates candidates only for Arabic-script text, so Latin blocks omitted after the cap are not universally rediscovered.
- `test` — `/mnt/data/rtlx_audit_logs/20_audit_high_severity_repro.log`: Audit-only 600-paragraph fixtures returned exactly paragraph-0..paragraph-511; paragraph-599 was absent. An exhausted CandidateDiscoveryCursor discovered only the containing main element for 600 Latin paragraphs.
- `source` — `docs/requirements-v15.8.md:5,20,26-29`: Conflicts with complete deterministic text-block decomposition and reliable discovered-versus-processed evidence.

**Impact**

- Structured regions with more than 512 inspected descendants can leave later natural-language blocks unprocessed.
- For Latin-only or Latin-tail blocks, another discovery path does not guarantee recovery.
- textBlocksDiscovered == textBlocksProcessed can still be true for the truncated subset, creating a false-complete coverage signal.

**Reproduction**

- Run CMD-020.
- Construct a main/section with 600 Latin p elements.
- Exhaust CandidateDiscoveryCursor and call enumerateTextBlocks; only the container candidate and first 512 blocks are represented.

**Required fix**

- Replace the one-shot cap with a deterministic resumable enumeration cursor or an equivalent bounded continuation mechanism.
- Do not mark a semantic region fully expanded or complete until enumeration has no remaining descendants.
- Expose incomplete enumeration in runtime evidence or ensure coverage counters cannot reach a complete state while enumeration remains pending.

**Required tests/evidence**

- A >512 Latin-block fixture that reaches the final block.
- A mixed Arabic/Latin fixture proving both discovery paths converge without duplicates.
- A quiescence assertion that remains incomplete until text-block enumeration drains.
- Boundary tests at 511, 512, 513 and large nested list/table regions.

### RTLX-DEPENDENCY-001 — The locked development toolchain contains a fix-available high-severity undici vulnerability

- `status`: `test_reproduced`
- `severity`: `medium`
- `confidence`: `high`
- `contractImpact`: `none`
- `verificationState`: `verified_by_real_fixture`
- `affectedFiles`: `SOURCE/rtlx-v15.8.0-source/package.json`, `SOURCE/rtlx-v15.8.0-source/package-lock.json`
- `affectedSymbols`: `devDependencies.web-ext`, `node_modules/undici`

**Evidence trail**

- `test` — `/mnt/data/rtlx_audit_logs/31_npm_audit_json.log`: npm audit --json exited 1 and reported undici 7.27.2 as high severity with fixAvailable=true.
- `source` — `package.json:87; package-lock.json:2142,6060`: Dependency chain is web-ext 10.4.0 → addons-linter 10.7.0 → cheerio 1.2.0 → undici 7.27.2.
- `test` — `/mnt/data/rtlx_audit_logs/15_audit_production.log`: npm audit --omit=dev --audit-level=high found zero vulnerabilities; the packaged extension runtime is not shown to contain this dependency.
- `test` — `/mnt/data/rtlx_audit_logs/21_audit_all.log`: audit:all uses audit-level=critical, so it printed the high vulnerability but returned exit 0.

**Impact**

- Risk is limited to development/lint/build tooling based on the current dependency classification, not the extension's production dependency graph.
- Build agents using affected proxy/cache paths may be exposed to the reported advisory classes.
- The current audit:all name can be misread as gating all severities although high findings do not fail it.

**Reproduction**

- Run CMD-031 or npm audit.
- Run npm explain undici to confirm the transitive chain.

**Required fix**

- Update the lockfile/toolchain to a dependency graph containing undici >=7.28.0 or an upstream release that removes the vulnerable range.
- Change the all-dependency audit gate to fail at the project's accepted severity threshold, or document an explicit time-bounded exception.

**Required tests/evidence**

- npm ci followed by npm audit --json with zero high/critical vulnerabilities.
- web-ext lint and all release checks after the dependency update.

### RTLX-EVIDENCE-001 — external-gate status command reports passed while every generated external gate is not_run

- `status`: `test_reproduced`
- `severity`: `medium`
- `confidence`: `high`
- `contractImpact`: `compatible`
- `verificationState`: `verified_by_synthetic_fixture`
- `affectedFiles`: `SOURCE/rtlx-v15.8.0-source/scripts/external-gate-status.mjs`, `SOURCE/rtlx-v15.8.0-source/scripts/release-evidence-gates.mjs`, `SOURCE/rtlx-v15.8.0-source/package.json`
- `affectedSymbols`: `reports`, `status`

**Evidence trail**

- `source` — `scripts/external-gate-status.mjs:9-50`: The script creates five reports with status=not_run and evidenceState=insufficient_evidence.
- `source` — `scripts/external-gate-status.mjs:52-59`: The same invocation prints top-level status=passed unconditionally and exits zero.
- `test` — `/mnt/data/rtlx_audit_logs/25_external_status.log`: CMD-025 reproduced the contradictory successful output.
- `test` — `/mnt/data/rtlx_audit_logs/26_evidence_gates.log`: The authoritative aggregate gate script correctly normalized the same reports to blocked and exited 2.

**Impact**

- CI or a human consuming only npm run evidence:external-status can mistake placeholder creation for external validation success.
- The output conflicts with CURRENT-STATUS.json and the explicit external-evidence policy.

**Reproduction**

- Run CMD-025.
- Inspect the five written dist/evidence reports and compare their not_run values with the printed passed value.

**Required fix**

- Return blocked or insufficient_evidence when any generated report is not_run.
- Use a non-zero blocked exit code consistent with release-evidence-gates.mjs.
- Separate a 'placeholder_files_created' operation result from evidence gate status.

**Required tests/evidence**

- Unit test all combinations: all passed, any failed, any not_run, any insufficient_evidence and missing report.
- CLI exit-code assertions and schema validation for generated status output.

### RTLX-ARTIFACT-001 — Current source build output matches all four supplied browser release ZIPs exactly

- `status`: `test_reproduced`
- `severity`: `info`
- `confidence`: `high`
- `contractImpact`: `none`
- `verificationState`: `verified_by_real_fixture`
- `affectedFiles`: `SOURCE/rtlx-v15.8.0-source/dist/`, `RELEASE-ARTIFACTS/rtlx-chromium-15.8.0.zip`, `RELEASE-ARTIFACTS/rtlx-edge-15.8.0.zip`, `RELEASE-ARTIFACTS/rtlx-firefox-15.8.0.zip`, `RELEASE-ARTIFACTS/rtlx-firefox-android-15.8.0.zip`
- `affectedSymbols`: `scripts/build.mjs`, `scripts/package-release.mjs`

**Evidence trail**

- `test` — `/mnt/data/rtlx_audit_logs/30_artifact_compare.log`: For chromium, edge, firefox and firefox-android, builtFiles=56 and artifactFiles=56 with no onlyBuilt, onlyArtifact or different entries.
- `source` — `scripts/package-release.mjs:1-25`: Packaging sorts paths and assigns the fixed 1980 ZIP timestamp.
- `artifact` — `RELEASE-ARTIFACTS/*.zip`: ZIP CRC checks passed with no unsafe path, encrypted entry or symlink entry.

**Impact**

- The browser ZIP contents are traceable to the provided current source build despite the stale aggregate release manifest.
- This is content equivalence, not real-browser execution certification.

**Reproduction**

- Run CMD-010 then CMD-030.

**Required tests/evidence**

- Keep this comparison as a mandatory clean-source release gate.

### RTLX-RUNTIME-001 — A real Qwen/Edge RTLX 15.8.0 report is schema-valid, hash-valid and quiescent for the captured page

- `status`: `real_fixture_confirmed`
- `severity`: `info`
- `confidence`: `high`
- `contractImpact`: `none`
- `verificationState`: `verified_by_real_fixture`
- `affectedFiles`: `/mnt/data/rtlx-report-chat.qwen.ai-2026-06-19T05-01-26-294Z.json`, `SOURCE/rtlx-v15.8.0-source/schemas/failure-evidence.schema.json`, `SOURCE/rtlx-v15.8.0-source/src/shared/canonical-json.ts`
- `affectedSymbols`: `FailureEvidenceReport`, `reportHash`, `runtimeSnapshot.data.textBlockCoverage`

**Evidence trail**

- `runtime` — `rtlx-report-chat.qwen.ai-2026-06-19T05-01-26-294Z.json`: productVersion, extensionVersion and processorVersion are 15.8.0; browser is Edge 149 on Windows x86-64 with official:qwen profile v3.
- `test` — `/mnt/data/rtlx_audit_logs/28_verify_user_report.log`: Schema 1.2.0 validation passed and recomputed canonical report hash exactly matched sha256:0ab887e93bb34e2771a8468a2707adcb0b8cccc78eedbbe2d8295737e3b58664.
- `runtime` — `runtimeSnapshot.data`: pendingCandidates=0, pendingDiscoveryRoots=0, typographyContinuationsPending=0, textBlocksDiscovered=175, textBlocksProcessed=175 and verificationFailures=0.
- `runtime` — `diagnostics[0]`: RTLX-LIMIT-001 recorded candidateBudgetReached=true and continuationQueued=true; final discovery queues and active cursors were zero.
- `fixture` — `/mnt/data/screencapture-chat-qwen-ai-c-edf7f90e-b698-42d6-bdc7-dea39921ada3-2026-06-19-08_30_53.jpg`: The 289x2048 screenshot visually corroborates a rendered Persian/mixed Qwen conversation, but its resolution is insufficient for pixel-level font, caret or per-block assertions.

**Impact**

- Closes the broad 'no real 15.8.0 Qwen execution evidence' gap for this one captured page/state.
- Does not falsify RTLX-TEXT-BLOCK-003 because this report records 175 text blocks, below the 512-descendant enumeration boundary.
- Does not exercise the dynamic protection-cache transitions in RTLX-CACHE-001.

**Reproduction**

- Validate the JSON against failure-evidence.schema.json and recompute reportHash using canonicalizationVersion 1.0.0.
- Inspect the runtime acceptance counters.

**Required tests/evidence**

- Repeat on a controlled same conversation before/after fixture with selected-element evidence and a region above the enumeration boundary.
- Capture per-block visual assertions for headings, paragraphs, lists, quotes, code and action icons.

## 6. پرسش‌ها و Gateهای دارای insufficient_evidence

### RTLX-EXTERNAL-001 — Exact release-artifact execution is not established across supported browsers

- `status`: `insufficient_evidence`
- `severity`: `medium`؛ `confidence`: `high`
- `missing_evidence`: Run each exact artifact in an unmanaged clean browser profile and Firefox Android device/emulator; retain machine-readable reports, browser versions and artifact SHA-256.
- `affected_conclusion`: Cross-browser API, manifest loading, permission and rollback behavior remain unverified on the exact delivered ZIPs.
- `partial_processing_possible`: `true`
- `test` — `CMD-017..CMD-019, CMD-027`: Chromium was blocked by administrator policy; Edge and Firefox executables were unavailable; Firefox Android had no device/emulator execution.

### RTLX-EXTERNAL-002 — Real Claude composer, IME, keyboard/caret and manual accessibility behavior remains unverified

- `status`: `insufficient_evidence`
- `severity`: `medium`؛ `confidence`: `high`
- `missing_evidence`: Execute a real Claude composer matrix with Persian/English IME, selection, keyboard navigation, screen reader, zoom and forced-colors evidence.
- `affected_conclusion`: Cannot claim real editor preservation, IME safety, caret stability or accessibility certification.
- `partial_processing_possible`: `true`
- `fixture` — `dist/evidence/manual-accessibility.json`: status=not_run; requires keyboard, screen-reader, zoom, forced-colors and focus verification.
- `source` — `profiles/bundled/claude.json`: Editor rules preserve direction, alignment and typography in source, but no real composer fixture was supplied.

### RTLX-EXTERNAL-004 — Signed artifact, store validation, installed-update rollback and staged rollout gates remain unverified

- `status`: `insufficient_evidence`
- `severity`: `medium`؛ `confidence`: `high`
- `missing_evidence`: Supply signed/unsigned artifacts, authenticated store validation results, installed 15.7.3→15.8.x update/rollback evidence and staged rollout rehearsal logs.
- `affected_conclusion`: Store-ready, signed, update-safe or rollout-ready claims are not established.
- `partial_processing_possible`: `true`
- `test` — `CMD-024 and CMD-026`: Signed artifacts were not supplied and aggregate release gates remained blocked.
- `fixture` — `dist/evidence/*.json`: The relevant reports are not_run or insufficient_evidence.

### RTLX-EXTERNAL-005 — The supplied Qwen 15.8.0 capture is not a controlled same-page regression comparison

- `status`: `insufficient_evidence`
- `severity`: `medium`؛ `confidence`: `high`
- `missing_evidence`: Capture the same saved conversation/DOM fixture under both versions with identical viewport, browser settings, selected blocks and pixel/per-block assertions.
- `affected_conclusion`: The evidence supports a current 15.8.0 run, but cannot prove that every historical visual inconsistency was fixed on the identical DOM/conversation.
- `partial_processing_possible`: `true`
- `runtime` — `historical report metadata`: Archive Qwen runtime evidence is 15.7.2/15.7.3, while the user-supplied report is 15.8.0 at a later capture time.
- `runtime` — `current selectedElement`: Current selectedElement.status=no_data with RTLX-FEC-SELECTION-LOCATION-MISMATCH-CLEARED, so no selected-block before/after projection is available.

### RTLX-EXTERNAL-003 — Long-run memory retention and framework node-replacement behavior remains unverified

- `status`: `insufficient_evidence`
- `severity`: `low`؛ `confidence`: `medium`
- `missing_evidence`: Run multi-tab framework replacement and detach/reinsert campaigns with heap snapshots, journal-size trends, ownership counters and rollback assertions.
- `affected_conclusion`: No evidence establishes a leak, but the requested React/Vue replacement and long-run retention claim cannot be certified from unit tests alone.
- `partial_processing_possible`: `true`
- `source` — `src/content/mutation-journal.ts:13-42`: Committed journal entries intentionally retain strong Node references until rollback/removal.
- `fixture` — `dist/evidence/eight-hour-soak.json`: status=not_run; no eight-hour real-browser memory profile is present.

## 7. False positiveها و فرضیه‌های ردشده

- `not_reproduced` — **Historical RTLX 15.7.3 Qwen/DeepSeek evidence proves RTLX 15.8.0 runtime behavior**: Version metadata explicitly differs; historical files were used only as symptom/regression context.
- `not_reproduced` — **Candidate-discovery budget limit loses work**: CandidateDiscoveryCursor exposes hasMore and the real 15.8.0 report recorded RTLX-LIMIT-001 with continuationQueued=true, activeCursors=0 and drained queues.
- `not_reproduced` — **Bounded typography slicing starves after the first slice**: The repository 121-node continuation test passed and the real report had typographyContinuationsPending=0. The confirmed cache defect is dependency invalidation, not slice starvation.
- `not_reproduced` — **Protective profile precedence follows JSON order**: profile-zone.ts applies category rank before profile order; validate:profiles and precedence tests passed.
- `not_reproduced` — **RTLX globally mutates html/body direction**: FrameRuntime rejects HTML/BODY candidates; no source mutation path setting global document direction was found; security and smoke checks passed.
- `not_reproduced` — **Wrapper proliferation is present in the supplied Qwen capture**: ownedWrappers=0 and wrapperLifecycle.current=0 in the valid 15.8.0 report.
- `not_reproduced` — **selected-element evidence reused a stale element after location change**: The current report cleared the mismatch and emitted RTLX-SELECTION-101 plus reason RTLX-FEC-SELECTION-LOCATION-MISMATCH-CLEARED.
- `not_reproduced` — **CSS Custom Highlight absence is a release defect**: architecture-v15.8.md explicitly marks it deferred and optional.
- `not_reproduced` — **typographyScansCompleted must equal unique text blocks**: The active architecture describes a completion counter, not a unique-object counter; unique text-block counts are separately exposed.

## 8. مرور مرزهای معماری

- مرزهای frozen حفظ شدند و در Audit Mode هیچ source، schema، registry، profile، version یا release artifact تغییر نکرد.
- permission model، privacy model، no-global-direction، direction/typography separation، hybrid ownership، journaled rollback و bounded scheduling در سورس موجودند.
- استثناهای اثبات‌شده نسبت به ادعای رفتاری، `RTLX-TEXT-BLOCK-003` و `RTLX-CACHE-001` هستند؛ این‌ها پیشنهاد معماری جدید نیستند، بلکه نقض مسیر فعلی قراردادند.

## 9. امنیت، Privacy و Permission

- Manifestها: `activeTab`, `alarms`, `scripting`, `storage` و `optional_host_permissions` برای HTTP/HTTPS؛ mandatory `host_permissions` وجود ندارد.
- Failure Evidence schema `1.2.0` برای page text، full URL، query، fragment، form values، cookies، localStorage، network، screenshot و automatic upload مقدار `false` را الزام می‌کند. گزارش واقعی کاربر این قیود را پاس کرد.
- `npm run audit:production`: صفر آسیب‌پذیری production. `RTLX-DEPENDENCY-001`: یک آسیب‌پذیری high در زنجیره dev-only ثبت شد.
- security scan و warning baseline پاس شدند؛ ۶۳ warning همگی در registry بازبینی‌شده‌اند.

## 10. مرور سازگاری مرورگر

- Chromium/Edge از MV3 service worker و Firefox/Firefox Android از background scripts استفاده می‌کنند؛ manifest validation و web-ext lint پاس شد.
- API adapter shape برای callback و Promise پاس شد، اما خود script تصریح می‌کند که real-browser behavior را اثبات نمی‌کند.
- Exact source-to-ZIP content برای هر چهار مرورگر تأیید شد؛ اجرای exact ZIPها هنوز مطابق `RTLX-EXTERNAL-001` ناقص است.

## 11. Mutation، Scheduler، Ownership و Rollback

- Candidate discovery دارای cursor/continuation است و limit در گزارش واقعی به‌درستی diagnostic شده و drain شده است.
- Typography slice continuation روی fixture با ۱۲۱ Text node و browser smoke پاس شد.
- Mutation journal و ownership فعال‌اند؛ smoke rollback، حذف owned mutationها و wrapper count صفر را نشان داد.
- Text-block enumeration برخلاف candidate discovery cursor ندارد؛ این شکاف finding `RTLX-TEXT-BLOCK-003` است.
- Long-run retention/React-Vue replacement مطابق `RTLX-EXTERNAL-003` هنوز fixture واقعی ندارد.

## 12. Direction، BiDi Isolation و Typography

- Direction target و alignment target در implementation و inspection جدا هستند؛ inline target اجازه block alignment ندارد و CSS از `text-align:start!important` استفاده می‌کند.
- no global `html/body dir` path پیدا نشد و smoke rollback پاس شد.
- Qwen 15.8.0: `rtlElements=73`, `ltrElements=32`, `autoElements=30`, `ownedWrappers=0`, `verificationFailures=0`. این aggregate evidence است، نه اثبات pixel-level برای تک‌تک blockها.
- Typography cache dynamic-state defect در `RTLX-CACHE-001` باید پیش از release بعدی رفع شود.

## 13. Profile، Registry و Schema

- ۱۱ schema، ۱۲ bundled profile، certification index و malformed fixtures پاس شدند.
- `site-profile.schema.json`، `signed-profile-envelope.schema.json` و `profile-export.schema.json` روی نسخه `3.0.0` هستند؛ failure evidence `1.2.0` و runtime snapshot در report واقعی `1.6.0` است.
- ترتیب protective category در `profile-zone.ts` مستقل از JSON order اعمال می‌شود. Editor rules در profileهای bundled حالت preserve دارند.
- هیچ schema change برای رفع findings ضروری تشخیص داده نشد؛ اگر enumeration pending به payload عمومی افزوده شود، schema باید versioned شود، ولی رفع compatible بدون فیلد عمومی جدید ممکن است.

## 14. Diagnostics و Failure Evidence

- گزارش واقعی user-supplied schema/hash معتبر است و provenance matched دارد.
- `RTLX-LIMIT-001` continuation را ثبت کرده است؛ selected element mismatch با `RTLX-SELECTION-101` پاک شده و stale value ارائه نشده است.
- `RTLX-EVIDENCE-001` یک false-success در command سطح external-status است؛ aggregate `release-evidence-gates.mjs` درست blocked می‌شود.
- Historical 15.7.2/15.7.3 evidence فقط برای symptom context استفاده شد و به 15.8.0 تعمیم داده نشد.

## 15. Performance و Build دترمینیستیک

- `test:coverage`: ۲۴۹ تست در ۹۰ فایل پاس شد و thresholdها پاس شدند.
- Browser smoke و real report هر دو queue drain و zero typography verification failures را نشان می‌دهند.
- package scripts مسیرها را sort و ZIP mtime را روی 1980 ثابت می‌کنند؛ current build با release ZIPها exact match است.
- `RTLX-RELEASE-001` نشان می‌دهد deterministic browser ZIP کافی نیست: assembly manifest نهایی stale است و release-level integrity gate باید اصلاح شود.

## 16. توصیه Release و Scope نسخه بعدی

نسخه پیشنهادی: **`15.8.1`**، چون یافته‌ها bug fix و contract-compatible هستند و تغییر breaking تأیید نشده است.

Required scope:

- `RTLX-TEXT-BLOCK-003`
- `RTLX-CACHE-001`
- `RTLX-RELEASE-001`
- `RTLX-EVIDENCE-001`
- `RTLX-DEPENDENCY-001`

خارج از scope:

- new browser permissions
- telemetry or automatic upload
- global html/body direction
- profile-owned final direction truth
- CSS Custom Highlight implementation
- unrelated refactoring

Gateهای لازم:

- All current deterministic checks
- New boundary tests for >512 text blocks and typography protection transitions
- Clean regenerated top-level and nested SHA-256 manifests
- Zero high/critical npm audit findings or an explicitly approved exception
- Exact Chromium/Edge/Firefox/Firefox Android execution where environments are available
- Controlled Qwen regression fixture and real Claude composer evidence before claims broader than the fixed code paths

## 17. Machine-readable Finding Index

| ID                    | Status                   | Severity | Confidence |
| --------------------- | ------------------------ | -------- | ---------- |
| `RTLX-CACHE-001`      | `test_reproduced`        | `high`   | `high`     |
| `RTLX-RELEASE-001`    | `test_reproduced`        | `high`   | `high`     |
| `RTLX-TEXT-BLOCK-003` | `test_reproduced`        | `high`   | `high`     |
| `RTLX-DEPENDENCY-001` | `test_reproduced`        | `medium` | `high`     |
| `RTLX-EVIDENCE-001`   | `test_reproduced`        | `medium` | `high`     |
| `RTLX-EXTERNAL-001`   | `insufficient_evidence`  | `medium` | `high`     |
| `RTLX-EXTERNAL-002`   | `insufficient_evidence`  | `medium` | `high`     |
| `RTLX-EXTERNAL-004`   | `insufficient_evidence`  | `medium` | `high`     |
| `RTLX-EXTERNAL-005`   | `insufficient_evidence`  | `medium` | `high`     |
| `RTLX-EXTERNAL-003`   | `insufficient_evidence`  | `low`    | `medium`   |
| `RTLX-ARTIFACT-001`   | `test_reproduced`        | `info`   | `high`     |
| `RTLX-RUNTIME-001`    | `real_fixture_confirmed` | `info`   | `high`     |

فایل JSON همراه، تمام findingها را دقیقاً با fieldهای الزامی `HANDOFF/AUDIT-REPORT-CONTRACT.md` نگه می‌دارد.
