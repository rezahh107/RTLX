# RTLX 15.5.4 Acceptance Criteria

- Popup HTML contains a visible `role="switch"` control for per-page RTLX activation.
- The switch enable path calls current-site permission request before applying the tab.
- The switch disable path stores disabled state and requests rollback.
- The page debug action requests current-site permission before `APPLY_CURRENT_TAB` when the page URL is eligible.
- Persian and English localization keys for the new switch are complete.
- TypeScript typecheck passes.
- Unit tests for popup activation pass.
- The full Vitest suite passes.
- Build and package-release complete successfully.
- Manifest validation, security scan, and production dependency audit pass.
- `npm run lint` remains blocked in this generated source checkout by execution timeout and is recorded as insufficient evidence rather than PASS.
