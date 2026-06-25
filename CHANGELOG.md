# 15.9.9

- Kept popup debug reports available for request/response contract violations, including `RTLX-MESSAGE-005`.
- Added deterministic popup coverage for status, report enablement, download, schema `2.1.0`, and provenance.
- Added stable producer/handler/message provenance to diagnostic issues and reports without changing healthy response envelopes.
- Added deterministic canonical JSON cycle and depth failures (`RTLX-CANONICAL-001` and `RTLX-CANONICAL-002`) with no sentinel sanitization.
- Added request-side canonical/size/envelope validation using the original request ID.
- Added a CI guard against Chrome structured-clone manifest opt-in without dedicated tests.
- Bounded exact-artifact CDP/process execution and stored failed-stage JSON evidence.
- Corrected the Chromium content smoke fixture to use a real local HTTP origin.
- Preserved profiles, selectors, permissions, storage schema, lifecycle production code, direction, typography, and streaming behavior.

# 15.9.6

- Fixed Persian and mixed nested-list markers remaining on the left when text direction was applied only to an inner paragraph.
- Added separate nearest-`li` marker ownership without changing text-block enumeration.
- Preserved explicit host list direction and list-repair opt-out behavior.
- Added deterministic list-marker tests and controlled Chromium `::marker` direction assertions.

# 15.9.5

- Added required re-admission for discovered text blocks that remain unprocessed after generic candidate processing.
- Added bounded recovery of connected unprocessed text blocks during capture stabilization.
- Upgraded Runtime Snapshot to `1.10.0` with `textBlocksProcessingPending`; incomplete block processing can no longer certify as ready.
- Added background-epoch rebind for live content runtimes before fallback injection.
- Rebuilt the background document registry through the existing context handshake without replacing the content runtime.
- Preserved selected-element evidence across content-runtime replacement when the physical browser document ID and generation remain unchanged.
- Removed unconditional `APPLY_CURRENT_TAB` from report creation while retaining explicit apply and missing-runtime injection behavior.
- Added focused regression tests for rebind-without-injection, physical-document identity, readiness coverage, and report runtime ensuring.

# 15.9.4

- Derived popup language and writing direction from the browser UI locale instead of forcing RTL for English strings.
- Coalesced repeated candidate-queue saturation observations into one bounded pressure episode.
- Narrowed mutation intake so inserted child subtrees no longer promote the containing response subtree into discovery.
- Restricted full text-block enumeration invalidation to structural and protection-boundary changes.
- Added cross-cursor candidate admission deduplication while explicitly re-admitting mutation-dirty and continuation work.
- Updated the controlled Chromium smoke assertion for direct text-node reprocessing.
- Added focused behavioral tests for locale direction, saturation episodes, and mutation intake.

# 15.9.3

- Added an authoritative post-capture gate in the background failure-evidence exporter.
- Blocked report generation when the final runtime snapshot reports `document_hidden` or `runtime_inactive`.
- Added a typed `RTLX-CAPTURE-VISIBLE-TAB-REQUIRED` result for the popup/background contract.
- Prevented Blob creation and anchor download when the final export result is blocked.
- Preserved ready exports and non-visibility partial-report behavior.
- Replaced the source-string regression assertion with executable final-snapshot and popup-routing tests.

# 15.9.2

- Fixed confident Persian/mixed blocks falling through under an inherited `dir="auto"` while preserving explicit local `dir="auto"`.
- Removed the false `owned == already-correct` diagnostic shortcut.
- Added deterministic recovery for connected orphaned text-block continuations and cancellation accounting for abandoned discoveries.
- Registered fallback semantic regions before processing to prevent `processed > discovered` coverage states.
- Added required/optional/alternative-group profile-health semantics and updated the ChatGPT profile metadata without changing its selectors.
- Preserved selected-element evidence across route changes inside the same configured SPA scope.
- Prevented hidden or inactive tabs from exporting a known blocked report through the popup.
- Added focused regression tests for all confirmed repairs.

# 15.9.1

- Added deterministic startup reconciliation for pre-existing RTLX classes, wrappers, styles, runtime markers, and explicitly owned direction attributes.
- Added a document-scoped runtime lease so superseded 15.9.1 runtimes stop mutating the page.
- Added per-direction ownership markers and preserved ambiguous unowned legacy `dir` attributes.
- Pruned disconnected text-block and typography continuation state before readiness evaluation.
- Added bounded capture stabilization and Runtime Snapshot 1.9.0 evidence.
- Extended the Chromium smoke fixture to reproduce and verify stale-runtime takeover.
- Left site profiles and classifier thresholds unchanged pending qualifying real-site evidence.

