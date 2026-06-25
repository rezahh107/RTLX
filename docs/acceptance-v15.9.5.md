# RTLX 15.9.5 Acceptance

## Deterministic acceptance cases

1. An element processed as a generic candidate and later discovered as a text block is admitted again and recorded as processed.
2. Connected entries in `unprocessedTextBlocks` are requeued during capture stabilization when candidate queues are empty.
3. `textBlocksProcessingPending > 0` produces `captureReadiness.status=partial` and `certificationEligible=false`.
4. `textBlocksProcessingPending = 0` preserves existing readiness behavior.
5. A stale-epoch live content script accepts `RTLX_REBIND_RUNTIME_EPOCH`, preserves its document instance, and sends a new context registration.
6. Successful rebind prevents `chrome.scripting.executeScript` from being called.
7. A genuinely absent content script still triggers main-frame injection.
8. Matching browser document ID and document generation preserve selected-document identity across a content-runtime instance change.
9. A changed browser document ID is still rejected as a stale document.
10. Report creation uses `ENSURE_CURRENT_TAB_RUNTIME` and does not unconditionally send `APPLY_CURRENT_TAB`.

## Release gates

- TypeScript compilation: pass.
- Unit/property/security tests: pass.
- Coverage run: pass.
- Format, ESLint, warning baseline: pass.
- Schemas and bundled profiles: pass.
- Controlled Chromium smoke: pass.
- Four browser packages: build successfully.
- Release manifests and integrity verification: pass.
- Production and complete dependency audits: zero high-severity failures.

## External boundary

A real-site report from RTLX 15.9.5 is required before claiming that duplicate injection and incomplete coverage no longer occur on DeepSeek in the user environment.
