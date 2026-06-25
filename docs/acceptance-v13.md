# RTLX v14 Acceptance Criteria

These criteria extend, and do not weaken, SSOT Gates A–I.

## Gate A — Static and schema quality

- strict TypeScript pass;
- lint and format check pass;
- Profile v2, export, element-selection, settings, diagnostic, and envelope schemas pass;
- all bundled profiles validate;
- no unsafe `any` or prohibited sinks.

## Gate B — Unit and property

- selector generation determinism and uniqueness;
- v1-to-v2 profile migration;
- canonical profile export/import;
- picker message rejection cases;
- profile signature sequence;
- FailureManager idempotency;
- IntersectionObserver admission;
- wrapper and rollback boundaries;
- resolver property suite.

## Gate C — Builds and packaging

- Chromium and Firefox builds pass;
- manifest validation pass;
- Firefox `web-ext lint` has no errors;
- release package security scan pass;
- profile-library index exactly enumerates bundled profiles;
- artifact hashes produced.

## Gate D — Functional browser E2E

Required flows in real target browsers:

- pick each of six element categories;
- create/reload/export/import/delete a user profile;
- diagnostics panel fields match deterministic runtime output;
- active profile inspector and AI detection;
- one-click disable/restore and keyboard command;
- permission revocation rollback;
- Qwen and every bundled product smoke fixture.

## Gate E — Accessibility

- picker keyboard escape/cancel and focus visibility;
- popup/options keyboard-only operation;
- diagnostics panel accessible name and reading order;
- no accessible-name changes to selected site controls;
- NVDA Firefox and Chromium matrix;
- 200% zoom, reflow, forced colors, text spacing.

## Gate F — Security

- content sender cannot call profile import/export/settings operations;
- extension pages cannot forge content-only selection messages;
- selector, import size, profile count, signature, key, timestamp, anti-rollback, and duplicate-key cases pass;
- no remote executable code;
- production and development dependency findings resolved or formally accepted.

## Gate G — Performance

Run the pinned 30-run benchmark including picker activation, visibility queue, 5,000-node page, and 20 SPA cycles. All inherited budgets remain applicable.

## Gate H — Lifecycle and rollback

Repeated picker cancel/select, profile replacement, BFCache, frames, Shadow DOM, permission removal, disable/enable, and unsafe rollback cases pass without listener, observer, wrapper, or journal leaks.

## Gate I — Documentation and stores

Migration, privacy, reviewer guide, profile-library provenance, Firefox data declaration, keyboard command, release packages, signing evidence, and hashes are complete.

Until all applicable gates pass:

```yaml
production_ready: false
release_blocked: true
```
