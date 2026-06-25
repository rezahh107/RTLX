# RTLX 15.9.2 Requirements

## Direction resolution

- `DIRECTION-AUTO-CONTEXT-001`: An inherited `dir="auto"` MUST be treated as unresolved inherited context, not as a terminal no-op branch, when the block is confidently Persian or mixed.
- `DIRECTION-AUTO-CONTEXT-002`: An explicit local `dir="auto"` MUST remain preserved.
- `DIRECTION-AUTO-CONTEXT-003`: Existing explicit `rtl`, explicit `ltr`, protected-zone, and user-mode behavior MUST remain unchanged.

## Diagnostic correctness

- `DIAGNOSTIC-OWNERSHIP-001`: RTLX ownership metadata MUST NOT by itself produce `already-correct`.
- `DIAGNOSTIC-OWNERSHIP-002`: A not-modified reason MUST reflect the actual direction decision, exclusion, or typography result.

## Text-block continuation and coverage

- `TEXT-BLOCK-CONTINUATION-002`: Every connected pending text-block continuation MUST be queued, in progress, or deterministically requeued.
- `TEXT-BLOCK-CONTINUATION-003`: A disconnected or invalid continuation MUST be cancelled and removed from readiness state.
- `TEXT-BLOCK-COVERAGE-002`: An abandoned unprocessed discovery MUST be removed from current coverage accounting.
- `TEXT-BLOCK-COVERAGE-003`: A semantic fallback processed as a text block MUST first be recorded as discovered.
- `TEXT-BLOCK-COVERAGE-004`: Current processed count MUST NOT exceed current discovered count.

## Profile health

- `PROFILE-HEALTH-002`: Semantic rules MAY declare `required` or `optional` health expectations.
- `PROFILE-HEALTH-003`: Semantic fallback rules MAY share an `alternativeGroup`.
- `PROFILE-HEALTH-004`: An optional no-match MUST NOT degrade an otherwise healthy profile.
- `PROFILE-HEALTH-005`: When some semantic coverage is healthy, a required standalone no-match or a required alternative group with no matching member MUST degrade the profile; when all semantic rules miss, the existing `no-match` status remains authoritative.
- `PROFILE-HEALTH-006`: Existing invalid-selector and excessive-match precedence MUST remain unchanged.

## SPA selected-element evidence

- `FAILURE-SELECTION-002`: Selection identity MUST use the active profile's configured site or conversation scope.
- `FAILURE-SELECTION-003`: A route change inside the same document and same configured scope MUST NOT clear the selection.
- `FAILURE-SELECTION-004`: Host, frame, document-instance, or configured-scope changes MUST continue to invalidate stale selection evidence.

## Hidden/inactive capture

- `CAPTURE-VISIBILITY-001`: The popup MUST NOT export a report already known to be blocked solely because the target document is hidden or runtime inactive.
- `CAPTURE-VISIBILITY-002`: The popup MUST instruct the user to return to the target tab and retry.
- `CAPTURE-VISIBILITY-003`: Runtime suspension and background-throttling behavior MUST remain unchanged.

## Preserved boundaries

All RTLX 15.9.1 requirements remain active unless explicitly superseded above. This patch MUST NOT broaden browser permissions, collect page text, capture screenshots automatically, retune the classifier, replace site selectors, or claim real-site effectiveness without a qualifying real fixture.
