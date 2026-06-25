# RTLX 15.9.7 Requirements

## R-1597-01 Canonical background response

Every resolved or rejected background handler result MUST pass the same response contract before `sendResponse`.

## R-1597-02 No silent sanitization

The producer gate MUST NOT remove or coerce invalid values. It MUST return a canonical typed failure with code `RTLX-MESSAGE-005`.

## R-1597-03 Canonical content response

Content responses MUST be canonical before delivery and MUST be revalidated by the background consumer when a response is expected.

## R-1597-04 Safe diagnostic evidence

Bootstrap diagnostics MAY record keys, paths, value-kind labels, request identifiers, target family, and build fingerprint. They MUST NOT record raw settings, DOM, page text, conversation content, selectors, or full URLs.

## R-1597-05 Transport matrix

Response tests MUST include direct objects, JSON stringify/parse, and `structuredClone`.

## R-1597-06 Restart evidence

The Chromium exact-artifact harness MUST verify that `REQUEST_CONTEXT` succeeds after the extension service worker is terminated and restarted.

## R-1597-07 Frozen behavior

Profiles, selectors, permissions, storage schema, direction decisions, typography, streaming, and failure-capture content boundaries MUST remain unchanged.