# 15.9.0

- Added streaming-root duplicate and ancestor/descendant coalescing.
- Added flush-on-capacity with root restoration on flush failure.
- Limited degradation escalation to one new failure per active overflow episode.
- Added condition-based recovery after verified runtime quiescence while preserving the timer fallback.
- Added Runtime Snapshot 1.8.0 capture-readiness, degradation, streaming, build-input-hash, and profile-hash evidence.
- Added deterministic streaming-resilience, readiness, recovery, and provenance tests.
- Deliberately left bundled site selectors unchanged pending controlled real-DOM evidence.

# 15.8.1

- Fixed resumable text-block enumeration beyond the 512-descendant boundary.
- Fixed protection-aware typography fingerprint invalidation and journal-safe class reconciliation.
- Added deterministic final artifact manifests and mutation-sensitive integrity verification.
- Corrected external evidence aggregation so `not_run` gates are blocked, never passed.
- Updated the development transitive `undici` dependency to 7.28.0 and enforced high-severity audits.

# 15.8.0

- Added deterministic Text Block Enumeration between semantic-region resolution and direction targeting.
- Structured answers now process headings, paragraphs, list items, quotes, definitions, captions, and table cells independently.
- Separated inline direction isolation from block alignment and replaced physical right/left alignment with logical `text-align: start`.
- Added bounded typography continuation beyond the first 50 Text nodes using per-node fingerprints and requeued block work.
- Added Runtime Snapshot 1.6.0 coverage, continuation, unique layout-target, and redirect-reason evidence.
- Added Element Inspection 3.2.0 with separate semantic-region, text-block, direction-target, alignment-target, and typography-coverage sections.
- Added deterministic profile category precedence and changed bundled conversational editor rules to preserve native editor direction and typography.
- Retained the 15.7.3 layout/icon safety, permission, privacy, ownership, journal, and rollback boundaries.

# 15.7.3

- Added layout-safe direction-target resolution so semantic flex/grid containers no longer receive RTL when they contain icons, controls, layout roles, or clipping.
- Separated semantic block, direction target, and typography target.
- Added SVG, role-img, pseudo-element, icon-font, and Private Use Area protection.
- Added Runtime Snapshot 1.5.0 layout-safety counters and richer selected-element evidence.
- Added deterministic flex/grid icon-regression fixtures and Chromium smoke assertions.
- Failure snapshot export now flushes bounded pending diagnostics.

# 15.7.2

- Replaced the broad Qwen and DeepSeek v1 profiles with protective-only v2 profiles; no unverified semantic selectors were invented.
- Removed profile-level blanket preservation for all links, buttons, labels, and summaries on Qwen and DeepSeek while retaining global protection for complex interactive controls.
- Lifted nested text descendants to a safe text-only interactive owner so simple links and buttons can receive direction and typography repair.
- Allowed natural-language inline code to follow its semantic block while block code and technical inline code remain protected.
- Advanced RuntimeSnapshot to 1.4.0 with explicit metric scopes and text-decision cache hit/miss/store counters.
- Added unambiguous aliases to rule-effectiveness fields while preserving the prior fields for compatibility.
- Advanced ProfileHealth to 1.1.0 and separated semantic rules from protective rules; missing optional safety zones no longer make a protective-only profile degraded.
- Advanced Failure Evidence Report to 1.2.0 with separate capture conclusion and analysis status.
- Cleared stale selected-element evidence into `no_data` instead of carrying `stale_document` state into later reports.
- Added deterministic diagnostics for degraded profiles and cleared stale selections.
- Generated the report expectation from effective font settings instead of the retired `RTLX Mixed Text` template.
- Added no permissions, telemetry, remote code, page-text capture, Amazon font binaries, or new profile claims.

# 15.7.0

- Changed the fresh Persian font default to local Vazirmatn/Vazir first with bundled Vazirmatn fallback.
- Kept local Amazon Ember Display/Amazon Ember first with bundled Inter fallback and no Amazon font redistribution.
- Added deterministic semantic-block resolution: text supplies evidence, while direction is applied to a bounded existing block.
- Added stable direction action/reason codes and kept document language as context rather than per-block truth.
- Split block code, technical inline code, and natural inline Persian code; only block/technical code is forced LTR.
- Allowed safe text-only links and buttons to receive direction and typography repair while complex controls remain protected.
- Added bounded aggregate classification, direction, non-modification, rule-effectiveness, wrapper-lifecycle, and font diagnostics.
- Added a report-only “mark an unfixed area” flow that saves no site rule and does not repair the selected element.
- Preserved no-new-permission, no-telemetry, no-upload, no-page-text, no-HTML, wrapper-minimal, ownership-checked rollback boundaries.

