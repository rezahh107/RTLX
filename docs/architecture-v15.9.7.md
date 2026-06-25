# RTLX 15.9.7 Messaging Architecture Delta

## Background path

```text
request
→ request canonical validation
→ authorization
→ handler
→ response canonical contract
→ sendResponse
```

A handler may still produce a programming error. The response gate does not repair it. It replaces the invalid transport value with a small canonical failure envelope.

## Popup/content consumer path

```text
browser response
→ canonical JSON validation
→ envelope validation
→ request-ID correlation
→ typed result or ExtensionResponseContractError
```

## Content command response path

```text
content handler
→ content producer canonical check
→ tabs.sendMessage transport
→ background canonical check
→ typed delivery result
```

## Diagnostic boundary

Only structural metadata is exported. No raw response object is included.

## Frozen modules

Candidate discovery, classification, direction, bidi isolation, typography, profiles, storage schema, permissions, and streaming remain outside this change.
