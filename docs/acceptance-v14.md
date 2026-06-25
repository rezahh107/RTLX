# RTLX v14 Acceptance Criteria

Inherited RTLX-SSOT Gates A–I remain mandatory. The criteria below are additional v14 checks.

## Gate A — Static and contracts

- strict TypeScript passes;
- formatting passes;
- ESLint has zero errors and warnings remain visible;
- Profile Schema v3, Settings Schema v2, export and envelope schemas validate;
- bundled profiles and malformed fixtures validate.

Current automated state: `pass_with_documented_warnings`.

## Gate B — Unit, property, and security tests

- Persian/English input direction tests;
- Arabic and Urdu negative-classification tests;
- selector candidate determinism;
- conversation scope privacy;
- per-rule migration and validation;
- Amazon local-only policy;
- signed-envelope validation;
- fixture pack integrity.

Current automated state: `pass` for executed tests; browser-fixture assertions are not E2E evidence.

## Gate C — Build and packaging

- Chromium, Edge, and Firefox builds;
- target-specific manifest validation;
- Firefox `web-ext lint` with zero errors and zero unexpected warnings;
- prohibited remote-code scan;
- font integrity and license scan;
- deterministic ZIP hashes across two builds.

Current state is established only after release packaging logs are attached.

## Gate D — Browser E2E

Required:

- Chrome extension load and all controlled fixtures;
- Microsoft Edge extension load and smoke/E2E;
- Firefox WebExtension load using `web-ext` or equivalent real extension automation;
- side panel/sidebar, context menu, picker, input assistant, conversation scope, frames, Shadow DOM, BFCache, permission revocation, and rollback.

Current state: `not_run`.

## Gate E — Accessibility

Required:

- axe/equivalent;
- keyboard-only side panel and picker;
- focus visibility;
- accessible name equality;
- composition/IME and screen-reader editing checks;
- 200% zoom/reflow, forced colors, text spacing;
- NVDA + Firefox and NVDA + Chrome/Edge.

Current state: `not_run`.

## Gate F — Security

Required:

- complete signed-profile attack matrix;
- content sender cannot invoke privileged imports or rule edits;
- unsigned catalog import rejection;
- no Amazon network or binary resource;
- release package remote-code scan;
- dependency-risk disposition.

Automated subset: executed. Full gate: `partial`.

## Gate G — Performance

Required 30 cold runs and 20 SPA cycles in a pinned environment, including side-panel activity, selector delays, input events, and list repair.

Current state: `not_run`.

## Gate H — Lifecycle and rollback

Required repeated enable/disable, context-menu overrides, input-field changes, permission revoke, BFCache, SPA route changes, frame/shadow cleanup, and memory budget.

Unit subset: executed. Browser gate: `not_run`.

## Gate I — Documentation and stores

Required documentation, final hashes, permission justification, privacy disclosure, reviewer guides, signed store artifacts, and reviewer evidence.

Documentation subset: implemented. Store evidence: `not_run`.
