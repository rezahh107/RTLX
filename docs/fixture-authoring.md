# Fixture Authoring

Each fixture directory contains deterministic local HTML and `assertions.json`.

Required metadata:

- stable fixture ID;
- evidence source and verification label;
- exact expected invariants;
- browser capability assumptions;
- whether manual evidence is required.

Synthetic fixtures must be labeled `verified_by_synthetic_fixture` and must not be presented as live-site or real production evidence. Live sites are smoke tests only. Do not include personal data, full URLs with user information, screenshots containing sensitive content, or undocumented browser behavior as a golden assertion.

For a new bug, first add a failing assertion, then implement the narrow fix, run unit/property/security tests, and record affected requirement IDs.
