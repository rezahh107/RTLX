# Migration Guide — RTLX 15.4.1 to 15.5.0

This is a backward-compatible feature release. Profile Schema v3, settings contracts, extension identity, permissions, and personal-install workflow remain unchanged.

1. Export a personal backup from 15.4.1 as a precaution.
2. Install the 15.5.0 package into the same fixed `current` directory using the personal installer.
3. Reload RTLX in the browser.
4. Run the local health check.
5. On a page where RTLX fails, open the popup, optionally select the broken element, enter expected/actual behavior, preview the report, and download the JSON.

The stable Chromium/Edge extension ID remains `hilpenggipeilpdadnfdaokfocfpapjd`, so normal keyed unpacked updates preserve extension storage when installed over the same extension entry.
