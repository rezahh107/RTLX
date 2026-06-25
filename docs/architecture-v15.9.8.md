# RTLX 15.9.8 Architecture Addendum

## Contract diagnostics

Healthy request and response envelopes remain unchanged. Provenance is attached only to diagnostic issue objects and bootstrap reports:

- `producer`: `popup`, `content`, `background`, or `unknown`;
- `handlerId`: stable logical handler identifier;
- `messageType`: protocol message type;
- original `requestId`;
- failure boundary and canonical invalid paths/value kinds.

## Canonical recursion limits

Canonical traversal tracks only the active recursion path, allowing repeated acyclic references. A repeated object in separate branches is valid; an active-path revisit is `RTLX-CANONICAL-001`. Depth above 64 is `RTLX-CANONICAL-002`. Both are deterministic `TypeError` failures.

## Transport policy

The manifest remains on Chrome's default JSON messaging mode. A CI guard blocks future `message_serialization: structured_clone` opt-in unless the dedicated suite remains wired into package scripts.

## Exact-artifact evidence

The runtime harness loads the exact release ZIP, records its SHA-256, browser version, stage, and outcome. CDP commands have a 30-second bound and the wrapper has a 180-second bound. Browser interaction failure is evidence, not a pass.
