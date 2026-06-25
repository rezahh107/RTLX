# RTLX 15.9.6 Architecture Note

## Marker owner separation

Text ownership and list-marker ownership are modeled separately:

```text
text block: paragraph or other nested block
list marker owner: nearest connected li
```

`resolveDirectionTarget()` continues to return the existing text and alignment targets and now also returns `listMarkerElement`.

## Mutation boundary

`planMutations()` applies marker-owner direction only when:

- list repair is enabled;
- the resolved action identifies RTL or LTR candidate direction, or preserves an explicit text-target direction;
- the marker owner is different from the text direction target;
- the marker owner has no explicit `dir`.

The marker direction operation is journaled with `LIST-MARKER-DIRECTION-001` and receives the normal RTLX direction-owner marker for rollback.

## CSS scope

`::marker` direction and bidi isolation selectors are restricted to list items carrying the RTLX direction-owner attribute. Host-owned list items are not selected.

## Preserved boundaries

The patch does not change enumeration, language resolution, profile resolution, streaming, queue scheduling, or evidence schemas.