# 15.6.0

- Reframed RTLX as a focused personal RTL rescue extension.
- Removed options, side panel, element picker, context-menu authoring, and developer dashboards from release builds.
- Added one Persian-first popup for site activation, smart repair, font choice, problem report, and legacy-site reset.
- Added semantic Persian RTL/right and English LTR/left alignment.
- Added bundled-Vazirmatn/local-first Persian selection.
- Added local Amazon Ember Display/Amazon Ember selection with bundled Inter fallback; no Amazon font binaries are distributed.
- Focused runtime now ignores legacy user/community profiles while allowing explicit deletion from the popup.
- Added settings schema 2.1.0 and focused manifest validation.

# Changelog

## [15.5.4] - 2026-06-16

### Page activation switch and permission preflight

- Added a visible Persian per-page activation switch to the popup.
- Enabling the switch requests optional host permission for the current site from the user gesture, saves an enabled mode, and applies the current tab.
- Disabling the switch saves `siteMode: disabled` and rolls back owned mutations.
- The current-page debug report now attempts current-site permission preflight before applying and exporting evidence.
- Preserved the privacy and permission boundary: no new manifest permission, no telemetry, no automatic upload, and no page text/DOM/HTML/form/cookie/storage/network/console/screenshot capture.

### Verification status

- TypeScript typecheck passed.
- 75 test files and 204 tests passed.
- Format check, schema/profile validation, targeted ESLint for changed files, build, manifest validation, security scan, production dependency audit, Chromium runtime smoke, and package release passed.
- Full `npm run lint` and `npm run lint:warnings` timed out in this generated checkout and remain `insufficient_evidence` rather than PASS.

## [15.5.2] - 2026-06-16

### Persian UI, typography, and auto-safe RTL hardening

- Changed fresh-install default site mode from `ask` to `auto-safe` so supported pages can be corrected without an extra confirmation step.
- Corrected high-confidence Persian candidates that inherit LTR direction by applying `dir="rtl"` only to the candidate container; automatic processing still never mutates `html` or `body`.
- Added a local Persian font face that tries installed Windows fonts such as Vazirmatn, Vazir, IRANSans, Segoe UI and Tahoma through CSS `local()` before falling back to bundled Vazirmatn.
- Rebuilt the popup as a Persian-first, minimal workflow with primary quick actions, grouped safety controls, and advanced tools collapsed by default.
- Rebuilt the options page with Persian quick-start guidance, default site-mode control, typography controls, local-font disclosure, and clearer privacy/accessibility sections.
- Preserved the permission boundary: no `local-fonts` permission, no system font enumeration, and no reading of installed font files.

### Verification status

- 73 test files and 198 tests pass.
- Coverage: statements 85.43%, branches 75.15%, functions 90.20%, lines 87.05%.
- Format, typecheck, ESLint warning governance, schema/profile validation, targeted UI/typography/direction tests, build, Chromium runtime smoke, manifest validation, Firefox lint, security scan, production dependency audit, store-readiness, personal verifier, two-run deterministic packaging, and clean source rebuild pass.
- Manual Windows validation remains `insufficient_evidence` until the supplied unpacked build is loaded on the user's machine.

## [15.5.1] - 2026-06-16

### Failure Evidence Capture hardening

- Fixed `WOLF-001` by binding saved selected-element evidence to the exact content document identity and discarding stale or legacy selections before report assembly.
- Fixed `WOLF-002` by collecting runtime and fixture evidence through a single capture transaction with one `captureId` and one content-script round trip.
- Fixed `WOLF-003` by preserving tab delivery states for discarded, loading, frozen, unreachable, missing-tab, invalid-response, and timeout conditions.
- Fixed `WOLF-004` by replacing ambiguous nullable report sections with status/reason/data envelopes.
- Fixed `WOLF-005` by redacting sensitive selector tokens from Failure Evidence reports while leaving normal picker behavior unchanged.
- Fixed `WOLF-006` by adding capture provenance, canonicalization version, SHA-256 report hashing, and per-section provenance metadata.
- Fixed `WOLF-007` by adding deterministic per-section and whole-report size limits with schema-level validation.

