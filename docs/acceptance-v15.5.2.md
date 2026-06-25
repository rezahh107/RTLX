# RTLX 15.5.2 Acceptance Criteria

- Popup and options UI are Persian-first and all `data-i18n` keys resolve in both `fa` and `en`.
- Options page exposes default site mode and Latin font policy controls.
- UI CSS loads a Persian UI font using local Windows font fallbacks and bundled Vazirmatn fallback.
- Manifest permissions do not include `local-fonts`.
- Auto-safe mode applies candidate-level RTL correction for high-confidence Persian inherited from LTR while preserving explicit local direction and never mutating `html` or `body`.
- Full deterministic validation suite passes and release artifact hashes reproduce across two packaging runs and clean source rebuild.
