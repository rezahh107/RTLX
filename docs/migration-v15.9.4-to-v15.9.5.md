# Migration: RTLX 15.9.4 to 15.9.5

1. Remove or disable the previous unpacked extension entry.
2. Load the 15.9.5 target directory.
3. Fully reload each target tab once after installation.
4. Existing site settings and profile data require no migration.
5. Consumers of Runtime Snapshot `1.9.0` must support `1.10.0` and the required integer field `captureReadiness.textBlocksProcessingPending`.
6. Historical 15.9.4 reports remain valid historical evidence but cannot certify 15.9.5 behavior.

No permissions, site-profile schema, report privacy field, or user-setting contract changed.
