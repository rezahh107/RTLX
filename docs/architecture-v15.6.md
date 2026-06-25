# RTLX 15.6.0 Architecture Delta

## Scope reduction

The runtime remains Manifest V3 and retains deterministic classification, mutation planning, ownership journaling, rollback, lifecycle handling, and privacy-safe Failure Evidence Capture. The user-facing product is reduced to one popup.

Removed from release builds:

- options UI;
- side panel / Firefox sidebar;
- element picker and selector generation;
- failure-element picker;
- context-menu overrides;
- advanced profile/rule/history/community/operational handlers.

The pre-removal sources are archived under `developer-tools-archive/v15.5.5/` and are not referenced by build entry points.

## Focused runtime profile policy

`findActiveProfile()` resolves bundled declarative profiles only. Existing user-authored picker profiles remain stored until the user chooses **Reset this site**, but they are ignored by processing and cannot silently alter the page.

## Direction policy

The classifier produces Persian, mixed, Latin, or unknown evidence. The direction resolver maps high-confidence Persian/mixed candidates to RTL/right and high-confidence Latin candidates to LTR/left, while preserving explicit local direction and protected zones.

## Composite typography

The content stylesheet creates one `RTLX Selected Text` family with unicode-ranged faces:

- Persian ranges: bundled Vazirmatn, optionally preceded by approved local Persian family names.
- Latin ranges: local Amazon Ember Display/Amazon Ember when selected, followed by bundled Inter.

Amazon binaries are not packaged.

## UI boundary

The popup owns only user intent and status presentation. Python-like analysis, profile authoring, diagnostics inspection, and developer operations are not exposed. Internal report creation remains deterministic and privacy bounded.
