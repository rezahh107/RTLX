# ADR 0003 — Background-only signed profile verification

- Status: Accepted
- Context: Content frames must not fetch or verify profiles; remote data must never become executable code.
- Decision: Keep strict JSON, canonicalization, key lookup, signature verification, and atomic profile storage in background modules. Remote activation stays disabled until authoritative endpoint/key evidence exists.
- Consequences: Core remains offline-capable and fail-closed.
