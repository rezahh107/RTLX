# RTLX 15.9.3 Architecture Delta

This document describes only the confirmed repair delta from 15.9.2.

## Previous failing path

```text
popup preflight snapshot = ready/partial
→ EXPORT_FAILURE_EVIDENCE
→ target document becomes hidden/inactive
→ final content snapshot = blocked
→ background still assembles report
→ popup still creates Blob and downloads JSON
```

## Repaired path

```text
popup preflight
→ EXPORT_FAILURE_EVIDENCE
→ final content snapshot
→ background evaluates final captureReadiness
   ├─ blocked by document_hidden/runtime_inactive
   │    → typed blocked result
   │    → no report assembly
   └─ otherwise
        → existing report assembly unchanged
→ popup routes typed result
   ├─ blocked → visible-tab instruction, no Blob/download
   └─ exported → existing download path
```

## Boundary preservation

The repair does not change content lifecycle, readiness calculation, report schema, canonicalization, direction resolution, typography, profiles, streaming, or mutation behavior. It adds enforcement only at the final export decision and at the popup result router.
