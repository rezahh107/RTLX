# Migration: RTLX 15.5.5 → 15.6.0

## User-visible changes

- The options page, side panel, element picker, and developer controls are removed.
- All daily controls are consolidated into the popup.
- The popup gains Persian and English font selection and an explicit reset for old site rules.
- Persian is right-aligned and English is left-aligned when classification is sufficiently confident.

## Stored legacy rules

Legacy picker-created profiles are not executed by the focused runtime. They are not silently deleted. Use **Reset old settings/rules for this site** to delete the site's user profile and scoped settings permanently.

## Settings migration

Settings schema moves from `2.0.0` to `2.1.0` by adding:

```json
{
  "persianFont": "vazirmatn-bundled"
}
```

Default English selection is `amazon-ember-local`, with bundled Inter fallback.

## Amazon font behavior

No Amazon font file is migrated or bundled. Install Amazon Ember Display on Windows if local use is desired; otherwise RTLX automatically uses Inter for Latin glyphs.
