# RTLX CI Contracts

RTLX CI is split into deterministic source contracts and non-blocking browser/runtime evidence.

## Required merge-gate workflows

### CI Fast

Runs on `push` and `pull_request`.

Purpose:

- deterministic dependency installation
- Prettier format check
- TypeScript typecheck
- ESLint
- warning baseline audit

This workflow must stay browser-independent.

### CI Contracts

Runs on `push` and `pull_request`.

Purpose:

- release version consistency
- schema validation
- bundled profile validation
- message serialization validation
- manifest validation
- RTLX regression contracts

Regression contracts currently cover:

- bundled profile routing for ChatGPT, Claude, and Qwen
- ChatGPT/Claude block-code-only code selectors
- source-no-font-binaries policy
- manifest permission and CSP allowlists
- automatic report selected-element optional semantics
- capture readiness pure logic
- profile verifier security checks

### CI Build

Runs on `push` and `pull_request`.

Purpose:

- build unpacked browser extension targets for Chromium, Edge, Firefox, and Firefox Android
- upload development build artifacts for inspection

## Manual / non-blocking workflows

### Legacy Full Check

Runs only through `workflow_dispatch`.

Purpose:

- keep the old monolithic `npm run check` available for manual diagnosis
- do not use it as the normal required CI gate until runner-level npm/browser instability is resolved

### Browser certification evidence

Runs manually or by schedule.

Purpose:

- browser/runtime evidence collection
- exact-artifact browser tests
- release qualification evidence

This workflow is intentionally separate from deterministic source CI because browser availability, enterprise policy, and runner environment can make evidence collection non-deterministic.

## CI design rules

1. Required CI must not depend on a real browser unless the test is explicitly a build artifact check.
2. Required CI must fail fast when dependency installation is incomplete.
3. New production defects must become deterministic contract tests before the fix is considered complete.
4. Browser evidence can block public/store release, but should not block every normal source push.
5. No font binaries may be committed into the source-no-font-binaries source tree.