### Verification status

- 72 test files and 193 tests pass, including 4 new targeted FEC/lifecycle tests.
- Format, typecheck, ESLint warning governance, schemas, profiles, coverage, adapter conformance, build, direct Chromium runtime smoke, manifest validation, Firefox lint, security scan, production dependency audit, store-readiness, personal verifier, and two-run deterministic packaging pass.
- Exact release-artifact browser execution remains `insufficient_evidence` for Chromium due administrator policy and for Edge/Firefox/Firefox Android due unavailable executables/devices.

## [15.5.0] - 2026-06-15

### Failure evidence capture

- Added user-initiated, previewable, canonical JSON failure reports.
- Added optional text-free selected-element evidence and deterministic eligibility/conclusion codes.
- Added profile, runtime, performance, fixture, diagnostics, Safe Mode, and update-state evidence aggregation.
- Added strict privacy locks: no page text, full URL, query, fragment, form values, cookies, site storage, network capture, screenshot, or automatic upload.
- Added restricted-page reporting without bypassing browser security boundaries.

### Verification status

- Automated checks and deterministic packaging are recorded in the 15.5.0 implementation report.
- Real-site effectiveness remains evidence-dependent; reports support diagnosis but do not automatically repair sites.

## [15.4.1] - 2026-06-15

### Personal installation hardening

- Added a frozen Chromium/Edge public manifest key and deterministic extension ID.
- Added complete checksummed personal backup/restore with dry-run and fail-closed restore policy.
- Added atomic local update scripts, local health/recovery controls, and build-time critical-file integrity manifests.
- Added personal build, test, package, and install commands without changing runtime product scope.

### Verification status

- 71 test files and 184 tests pass before final release-gate execution.
- Store publication remains outside the personal-use scope; real long-duration usage remains observational evidence.

## [15.4.0] - 2026-06-15

### Certification and distribution

- Added exact release-ZIP E2E orchestration for Chromium, Edge, and Firefox Desktop.
- Added SHA-256 release/evidence attestation and independent artifact/evidence verification.
- Added signed/store-repacked artifact comparison with executable-content integrity checks.
- Added reviewed ESLint warning baseline enforcement and API adapter conformance evidence.
- Added protected manual release-candidate, browser-evidence, and store-staging workflows.
- Added explicit external gate records for installed update/rollback, eight-hour soak, accessibility, store validation, and staged rollout rehearsal.

### Verification status

- 70 test files and 180 tests pass; coverage, four builds, direct Chromium runtime smoke, manifests, Firefox lint, security scans, dependency audits, store-readiness, and two-run deterministic packaging pass.
- Exact-artifact Chromium execution is blocked by administrator policy; Edge and Firefox executables, Firefox Android device, real crash/update/soak/performance/policy/accessibility/store campaigns, and signed artifact verification remain insufficient or not run.
- Production readiness remains false until the applicable external certification gates pass.

## [15.3.0] - 2026-06-15

### Reliability

- Added persistent update quiescence, fail-closed startup, and recovery across extension updates.
- Added persistent Safe Mode, synchronized-storage rate/conflict control, runtime-context census, and permission-denial cooldown.
- Added a dedicated Firefox Android package without desktop-only APIs.
- Added machine-readable performance, enterprise-policy, Android-device, and release-gate evidence harnesses.

### Verification status

- 69 test files and 176 tests pass; four targets build and package reproducibly.
- Real manifest-loaded browsers, Firefox Android device execution, crash/soak/performance/policy campaigns, manual accessibility, signing, and store review remain blocked or not run.

## [15.2.0] - 2026-06-15

### Reliability

- Added restart-durable checksummed storage journaling and deterministic quota enforcement.
- Serialized background initialization and dynamic content-script reconciliation.
- Added document/runtime identity, discarded-tab recovery, bounded broadcasts, canonical messages, alarm leases, and structured circuit state.
- Added cross-browser, crash-recovery, and bounded soak evidence harnesses.

## [15.1.0] - 2026-06-15

### Added

- Browser lifecycle coordinator, adaptive backpressure, graceful degradation, exact mutation suppression, shared delays, diagnostic batching, IME coalescing, and transaction recovery.
- Required BH-001 through BH-012 deterministic unit/stress coverage.
- Environment-aware manifest-loaded Chromium/Edge/Firefox E2E harness.

