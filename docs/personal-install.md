# RTLX Personal Installation and Maintenance

## One-time browser setup

1. Build the target with `npm run package:personal` or use the provided Chromium/Edge ZIP.
2. Install it into a fixed directory with `install-personal.ps1` on Windows or `install-personal.sh` on Unix-like systems.
3. Enable Developer Mode in the browser extensions page.
4. Choose **Load unpacked** and select the fixed `current` directory.
5. Do not load a version-numbered release directory directly.

## Updates

Run the installer against the new ZIP, then click **Reload** on the existing unpacked extension entry. The installer verifies the package before replacing `current` and retains the previous working directory for rollback.

## Backup

Use Options → Personal installation → Export complete backup. Import always supports dry-run. Permissions must be granted again through the normal browser prompt when needed.

## Health states

- `healthy`: no known local consistency or recovery issue.
- `degraded`: a bounded issue exists but normal recovery remains possible.
- `safe_mode`: automatic DOM mutation is disabled.
- `recovery_required`: unfinished or inconsistent local state requires recovery.
- `insufficient_evidence`: a browser capability prevented a conclusive local check.
