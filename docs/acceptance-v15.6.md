# RTLX 15.6.0 Acceptance Criteria

## Focused package

- [x] Every built manifest has no `options_ui`, `side_panel`, or `sidebar_action`.
- [x] No built manifest requests `sidePanel`, `menus`, `contextMenus`, `downloads`, or `local-fonts`.
- [x] Release packages contain popup UI and no options/sidepanel files.
- [x] Advanced source is present only in the source archive under `developer-tools-archive/`.

## User flow

- [x] The site switch requests optional host access before applying.
- [x] Smart repair applies/reprocesses the current tab.
- [x] Reset deletes legacy site profile/settings and rolls back.
- [x] Report waits for bounded runtime settlement and downloads locally.

## Language and fonts

- [x] Persian/mixed text receives RTL/right alignment in a safe candidate.
- [x] Latin text inside an RTL ancestor receives LTR/left alignment.
- [x] Code and protected zones remain excluded.
- [x] Bundled Vazirmatn is available.
- [x] Local Amazon Ember is attempted before bundled Inter.
- [x] No Amazon Ember binary is present in the package.

## Verification

- [x] Format, typecheck, lint governance, schemas, profiles, tests, coverage, build, manifests, Firefox lint, security scan, production audit, store-readiness, personal identity, and Chromium runtime smoke pass.
- [x] Two independent release packaging runs produce equal SHA-256 hashes.
- [ ] Exact Windows validation on the user's target pages remains `insufficient_evidence` until executed externally.
