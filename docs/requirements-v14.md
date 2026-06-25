# RTLX v14 Requirement Traceability

Statuses refer to repository evidence and executed automated checks. They do not replace inherited acceptance Gates A–I.

| ID                 | Requirement                                                             | Status                   | Evidence                                                                  |
| ------------------ | ----------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------- |
| `V14-LANG-001`     | Product behavior targets Persian RTL and English LTR only.              | implemented              | `language-classifier.ts`, `input-direction.ts`, Persian/Arabic/Urdu tests |
| `V14-FONT-001`     | Bundle Vazirmatn for Persian and Inter for Latin.                       | implemented              | font manifest, generated CSS, integrity script                            |
| `V14-FONT-002`     | Amazon Ember may be local-only unless redistribution evidence exists.   | implemented              | `typography-planner.ts`, font policy tests; no Amazon asset               |
| `V14-UI-001`       | Persistent control panel on Chromium, Edge, and Firefox.                | implemented              | manifests, sidepanel UI, target-specific build                            |
| `V14-PROFILE-001`  | Per-selector deterministic rules with bounded delay.                    | implemented              | Profile Schema v3, profile validator, side panel                          |
| `V14-PICKER-001`   | Generate and preview safe selector candidates without manual CSS.       | implemented              | selector generator, picker controller, tests                              |
| `V14-SCOPE-001`    | Per-conversation/workspace settings without full URL persistence.       | implemented              | scoped settings repository and SHA-256 tests                              |
| `V14-INPUT-001`    | Opt-in Persian/English input direction assistant.                       | implemented              | input direction module, runtime integration, fixture                      |
| `V14-LIST-001`     | Logical list marker/indentation repair.                                 | implemented              | typography planner and nested-list fixture                                |
| `V14-OVERRIDE-001` | Temporary context-menu overrides are journaled and non-persistent.      | implemented              | background menu, content command, frame runtime                           |
| `V14-CATALOG-001`  | Offline official catalog remains available.                             | implemented              | bundled profiles and site detector                                        |
| `V14-CATALOG-002`  | Community import accepts only signed verified profiles.                 | implemented_fail_closed  | verifier, community repository, empty key registry                        |
| `V14-FIXTURE-001`  | Add controlled platform-specific fixture pack.                          | implemented_fixture_only | fixtures 26–33; browser execution remains not run                         |
| `V14-EDGE-001`     | Produce a dedicated Microsoft Edge package.                             | implemented              | build, manifest validation, release packager                              |
| `V14-A11Y-001`     | New UI and editable behavior pass manual accessibility matrix.          | insufficient_evidence    | manual NVDA/zoom/forced-colors not run                                    |
| `V14-PERF-001`     | New behavior passes pinned performance and memory budgets.              | insufficient_evidence    | required benchmark not run                                                |
| `V14-LIVE-001`     | Official profile selectors are validated against current live services. | insufficient_evidence    | profiles remain marked by actual fixture status                           |
| `V14-STORE-001`    | Chrome, Edge, and AMO signed/store-reviewed packages exist.             | not_implemented          | local deterministic ZIPs only                                             |
