# RTLX 15.5.4 Acceptance Criteria

- Mixed Persian/English technical content is typography-eligible when protected-zone checks pass.
- The content typography stack places the bundled mixed-text font before the local Persian alias and does not include `Segoe UI` or `Tahoma` in the Persian local alias.
- The popup contains a Persian user action for downloading the current page debug report.
- The page debug report is local-only, user-triggered, and does not require the `downloads` permission.
- Failure Evidence runtime snapshots include a bounded `pageDebug` object with text-free style/candidate diagnostics.
- Manifest permissions do not add `downloads`, `local-fonts`, `debugger`, new mandatory host permissions, telemetry, or remote executable-code capabilities.
- Automatic processing still never mutates `html` or `body` direction.
- Existing Profile Schema v3 remains unchanged.
- Deterministic validation, build, release packaging, two-run hash comparison, and clean source rebuild reproduce.
- Manual validation on the user’s Windows target page remains `insufficient_evidence` until the supplied build is loaded and its page debug report is returned.
