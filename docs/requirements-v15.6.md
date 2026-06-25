# RTLX 15.6.0 Focused Personal Requirements

## Status

`implemented`

## User-facing scope

- `FOCUSED-UI-001`: The shipped extension SHALL expose only site activation, smart repair, font selection, problem report, and legacy-site reset.
- `FOCUSED-UI-002`: Options, side-panel, element-picker, profile-authoring, community-catalog, context-menu-authoring, and developer-dashboard surfaces SHALL NOT be shipped.
- `FOCUSED-UI-003`: Semantic states SHALL be represented with text and iconography in addition to color.

## Direction

- `LANGUAGE-DIRECTION-001`: Confident Persian and Persian/English mixed candidates SHALL receive semantic RTL and right alignment when no authoritative local direction blocks mutation.
- `LANGUAGE-DIRECTION-002`: Confident Latin candidates SHALL receive semantic LTR and left alignment when no authoritative local direction blocks mutation.
- `LANGUAGE-DIRECTION-003`: Automatic processing MUST NOT set direction on `html` or `body`.
- `LANGUAGE-DIRECTION-004`: Code, math, editor, terminal, icon, and protected interactive zones remain authoritative exclusions.

## Typography

- `TYPOGRAPHY-SELECT-001`: Persian font choices SHALL be bundled Vazirmatn or local-Persian-first with bundled Vazirmatn fallback.
- `TYPOGRAPHY-SELECT-002`: English font choices SHALL be local Amazon Ember Display/Amazon Ember with bundled Inter fallback, or bundled Inter.
- `TYPOGRAPHY-LICENSE-001`: Amazon Ember binaries MUST NOT be bundled or downloaded without explicit redistribution authorization.
- `TYPOGRAPHY-CASCADE-001`: Typography SHALL apply to safe text-bearing targets and verify the computed family.

## Site activation and reset

- `SITE-ACTIVATION-001`: Enabling a site SHALL request optional host access in a user gesture and apply the current tab.
- `SITE-ACTIVATION-002`: Disabling a site SHALL persist disabled mode and roll back owned mutations.
- `SITE-RESET-001`: The popup SHALL provide one action that removes legacy user-profile rules, clears scoped site settings, and rolls back the current tab.
- `PROFILE-FOCUSED-001`: The focused runtime SHALL use bundled profiles only; legacy user/community profiles SHALL not silently affect processing.

## Problem report

- `REPORT-001`: Report creation SHALL be user initiated.
- `REPORT-002`: The popup SHALL wait a bounded interval for runtime work to settle before export.
- `REPORT-003`: The privacy exclusions defined by Failure Evidence Capture remain frozen.
