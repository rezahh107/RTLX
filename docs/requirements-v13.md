# RTLX v14 Requirement Traceability

This document is the approved v14 delta. RTLX-SSOT 12.0.0 remains authoritative for unchanged locks and behavior.

| ID              | Requirement                                       | Implementation evidence                                    | Verification state                                                    |
| --------------- | ------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| V13-P0-001      | LOCK-007 diagnostic redaction                     | `shared/diagnostics.ts`, `background/diagnostics-store.ts` | verified_by_unit_test                                                 |
| V13-P0-002      | LOCK-008 owned journal-safe rollback              | mutation applier/journal/rollback/runtime                  | verified_by_unit_test                                                 |
| V13-P0-003      | Message authorization by sender context           | `background/index.ts`, `shared/messages.ts`                | verified_by_unit_test for schemas; browser authorization E2E not_run  |
| V13-P0-004      | Full profile verification order                   | `background/profile-verifier.ts`                           | verified_by_unit_test                                                 |
| V13-P0-005      | Token and document wrapper limits                 | mutation planner/runtime/FailureManager                    | verified_by_unit_test at planner level; browser large fixture not_run |
| V13-P0-006      | Persian-only typography and protected descendants | profile zone/typography planner/font scripts               | verified_by_unit_test partially; visual fixture not_run               |
| V13-P0-007      | FailureManager runtime integration                | `content/frame-runtime.ts`                                 | verified_by_unit_test for manager; browser integration not_run        |
| V13-P0-008      | IntersectionObserver admission pipeline           | visibility registry/frame runtime                          | verified_by_unit_test                                                 |
| V13-P0-009      | Firefox release compatibility                     | manifest generator/validator                               | build and web-ext lint required                                       |
| V13-PICKER-001  | Six picker categories                             | picker controller/types/UI                                 | verified_by_unit_test for schemas                                     |
| V13-PICKER-002  | No manual selector entry                          | popup/options contain no selector text field               | verified_by_static_inspection                                         |
| V13-PICKER-003  | Stable deterministic selector generation          | selector generator                                         | verified_by_unit_test                                                 |
| V13-PROFILE-001 | Profile v2 builder                                | profile builder/schema                                     | verified_by_unit_test                                                 |
| V13-PROFILE-002 | Canonical export/import                           | profile builder/repository                                 | verified_by_unit_test                                                 |
| V13-PROFILE-003 | Explicit signing command                          | `scripts/sign-profile.mjs`                                 | implemented; production-key execution not_run                         |
| V13-DIAG-001    | Selected-element diagnostics                      | picker controller/frame inspection                         | implemented; browser E2E not_run                                      |
| V13-INSPECT-001 | Active profile inspector                          | popup/background context                                   | implemented; browser E2E not_run                                      |
| V13-LIB-001     | Twelve-product offline library including Qwen     | `profiles/bundled/`, site detector                         | schema validation and unit test                                       |
| V13-SITE-001    | Offline AI/product detection                      | site detector                                              | verified_by_unit_test                                                 |
| V13-SITE-002    | One-click per-site disable                        | background command/popup                                   | implemented; browser E2E not_run                                      |
| V13-CMD-001     | Configurable keyboard command                     | manifest/background/UI                                     | manifest validation required                                          |
