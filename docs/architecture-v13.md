# RTLX v14 Architecture Changes

## Status

`implemented` means source code exists. It does not mean acceptance gates passed.

## Minimal delta from v12

The v12 background/content/UI separation and plan-journal-rollback design remain intact. Version 13 adds bounded components rather than replacing the architecture.

### New shared domain modules

- `profile-schema.ts`: strict Profile v2 validation and deterministic v1 migration.
- `profile-builder.ts`: picker selection mapping, canonical export/import, signable payload generation.
- `site-detector.ts`: offline host-to-product matching.

### New content modules

- `selector-generator.ts`: stable-selector candidate generation and deterministic uniqueness selection.
- `picker-controller.ts`: isolated Shadow DOM picker UI and element diagnostics.
- `profile-zone.ts`: profile category matching and protected-zone decisions.
- `visibility-registry.ts`: IntersectionObserver admission with a 300px margin and deterministic fallback.

### New background module

- `user-profile-repository.ts`: validated local per-site user-profile storage, import, export, merge, and deletion.

## Smart Picker data flow

```text
Popup user gesture
→ START_PICKER authorized on extension page
→ content script injection/command
→ pointer selection in owned ShadowRoot UI
→ deterministic selector generator
→ local diagnostics inspection
→ SAVE_PICKER_SELECTION from authenticated content sender
→ hostname equality check
→ Profile Builder v2
→ schema/selector validation
→ local profile repository
→ content reprocess
```

No page text crosses into the background message. The selection payload contains only hostname, category, and validated selector.

## Profile precedence

```text
Hard safety locks
→ explicit user per-site settings
→ user picker profile
→ bundled offline profile
→ generic defaults
```

User profiles cannot remove hard exclusions or enable closed Shadow DOM remotely.

## Failure and visibility pipeline

FailureManager is invoked for attributable runtime faults, runaway queues, hard wrapper limits, and rollback failure. IntersectionObserver controls candidate admission before processing; absence of the API falls back to immediate bounded scheduling.

## Browser split

- Chromium: MV3 module service worker; minimum Chrome 121.
- Firefox: MV3 module background scripts; minimum Firefox desktop 140 and Android 142; stable GUID; `data_collection_permissions.required = ["none"]`.
