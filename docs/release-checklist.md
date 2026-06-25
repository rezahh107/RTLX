# RTLX v15 Hardening Release Checklist

## Gate A — Static quality

- [ ] `npm run format-check`
- [ ] `npm run typecheck`
- [ ] `npm run lint` with every warning reviewed
- [ ] `npm run validate:schemas`
- [ ] `npm run validate:profiles`
- [ ] production and full development dependency audits reviewed

## Gate B — Unit/property

- [ ] `npm run test:coverage`
- [ ] selector, picker, profile, verifier, FailureManager, visibility, rollback, resolver, profile-health, streaming, history, and style-injection tests pass
- [ ] coverage threshold passes

## Gate C — Build

- [ ] `npm run build`
- [ ] `npm run test:browser-smoke` with semantic direction, typography, streaming, accessibility-name, and rollback assertions
- [ ] `npm run manifest:validate`
- [ ] `npm run webext:lint`
- [ ] `npm run security:scan`
- [ ] font hashes/licenses pass
- [ ] `npm run build:release` is reproducible
- [ ] Firefox ID, minimum version, and data declaration match the v15 contract

## Gate D — Functional browsers

- [ ] Chrome real extension E2E
- [ ] Firefox real WebExtension E2E
- [ ] Microsoft Edge smoke/E2E
- [ ] picker all six categories
- [ ] profile create/export/import/delete/reload
- [ ] diagnostics and profile inspector
- [ ] one-click site toggle and keyboard shortcut
- [ ] all inherited fixtures and twelve bundled-profile smoke fixtures including Qwen

## Gate E — Accessibility

- [ ] picker keyboard and focus behavior
- [ ] popup/options keyboard-only
- [ ] accessible-name equality
- [ ] NVDA matrix
- [ ] 200% zoom/reflow, forced colors, and text spacing

## Gate F — Security

- [ ] message privilege-boundary tests
- [ ] complete signed-profile negative matrix
- [ ] import/selector/size/count limits
- [ ] malicious-page tests
- [ ] no remote executable code
- [ ] dependency risks resolved or formally accepted

## Gates G–H — Performance and lifecycle

- [ ] pinned 30-run benchmark
- [ ] 20 SPA cycles and memory trend
- [ ] permission revocation, BFCache, frames, Shadow DOM
- [ ] repeated picker start/cancel/select
- [ ] repeated rollback and unsafe rollback ownership
- [ ] no listener, observer, queue, wrapper, or journal leaks

## Gate I — Store/docs

- [ ] reviewer guide and permissions match manifests
- [ ] privacy disclosure and Firefox data declaration match code
- [ ] profile provenance is accurate
- [ ] release ZIPs and SHA-256 report generated
- [ ] signed store artifacts and reviewer evidence recorded
