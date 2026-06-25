# ADR 0001 — Separate Chromium and Firefox background manifests

- Status: Accepted
- Context: The SSOT requires a service worker on Chromium and background scripts/event page on Firefox.
- Decision: Generate two manifests and reuse a shared bundled `background.js` ES module.
- Consequences: Packaging and validation are target-specific; a common ambiguous manifest is avoided.
- Alternatives rejected: one shared `background.service_worker` manifest, because it violates the frozen Firefox contract.
