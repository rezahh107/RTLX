# Migration Guide — RTLX 15.4.0 to 15.4.1

## Recommended personal installation layout

Use one fixed directory for the browser entry:

```text
RTLX/
  current/          <- load this directory once in Developer Mode
  previous/         <- automatic rollback copy
  releases/         <- optional archive
```

## Upgrade steps

1. Open RTLX 15.4.0 Options and export any existing profiles or diagnostics you want to retain.
2. Build or use the 15.4.1 Chromium/Edge ZIP.
3. Run the local installer with the ZIP, a fixed parent directory, and optionally the published SHA-256 value.
4. In `chrome://extensions` or `edge://extensions`, keep the existing unpacked entry when possible and click **Reload**.
5. Confirm the displayed extension ID is `hilpenggipeilpdadnfdaokfocfpapjd`.
6. Open Options and run **Health check**.
7. Export a complete personal backup after verifying settings.

If 15.4.0 was previously loaded without a manifest key, installing 15.4.1 can create a different Chromium-family extension ID on the first keyed installation. Export important state before removing the old entry, then import it through the 15.4.1 dry-run flow. Subsequent keyed builds keep the ID stable.

## Backup restore rules

- Run dry-run first.
- Permission hints are shown but never auto-granted.
- Safe Mode and transaction/update markers are never restored.
- Diagnostics are excluded by default.
- A backup from a newer RTLX version is rejected.
