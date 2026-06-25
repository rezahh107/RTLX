# Migration Guide — RTLX v13 to v14

## Product settings

Settings migrate to schema `2.0.0`. Existing values are preserved where valid. New defaults:

- `inputDirectionAssistant: false`;
- `formFieldDirection: false`;
- `latinFont: "inter"`;
- `settingsScope: "site"`;
- `listRepair` uses the current v14 default.

Amazon Ember is never downloaded. Users selecting `amazon-ember-local` receive Inter fallback when no compatible local face is installed.

## Profiles

Profiles migrate to schema `3.0.0`.

- legacy selector groups are converted into deterministic `ProfileRule` records;
- rule IDs are stable functions of category and selector;
- selectors are sorted and deduplicated;
- the compatibility selector index is regenerated from enabled rules;
- invalid selectors or inconsistent indexes are rejected rather than repaired silently.

Profile export packages advance to `2.0.0`; import accepts supported v13 and v14 packages and normalizes them deterministically.

## Per-conversation settings

No migration to conversation scope occurs automatically. Users explicitly select conversation/workspace scope. The repository stores a local SHA-256 scope key, never the full URL, query, or fragment.

## Browser permissions

- Chrome/Edge may request optional `contextMenus` only after a user gesture.
- Firefox declares required `menus` because Firefox does not support that permission in the same optional-manifest form.
- Chrome/Edge add `sidePanel`; Firefox uses `sidebar_action`.

## Community profiles

Existing unsigned user profiles remain user profiles. They are not promoted to community profiles. Community import requires a signed envelope and a verified bundled public-key registry. With the supplied empty registry, import fails closed.

## Rollback and compatibility

Updating from v13 must trigger normal extension reload cleanup. Owned v13 mutations are not treated as v14 journal entries across reloads; page reload restores source DOM and v14 reprocesses using current settings and profiles.
