# Migration Guide — RTLX 15.1.0 to 15.2.0

No user action or Profile Schema migration is required.

## Automatic compatibility

- Existing settings, profiles, diagnostics, history, and v15.1 transaction markers remain readable.
- New transaction markers use schema `2.0.0` in durable local storage. Valid legacy markers are recovered; corrupt or expired markers are discarded deterministically.
- Dynamic content-script registrations are reconciled at startup/update without changing optional host grants.
- Existing tabs establish a new runtime epoch/document handshake when the 15.2 content runtime loads.

## Rollback

Rolling back the extension package does not rewrite user profiles. A pending v2 transaction marker is private internal state; perform rollback only after the extension is idle or after allowing 15.2 startup recovery to complete. Profile export/import remains Schema v3.

## Unchanged behavior

Language scope, semantic direction, font selection, protection zones, permissions, privacy defaults, declarative profiles, and ownership-checked rollback are unchanged.