### Changed

- Runtime snapshot schema advances to 1.1.0 with text-free lifecycle and bounded-resource evidence.
- Performance samples, Intersection targets, delayed candidates/timers, diagnostic queues, and owned signatures are registry-bounded.
- Canonical Vitest execution uses a deterministic single fork for reliable stress-suite teardown.

### Verification status

- 53 test files and 138 assertions pass; all three builds, manifest validation, Firefox lint, security scan, production audit, direct Chromium runtime smoke, and two-run deterministic packaging pass.
- Manifest-loaded Chromium is blocked by administrator policy; Edge/Firefox executables, BH-013 real benchmarks, manual accessibility, signing, and store review remain insufficient or not run.

## [15.0.0] - 2026-06-14

### Added

- Profile Health Engine with bounded deterministic per-rule states.
- Streaming Stability Controller with quiet-window and maximum-wait coalescing.
- Text-free runtime health, performance, queue, root, wrapper, and journal snapshots.
- Rule Conflict Inspector for accepted and suppressed profile matches.
- Last Known Good Profile history with canonical SHA-256 snapshots and restore-as-new-version semantics.
- Structural fixture recorder with `textIncluded: false`.
- Explicit certification metadata for all twelve bundled profiles.
- Real Chromium content-runtime smoke over the final built bundle.
- Hardening fixtures 34–36 and regression tests for document stylesheet placement.

### Fixed

- Inject owned typography styles into `Document.head` instead of directly into `Document`; the invalid path raised `HierarchyRequestError` in real Chromium and prevented later typography/BiDi operations.

### Preserved

- All v14 Persian/English behavior, browser boundaries, profile schema, permissions, privacy locks, picker/rule controls, input assistant, profile library, signing boundary, journal, and rollback contracts.

### Verification status

- Automated static, test, build, profile, security, Firefox lint, production audit, and Chromium content-runtime smoke evidence is recorded in `IMPLEMENTATION_REPORT.md`.
- Full cross-browser extension E2E, live-site profile certification, manual accessibility, pinned performance/memory, signing, and store review remain release blockers.

## [14.0.0] - 2026-06-14

### Added

- Persistent Chrome/Edge Side Panel and Firefox sidebar control panel.
- Profile Schema v3 with deterministic per-selector rules.
- Smart Picker selector-candidate preview without manual CSS entry.
- Privacy-preserving conversation/workspace settings scope.
- Opt-in Persian/English Input Direction Assistant.
- Safe logical list-marker and nested indentation repair.
- Temporary right-click overrides for Content, LTR, and Ignore.
- Signed community-profile import and offline catalog integration.
- Microsoft Edge build and release package.
- Controlled fixtures for bilingual editing, nested lists, Claude artifacts/editing, Gemini Canvas, about:blank streaming, side-panel rules, local Amazon fallback, and conversation scope.

### Changed

- Product scope is explicitly Persian and English only.
- Vazirmatn remains the bundled Persian font; Inter remains the bundled Latin default.
- Amazon Ember Display is supported only through local font discovery, never bundling or network download.
- Firefox uses a dedicated bundle with `sidebar_action` and required `menus` permission; Chromium/Edge retain user-granted optional `contextMenus`.
- Profile and signed-envelope contracts advance to schema 3.0.0; settings contract advances to 2.0.0.

### Security and privacy

- Community profiles activate only after strict JSON, schema, provenance, selector, anti-rollback, RFC 8785, and ECDSA P-256 verification.
- Conversation settings persist only a local SHA-256 scope key derived from approved pathname segments; full URLs, queries, and fragments are excluded.
- Temporary overrides remain journaled, owned, session-only, and rollback-safe.

### Verification status

- Automated development checks pass as documented in `IMPLEMENTATION_REPORT.md`.
- Production readiness remains blocked pending inherited manual, real-browser, performance, signing, and store gates.

## [13.0.0] - 2026-06-14

### Added

- Smart Element Picker, Profile Builder, diagnostics panel, Profile Inspector, offline twelve-product profile library including Qwen, site detection, per-site toggle, and configurable keyboard command.
- Integrated FailureManager and IntersectionObserver admission pipeline.

### Fixed

- LOCK-007 diagnostic redaction, LOCK-008 rollback ownership, message authorization, profile verification ordering, wrapper limits, typography protection, and lifecycle integration.

## [12.0.0] - 2026-06-14

### Added

- Initial implementation baseline for RTLX-SSOT 12.0.0.
