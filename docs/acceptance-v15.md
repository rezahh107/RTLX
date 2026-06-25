# RTLX v15 Acceptance Criteria

Inherited RTLX-SSOT Gates A–I remain mandatory. v15 adds hardening evidence but does not redefine a gate as passed.

## Gate A — Static quality and contracts

Required: formatting, strict TypeScript, lint, schema/profile/certification validation, and dependency review.

Current status: established only by the attached final command log.

## Gate B — Unit, property, security, and regression

Required additions:

- profile-health state matrix;
- streaming coalescing/cancellation;
- rule-conflict explanation;
- canonical profile history;
- text-free fixture export;
- document-head style injection regression;
- inherited resolver, rollback, security, language, picker, and profile tests.

## Gate C — Build and packaging

Required: Chromium, Edge, and Firefox builds, manifest validation, Firefox lint, font verification, prohibited-code scan, deterministic release ZIPs, and authoritative release identifiers.

## Gate D — Functional browser execution

Automated v15 subset:

- real headless Chromium content-runtime smoke using the final built bundle;
- semantic Persian `dir="rtl"`;
- no `html/body` direction mutation;
- LTR code protection;
- typography style/class ownership;
- bounded BiDi wrappers;
- streaming coalescing;
- accessible-name preservation;
- complete rollback.

Still required for full Gate D: manifest-loaded Chrome, real Edge, and real Firefox WebExtension E2E across required fixtures and bundled profiles.

## Gate E — Accessibility

Still required: automated tree/name checks, keyboard workflows, NVDA matrix, 200% zoom/reflow, forced colors, and text spacing.

## Gate F — Security

Automated subset includes strict profiles, message authorization, fail-closed community import, diagnostic redaction, remote-code scan, and production dependency audit. Full malicious-page and store-package security matrix remains required.

## Gate G — Performance

Runtime phase summaries and queue counters are implemented. The pinned 30-cold-run benchmark, attributable long-task/CLS analysis, and 20-cycle SPA memory trend remain required.

## Gate H — Lifecycle and rollback

Unit and Chromium-smoke subsets cover rollback and streaming cancellation. Full permission-revocation, BFCache, frame, Shadow DOM, repeated enable/disable, and memory evidence remains required.

## Gate I — Documentation and stores

Documentation, migration, release notes, local hashes, and reviewer guidance are required. Signed store artifacts and reviewer evidence remain external blockers.
