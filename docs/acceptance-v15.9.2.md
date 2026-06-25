# RTLX 15.9.2 Acceptance

## Required deterministic checks

- TypeScript typecheck passes.
- All schemas validate.
- All bundled profiles and the profile certification index validate.
- Unit, property, security, and stress tests pass.
- Coverage thresholds pass.
- ESLint and reviewed-warning audit pass.
- Four browser targets build.
- Controlled Chromium runtime smoke passes.
- Manifest, WebExtension, security, dependency, and store-readiness gates pass.
- Browser and source packages are deterministic and their SHA-256 manifests verify.

## Confirmed repair assertions

- Confident Persian/mixed under inherited `dir="auto"` resolves to RTL in `auto-safe`.
- Explicit local `dir="auto"` remains preserved.
- Ownership class alone cannot produce `already-correct`.
- A connected pending continuation with no queue entry is identified for recovery.
- A queued continuation is not duplicated.
- Cancelled unprocessed discoveries decrement coverage deterministically.
- Fallback regions are counted as discovered before processed.
- Optional semantic no-match does not degrade a healthy profile.
- Missing required semantic coverage still degrades or yields no-match.
- Conversation-scope route normalization is deterministic.
- Hidden/inactive blocked capture is stopped in the popup.

## External boundary

Passing local gates does not prove visual correction on Qwen, ChatGPT, Claude, or another live site. External runtime status remains `insufficient_evidence` until the final browser artifact is tested on a clean page with a visible target tab and selected-element evidence.
