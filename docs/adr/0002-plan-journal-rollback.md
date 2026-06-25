# ADR 0002 — Immutable mutation plans and in-memory rollback journal

- Status: Accepted
- Context: DOM changes must be attributable, idempotent, and safely reversible without site bookkeeping attributes.
- Decision: Analysis creates typed plans; the applier validates preconditions and commits journal entries; rollback runs committed entries in reverse.
- Consequences: More modules and explicit sequencing, but safe ownership and testable rollback.
- Alternatives rejected: direct analyzer mutations and `data-*` version attributes.
