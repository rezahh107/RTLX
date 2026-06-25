# Accessibility

## Implemented guards

Form controls, contenteditable regions, textbox/code editor roles, live regions, atomic regions, code, math, editors, terminals, and hard-excluded media are protected from wrapper mutation. Buttons, links, labels, summaries, and custom controls remain mutation-sensitive. Icon-like leaves and known icon-font families are protected from typography overrides.

Profile-defined Code, Math, Editor, Terminal, and Ignore selectors are included in text sampling, tokenization, and typography-protection decisions.

## Smart Picker UI

The picker is extension-owned UI inside an open ShadowRoot. It provides a labelled dialog, native Cancel button, visible highlight that does not receive pointer events, and Escape cancellation. It does not modify selected element attributes or accessible names. The diagnostic result is rendered with text nodes and a definition list.

Popup/options use native controls, logical CSS properties, visible focus indicators, status regions, text labels, responsive widths, and do not communicate state by color alone.

## Automated checks included

Unit tests cover deterministic picker schemas, selector generation, protected classifications, rollback, and visibility admission. Synthetic fixtures exist for controls, live regions, icons, code copy buttons, and rollback.

## Manual release gate not executed

A release still requires keyboard-only checks, picker focus/escape behavior, 200% zoom/reflow, forced colors, text-spacing overrides, accessible-name equality, and at minimum:

```text
NVDA + Firefox
NVDA + Chrome or Edge
```

Automated checks do not replace this gate.
