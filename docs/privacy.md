# Privacy

## Data read locally

The content runtime reads bounded text-node samples, `dir`, `lang`, relevant roles/ARIA state, class names needed for exclusions, root relationships, and limited computed font information for icon protection. It does not read form values.

## Data never transmitted or persisted

- page text;
- full page URL, query string, or fragment;
- form values or keystrokes;
- clipboard content;
- browsing history;
- DOM snapshots, screenshots, canvas, PDF, or image text;
- user identifiers.

## Settings and permissions

Global and per-site preferences are stored in browser extension storage. Optional HTTP/HTTPS host permissions are requested only after a user gesture. Revoking a permission triggers rollback messages to active tabs.

## Diagnostics

Diagnostics contain schema/version, code, severity, requirement ID, scope, timestamp, counts, feature state, and coarse non-sensitive details. Sensitive detail-key names are removed before creation. Persistence is disabled by default. Telemetry is fixed to `false`.

## Remote profiles

Remote profile fetching is disabled in this baseline. Core behavior operates offline with bundled defaults and profiles.
