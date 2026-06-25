# RTLX 15.6.0 Requirements — Complete-Page Coverage and Correlated Diagnostics

## Status and authority

- `architecture_status: frozen`
- `implementation_status: implemented_pending_full_validation`
- Higher-authority source: RTLX SSOT 12.0.0 and existing frozen schemas/registries.
- Profile Schema v3, settings schema, permissions, privacy exclusions, rollback ownership, and supported-language scope are unchanged.

## R-15.6.0-001 — Visibility is priority, not eligibility

A connected eligible candidate outside the viewport MUST remain scheduled for bounded background processing. Intersection observation MAY promote it to the visible queue but MUST NOT be the only path to processing.

## R-15.6.0-002 — Resumable discovery

Candidate discovery MUST preserve deterministic continuation state when a candidate or visit budget is reached. It MUST NOT permanently omit later DOM candidates merely because an earlier batch reached 100 roots.

## R-15.6.0-003 — Deterministic candidate priority

Within a batch, profile content roots and semantic text containers MUST precede toolbar, navigation, menu, tab, and button chrome. Stable source order MUST break score ties.

## R-15.6.0-004 — Safe leaf typography

Typography MUST be applied only to bounded text-bearing elements containing Arabic-script text and MUST preserve code, math, editor, terminal, icon, hidden, inert, and profile-protected zones. No broad universal descendant selector is permitted.

## R-15.6.0-005 — Cascade verification

After owned typography mutation, the runtime MUST verify bounded computed-font samples. A failure MUST produce a text-free diagnostic with counts only; it MUST NOT capture text, selectors, HTML, URLs, or CSS rule content.

## R-15.6.0-006 — Diagnostic provenance

Content diagnostics included in a page failure report MUST match the captured `tabId`, `frameId`, browser document ID when available, content document instance ID, document generation, and runtime instance ID when available. Uncorrelated global diagnostics MUST NOT be presented as evidence for that page runtime.

## R-15.6.0-007 — Degradation semantics

Ordinary bounded-resource failures MUST NOT enter terminal level 4. Level 4 is reserved for repeated terminal runtime exceptions or rollback failures. Recovery and transition diagnostics MUST record the failure key and contemporaneous bounded queue/backpressure counters.

## R-15.6.0-008 — Cooperative scheduling

The runtime MAY use `scheduler.yield()` only behind feature detection. A deterministic existing fallback MUST remain available for browsers without the API.

## R-15.6.0-009 — Frozen privacy boundary

No page text, full URL, query, fragment, HTML, form values, cookies, local/session storage, network data, console output, clipboard, or screenshot may be added to diagnostics or reports.
