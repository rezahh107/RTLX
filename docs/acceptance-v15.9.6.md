# RTLX 15.9.6 Acceptance

## Deterministic acceptance cases

1. `<li><p>متن فارسی</p></li>` keeps the paragraph as the text direction target and resolves the `<li>` as the marker owner.
2. RTL direction planning adds `dir="rtl"` and the RTLX direction-owner attribute to the marker-owning `<li>` when it has no explicit direction.
3. `<li dir="ltr"><p>متن فارسی</p></li>` preserves the explicit list-item direction.
4. Disabling list repair prevents marker-owner mutation.
5. Nested lists resolve the nearest `<li>` only.
6. Marker CSS targets only list items carrying the RTLX direction-owner attribute.
7. Controlled Chromium confirms nested list-item direction and `::marker` computed direction are RTL.
8. Inline code inside the RTL list item remains LTR.
9. Rollback removes RTLX-owned list direction without changing host-owned explicit direction.

## Release gates

- TypeScript compilation: pass.
- Unit/property/security tests: pass.
- Coverage run: pass.
- Format, ESLint, and warning baseline: pass.
- Schemas and bundled profiles: pass.
- Controlled Chromium smoke with nested list marker assertions: pass.
- Four browser packages: build successfully.
- Release manifests and deterministic integrity verification: pass.
- Production and complete dependency audits: zero high-severity failures.

## External boundary

A real DeepSeek screenshot and runtime report from RTLX 15.9.6 are required before claiming final visual effectiveness in the user environment.
