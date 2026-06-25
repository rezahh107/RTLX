# RTLX 15.7.2 Architecture Delta

## Protective-only profiles

Qwen and DeepSeek profile version 2 intentionally contains only stable safety hints. The generic deterministic runtime owns discovery, classification, semantic block resolution, and direction decisions. No current-site selector was inferred from the privacy-safe reports because those reports contain no DOM snapshot.

```text
Bundled protective profile
→ code/editor/math/terminal boundaries

Generic runtime
→ discovery
→ text evidence
→ semantic block
→ direction and typography
```

This avoids presenting speculative selectors as verified site truth.

## Safe interactive owner resolution

A nested text node inside a simple anchor or button is resolved to the nearest safe interactive owner. The owner is accepted only when it is text-bearing and contains no complex descendant such as SVG, image, form field, editor, textbox, or live region.

## Context-aware code policy

`classifyCodeContext()` remains authoritative for the distinction:

- block code;
- technical inline code;
- natural RTL inline code;
- natural LTR inline code.

Only block and technical code are treated as typography code zones. Natural-language inline code can inherit the semantic block decision.

## Evidence contracts

RuntimeSnapshot 1.4.0 adds:

- `textDecisionCache` aggregate counters;
- `metricsScope` declarations;
- clarified rule-effectiveness aliases.

ProfileHealth 1.1.0 adds:

- rule category;
- semantic/protective impact;
- profile mode: none, protective-only, or semantic-assisted.

Failure Evidence Report 1.2.0 adds:

- independent `analysis.status` and `analysis.reasonCodes`;
- derived diagnostics for profile health and cleared stale selections;
- effective-setting-derived expectation text.
