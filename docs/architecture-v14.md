# RTLX v14 Architecture Delta

## Authority and scope

RTLX-SSOT 12.0.0 remains authoritative. This document describes additive v14 behavior approved by the user. It does not amend or weaken `LOCK-001` through `LOCK-015`.

The language scope is Persian and English. Other RTL languages are negative-classification fixtures, not target language packs.

## Browser presentation

```text
Chrome / Edge Side Panel ─┐
Firefox sidebar ──────────┼─> validated extension messages ─> Background Runtime
Popup / Options ──────────┘
                                                     │
                                                     ▼
                                           Content Runtime per frame
```

The presentation layer does not analyze page DOM. Smart Picker and selected-element diagnostics execute inside the content runtime and return bounded structured data.

## Profile Schema v3

Each profile contains deterministic `rules`:

```typescript
interface ProfileRule {
  ruleId: string;
  selector: string;
  category: 'content' | 'code' | 'math' | 'editor' | 'terminal' | 'ignore';
  enabled: boolean;
  directionMode: 'auto-safe' | 'force-rtl' | 'force-ltr' | 'preserve';
  alignmentMode: 'start' | 'preserve';
  typographyMode: 'persian-only' | 'preserve';
  initialDelayMs: number;
}
```

`selectors` remains as a deterministic derived compatibility index. Validation rejects disagreement between `rules` and `selectors`.

## Selector generation

The picker generates bounded candidates from:

1. stable unique ID;
2. allowlisted stable data attribute;
3. exact element selector;
4. nearest semantic parent;
5. nearest repeated item;
6. bounded structural path.

Candidates are validated, deduplicated, ranked deterministically, and previewed. There is no manual selector input.

## Settings scope

Site settings may use `site` or `conversation` scope. Conversation scope derives a bounded key from approved pathname segments and stores only a local SHA-256 digest. Query, fragment, and full URL are not stored. Missing or unsuitable path evidence falls back to site scope.

## Persian/English direction

- positively classified Persian → `dir="rtl"` where decision rules permit;
- positively classified Latin → `dir="ltr"` in the opt-in editable assistant;
- Arabic/Urdu/Hebrew/unknown → `dir="auto"` for editable assistant and no Persian typography;
- explicit local `dir` remains authoritative;
- `html` and `body` remain mutation-prohibited.

## Typography

The mixed family uses non-overlapping coverage:

- Vazirmatn for Persian/Arabic-script glyph coverage;
- Inter for Latin coverage;
- optional Amazon Ember local face for Latin coverage only;
- Inter/system fallback when Amazon Ember is not locally installed.

No Amazon font binary, CDN, fetch, or build download exists.

## Input Direction Assistant

The assistant is opt-in and applies only to eligible selected form/editor fields. It:

- observes input events without reading or persisting form values outside the local event handler;
- updates only owned `dir` state;
- preserves selection, composition, value, and event listeners;
- uses Persian/Latin classification and returns `auto` otherwise;
- journals mutations for rollback.

## List repair

List repair uses only logical properties and isolated markers inside owned Persian candidates. It does not rebuild list DOM or globally force `list-style-position`.

## Context menu override

Temporary override modes are Content, LTR, and Ignore. The target is the last locally captured context-menu element. Overrides are session-only and journaled; they are not silently persisted into a profile.

## Community profile boundary

```text
Import file
→ message size check
→ strict duplicate-key JSON
→ exact envelope schema
→ UTC/key validity/revocation
→ RFC 8785 payload canonicalization
→ ECDSA P-256/SHA-256
→ profile schema and selector safety
→ envelope identity and anti-rollback
→ provenance check
→ atomic local commit
```

The bundled key registry is empty and `insufficient_evidence`; imports therefore fail closed until a production key lifecycle is supplied.

## Platform separation

- Chromium/Edge: module service worker, native Side Panel, optional user-granted `contextMenus`.
- Firefox: module background scripts/event page, `sidebar_action`, required `menus` permission, no Chromium Side Panel reference in the bundle.
