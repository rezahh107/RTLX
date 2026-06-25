# Migration: RTLX 15.6.0 → 15.7.0

## Fresh defaults

New installations use local-first Persian fonts and local Amazon Ember for Latin text. Existing saved user choices remain unchanged.

```json
{
  "persianFont": "local-first",
  "latinFont": "amazon-ember-local"
}
```

No `local-fonts` permission is added and installed fonts are not enumerated. CSS tries approved local family names and falls back to bundled Vazirmatn/Inter.

## Direction behavior

Direction resolution is now text-informed and block-applied. Existing semantic containers are preferred; inline wrappers are reserved for bounded isolation. Block code stays LTR, while natural Persian inline code is no longer treated as technical block code.

## Problem-area reporting

The popup adds **Mark an unfixed area**. This action is report-only:

- it does not create or save a selector rule;
- it does not modify the selected element;
- it stores one privacy-safe decision trace for the next report;
- it does not restore the removed advanced Element Picker.

## Compatibility

Manifest permissions, site activation, settings persistence, rollback contracts, Profile Schema, and Failure Evidence top-level schema remain compatible. Runtime and nested evidence schema versions advance for the added diagnostics.
