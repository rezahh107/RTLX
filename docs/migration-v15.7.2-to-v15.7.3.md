# Migration: RTLX 15.7.2 → 15.7.3

No settings migration or new permission is required.

## Behavior change

RTLX now separates semantic analysis scope from the DOM element mutated for direction. Flex/grid containers with icons, controls, layout roles, or clipping are not used as direction targets. A safe text-bearing descendant is used when available; otherwise the direction mutation is skipped.

## Schema changes

- Runtime Snapshot: `1.4.0` → `1.5.0`
- Element Inspection: `3.0.0` → `3.1.0`
- Failure Element Evidence remains `1.2.0` with additive layout/icon fields.

## Compatibility

Public settings, permissions, profile schema, backup schema, and message protocol remain unchanged.
