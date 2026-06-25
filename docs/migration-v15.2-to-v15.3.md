# Migration Guide — RTLX 15.2.0 to 15.3.0

No user action or Profile Schema migration is required.

## Automatic compatibility

- Existing settings, profiles, diagnostics, history, transaction markers, optional host grants, and declarative profile data remain readable.
- On update, RTLX persists an update marker, quiesces automatic mutation work, performs ownership-checked rollback and transaction recovery, then reloads the runtime.
- Existing content scripts establish the current runtime/document handshake after the updated background initializes.
- `storage.sync` writes are serialized and read back; detected conflicts produce hash-only evidence and do not silently merge data.

## Safe Mode

Three consecutive critical initialization failures activate persistent Safe Mode. Automatic page mutation is then disabled, while status, bounded diagnostics, export, rollback, and explicit reset remain available. Three verified healthy initializations clear Safe Mode.

## Firefox packaging

Firefox Desktop and Firefox Android are now separate packages. The Android package omits desktop-only commands, menus, sidebar declarations, and side-panel files. Installing the desktop package on Android is not supported.

## Rollback

Allow update recovery to finish before downgrading. Version 15.3 does not rewrite Profile Schema v3. Internal update/safe-mode/sync evidence records are private extension state and contain no page text or full URLs.
