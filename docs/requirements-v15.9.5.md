# RTLX 15.9.5 Requirements

## Scope

This patch addresses only confirmed DeepSeek runtime failures from RTLX 15.9.4.

## Requirements

- `TEXT-BLOCK-PROCESSING-001`: Every connected text block recorded as discovered MUST remain eligible for processing until recorded as processed or explicitly cancelled.
- `TEXT-BLOCK-PROCESSING-002`: Candidate revision deduplication MUST NOT suppress a discovered unprocessed text block.
- `CAPTURE-READINESS-002`: A runtime snapshot MUST NOT report `ready` or `certificationEligible=true` while any discovered text block remains unprocessed.
- `RUNTIME-SNAPSHOT-1.10.0-001`: Runtime Snapshot `1.10.0` MUST expose `captureReadiness.textBlocksProcessingPending` as a finite non-negative integer.
- `RUNTIME-REBIND-001`: A live content runtime with a stale background epoch MUST be rebound before any programmatic content-script injection is attempted.
- `RUNTIME-REBIND-002`: Rebinding MUST preserve the current content document instance and MUST NOT restart the FrameRuntime.
- `DOCUMENT-IDENTITY-002`: When a browser document ID is available, physical document identity MUST be based on tab, frame, browser document ID, and document generation rather than content-runtime instance ID.
- `REPORT-WORKFLOW-003`: Report creation MUST ensure runtime availability without unconditionally reprocessing a healthy page.

## Non-goals

No classifier, selector, profile, typography, mutation-intake, queue-limit, streaming-policy, permission, or privacy change is authorized by this patch.
