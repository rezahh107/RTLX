# RTLX v15.9.11 — ChatGPT Profile Narrowing & Capture Readiness Stabilization

## Executive Summary

Release status: **NO_GO for public/store release**.
Personal/local status: **CONDITIONAL_GO after local retest**.

This version is a minimal patch over v15.9.10 based on the supplied v15.9.10 manual Edge/ChatGPT and Chromium/Qwen diagnostic reports. The uploaded reports proved real local runtime activation for v15.9.10, but they also showed two defects: `official:chatgpt` profile excessive-match and Qwen capture readiness partial.

## Implemented Changes

| Area | Change | Evidence |
|---|---|---|
| Version | `15.9.10` -> `15.9.11` | `package.json`, `manifest.base.json` |
| ChatGPT profile | `rule-ccfde4b9` selector narrowed from `code` to `pre code`; `profileVersion` -> 4 | `profiles/bundled/chatgpt.json` |
| Qwen/capture readiness | pending text-block continuations that become unprocessable are invalidated during recovery | `src/content/text-block-continuation-recovery.ts`, `src/content/frame-runtime.ts` |
| Font diagnostics | added `BUILD_FLAVOR = no-font-binaries` and build-flavor-aware expected text | `src/shared/constants.ts`, `src/background/failure-report-analysis.ts` |
| Tests | added executable regression tests | `tests/unit/chatgpt-profile-v15911.test.ts`, `tests/unit/text-block-continuation-recovery-v15911.test.ts` |

## Validation

- TypeScript: PASS
- Profile validation: PASS
- ESLint quiet: PASS
- Vitest: PASS — 118 files / 363 assertions
- Build release: PASS
- Clean source reproduction: PASS
- Release gates: BLOCKED

## Artifact hashes

| Target | SHA256 |
|---|---|
| rtlx-chromium-15.9.11.zip | `31e548a13660b33d3f6ae596c188a93fa9773714bc2dd1c7a88d6cf8f73a585c` |
| rtlx-edge-15.9.11.zip | `53f9d7ed4ae708b1c58bd800a1ac1ee7215846eb27eeea02701bf91c09a6ac1c` |
| rtlx-firefox-15.9.11.zip | `114f02f1508619f6fbfc894dcbb72e067198a1b1470ffbe5b224e8e341ff5c82` |
| rtlx-firefox-android-15.9.11.zip | `cda4ddf22b2571f8a59f75af71c7dd362bb2712d7a838dbadaa89f78353225f0` |

## Browser qualification

| Target | Status | Reason |
|---|---|---|
| Chromium | INSUFFICIENT_EVIDENCE | unpacked extensions disabled by administrator policy in automated environment |
| Edge | INSUFFICIENT_EVIDENCE | Edge executable unavailable in container |
| Firefox Desktop | INSUFFICIENT_EVIDENCE | Firefox executable unavailable |
| Firefox Android | INSUFFICIENT_EVIDENCE | no device/emulator evidence supplied |

## Manual runtime evidence used as input

| Source | Browser | Site | v15.9.10 result | v15.9.11 patch response |
|---|---|---|---|---|
| user report | Edge | chatgpt.com | `profile_excessive_match` / `rule-ccfde4b9` matchCount 350 | narrowed ChatGPT code selector |
| user report | Chromium | chat.qwen.ai | `capture_partial`, 1 pending candidate + 1 pending text-block enumeration | continuation recovery hardening |

## Web research conclusion

No official OpenAI technical selector/CSS contract for right-to-left ChatGPT articles/messages was found. The reliable implementation guidance comes from W3C/MDN bidi guidance: use scoped direction changes, avoid global page direction flips, and isolate mixed-direction inline runs. Community OpenAI threads confirm RTL symptoms for Persian/Arabic, but they are symptom evidence only.

## Remaining risks

- v15.9.11 has not yet been manually retested on the four requested same-site pairs: Edge/ChatGPT, Chrome/ChatGPT, Edge/Qwen, Chrome/Qwen.
- The handoff package omits font binaries and build artifact ZIPs; artifact hashes are included, but binaries are not included.
- Store release remains blocked until real exact-artifact browser gates pass.
