# Browser E2E evidence boundary

The 25 versioned HTML fixtures are present under `tests/fixtures`, but a real-extension browser harness is not represented as passed evidence in this repository snapshot. Release validation must load `dist/chromium` in Chrome and Edge, and `dist/firefox` through `web-ext` in Firefox. Results must identify browser versions, fixture IDs, screenshots where applicable, and extension-load evidence. Playwright Firefox without WebExtension loading is not sufficient.
