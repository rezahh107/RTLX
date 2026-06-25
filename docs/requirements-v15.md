# RTLX v15 Requirement Traceability

Statuses refer only to repository evidence and executed automated checks. They do not replace inherited SSOT Gates A–I.

| ID                 | Requirement                                                                          | Status                | Evidence                                                 |
| ------------------ | ------------------------------------------------------------------------------------ | --------------------- | -------------------------------------------------------- |
| `V15-SCOPE-001`    | Preserve v14 Persian/English scope and all SSOT locks.                               | implemented           | classifiers, settings, manifests, inherited tests        |
| `V15-HEALTH-001`   | Report bounded deterministic health for every active profile rule.                   | implemented           | `profile-health.ts`, registry, tests                     |
| `V15-HEALTH-002`   | Never auto-repair a stale selector.                                                  | implemented           | observational health API; no repair mutation path        |
| `V15-STREAM-001`   | Coalesce streaming mutation bursts with bounded quiet/max windows.                   | implemented           | `streaming-stability.ts`, runtime integration, tests     |
| `V15-STREAM-002`   | Cancel pending streaming work on suspend, rollback, and destroy.                     | implemented           | `frame-runtime.ts`, controller tests                     |
| `V15-OBS-001`      | Expose text-free runtime health/performance/lifecycle snapshots.                     | implemented           | runtime snapshot message and side panel                  |
| `V15-CONFLICT-001` | Explain accepted and suppressed profile-rule matches deterministically.              | implemented           | `profile-zone.ts`, inspection types/tests                |
| `V15-HISTORY-001`  | Keep at most ten canonical last-known-good profile snapshots.                        | implemented           | profile history repository/tests                         |
| `V15-HISTORY-002`  | Restore history as a new version, not a silent rollback.                             | implemented           | user profile repository/background messages              |
| `V15-FIXTURE-001`  | Export a structural diagnostic fixture without page text.                            | implemented           | fixture recorder/tests                                   |
| `V15-CERT-001`     | Distinguish synthetic fixture, live, and browser profile evidence.                   | implemented           | certification schema/index/catalog validation            |
| `V15-BROWSER-001`  | Execute a real Chromium content-runtime smoke in automated checks.                   | implemented           | `chromium-runtime-smoke.mjs`                             |
| `V15-BUG-001`      | Insert owned typography styles into `Document.head`, never directly into `Document`. | implemented           | mutation applier regression fix/test and Chromium smoke  |
| `V15-LIVE-001`     | Certify all official selectors on current live services.                             | insufficient_evidence | certification records remain `not-run`                   |
| `V15-E2E-001`      | Pass manifest-loaded Chrome, Edge, and Firefox extension E2E.                        | insufficient_evidence | Chromium content-runtime smoke only                      |
| `V15-A11Y-001`     | Pass manual NVDA, zoom/reflow, forced-colors, and text-spacing gates.                | insufficient_evidence | manual execution absent                                  |
| `V15-PERF-001`     | Pass pinned 30-run and 20-cycle memory budgets.                                      | insufficient_evidence | runtime metrics implemented; acceptance benchmark absent |
| `V15-STORE-001`    | Produce signed and reviewer-accepted store packages.                                 | not_implemented       | deterministic local ZIPs only                            |
