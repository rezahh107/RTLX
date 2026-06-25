# RTL/Bidi web research notes for RTLX v15.9.11

## Findings

- OpenAI Help documents ChatGPT language settings and lists Persian, Arabic, and Urdu among supported languages, but no official OpenAI technical article was found that specifies DOM selectors, article containers, or CSS contracts for right-to-left rendering inside ChatGPT conversations.
- OpenAI community threads contain user reports about RTL problems in the ChatGPT prompt box, Persian/Farsi output, Arabic/Persian PDF generation, and Arabic/Persian font rendering. These are useful as symptom evidence, not as implementation contracts.
- W3C Internationalization documentation remains the strongest source for RTL/Bidi behavior: use `dir` only where base direction must change, avoid global page flips for mixed UIs, and isolate inline bidirectional runs to avoid spillover.
- MDN documents that `unicode-bidi` works together with `direction`; therefore RTLX should continue using container-level direction and isolation instead of broad page-level mutations.
- For LLM/chat pages, profile strategy should remain narrow: message containers and semantic text blocks get `auto-safe` direction; code/pre/kbd/samp/var/editor/math/terminal zones stay protected and LTR/preserved.

## Applied in v15.9.11

- ChatGPT profile narrowing: `official:chatgpt` rule `rule-ccfde4b9` changed from `code` to `pre code` to avoid matching hundreds of inline code chips while preserving block code through `pre` and runtime code-zone planning.
- No ChatGPT-specific undocumented selector from the web was added. The patch avoids depending on unstable private DOM names beyond the existing bundled profile.
- No RTL heuristic thresholds were changed.
