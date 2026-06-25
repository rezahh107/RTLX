# RTLX 15.7.3 Architecture Delta

## Problem

In 15.7.2 a semantic block could also become the direction mutation target. On Qwen, some semantic blocks were flex/grid layout containers containing SVG icons and controls. Applying `dir="rtl"` to those ancestors changed the inherited inline direction and moved icons across the row, sometimes into clipped regions.

## New boundary

```text
Text evidence
    ↓
Semantic block resolution
    ↓
Layout safety assessment
    ↓
Direction target resolution
    ├─ safe semantic block
    ├─ safe source text owner
    ├─ safe descendant text owner
    └─ suppress mutation
```

`SemanticBlock` remains the analysis scope. `DirectionTarget` is the smallest safe text-bearing element that may receive `dir` and the direction class. `TypographyTarget` is resolved independently at safe text leaves. Layout containers and icon boundaries are context only.

## Layout-sensitive conditions

An element is layout-sensitive when it is an icon boundary, has a layout role, or uses flex/grid while containing icons, controls, or clipping.

## Icon boundary

The following are never direction or typography targets:

```text
svg, use, img, [role="img"], [aria-hidden="true"]
```

Interactive controls containing icons may still expose independent safe label descendants for typography.

## Evidence

Runtime Snapshot `1.5.0` adds:

```json
{
  "layoutSafety": {
    "semanticLayoutContainers": 0,
    "directionTargetsRedirected": 0,
    "directionMutationsSuppressed": 0
  }
}
```

Selected-element evidence `1.2.0` includes layout, direction source, and icon evidence without page text.
