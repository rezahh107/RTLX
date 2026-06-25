# Migration from RTLX 15.9.6 to 15.9.7

1. Remove or disable the previous unpacked build.
2. Load the matching 15.9.7 target directory or package.
3. Reload the target page.
4. Open the popup and confirm the displayed extension version is 15.9.7.
5. Test once with fresh site settings and once with existing site settings.
6. For Chromium/Edge, close and reopen the browser or terminate the service worker from the extensions page, then reopen the popup.
7. If bootstrap fails, download the schema-2.0.0 bootstrap report.

No storage migration is required. Settings schema remains `2.1.0`.
