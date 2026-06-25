# RTLX 15.9.3 Acceptance

## Deterministic checks

- TypeScript typecheck passes.
- Formatting and ESLint governance pass.
- Schemas and bundled profiles validate.
- Unit, property, security, and stress tests pass.
- Coverage thresholds pass.
- Four browser targets build.
- Controlled Chromium runtime smoke passes.
- Manifest, WebExtension, security, audit, and store-readiness checks pass.
- Browser and source package manifests verify.

## Confirmed repair assertions

- Final `blocked + document_hidden` returns `RTLX-CAPTURE-VISIBLE-TAB-REQUIRED`.
- Final `blocked + runtime_inactive` returns the same typed result.
- Final `partial + text_block_enumeration_pending` remains exportable.
- An unrelated blocked reason is not newly intercepted.
- A blocked result does not invoke the popup download callback.
- Valid report data still invokes the popup download callback.
- Malformed responses do not invoke download.

## External boundary

Local gates establish implementation and packaging status only. Live-site user-flow confirmation remains `insufficient_evidence` until the final 15.9.3 artifact is tested while the target tab changes visibility during report capture.
