# RTLX 15.8.1 Requirements

## Runtime correctness

- `TEXT-BLOCK-ENUMERATION-001`: Text-block enumeration MUST continue beyond 512 descendant elements without loss, duplication, or order change.
- `TEXT-BLOCK-ENUMERATION-002`: Exact boundary sizes 511, 512, and 513 MUST be distinguishable deterministically.
- `TEXT-BLOCK-ENUMERATION-003`: Runtime processing MUST NOT declare a semantic region complete while its enumeration cursor has remaining work.
- `TYPOGRAPHY-CACHE-001`: Typography cache validity MUST depend on current protection state and deterministic DOM context, not text alone.
- `TYPOGRAPHY-CACHE-002`: Both `eligible → protected` and `protected → eligible` transitions MUST invalidate a prior fingerprint.
- `TYPOGRAPHY-PROTECTION-RECONCILIATION-001`: An RTLX-owned typography class MUST be removed when its target becomes protected.
- `TYPOGRAPHY-PROTECTION-RECONCILIATION-002`: Reconciliation MUST remove only a class addition traceable to a committed RTLX journal entry.
- `TYPOGRAPHY-PROTECTION-RECONCILIATION-003`: Reconciliation MUST remain bounded and resumable.

## Evidence correctness

- `RTLX-COVERAGE-003`: Pending text-block enumerations MUST be represented in runtime evidence and failure diagnostics.
- `RTLX-COVERAGE-004`: Pending typography protection reconciliations MUST be represented in runtime evidence and failure diagnostics.
- `EXTERNAL-EVIDENCE-STATUS-001`: Creating `not_run` placeholder reports MUST NOT produce an overall `passed` status.
- `EXTERNAL-EVIDENCE-STATUS-002`: An unresolved external gate set MUST return `blocked` with process exit code `2`.

## Release integrity

- `RELEASE-INTEGRITY-001`: The final artifact manifest MUST be generated after artifact creation.
- `RELEASE-INTEGRITY-002`: Every manifest record MUST contain exact relative path, byte size, and SHA-256.
- `RELEASE-INTEGRITY-003`: Verification MUST reject missing, duplicate, extra, size-mismatched, and hash-mismatched files.
- `RELEASE-INTEGRITY-004`: Repeated packaging from identical source MUST produce identical package SHA-256 values.

## Dependency security

- `DEPENDENCY-AUDIT-001`: Production dependency audit MUST contain zero high or critical findings.
- `DEPENDENCY-AUDIT-002`: Complete dependency audit MUST contain zero high or critical findings.

## Non-regression

All RTLX 15.8 requirements remain active unless explicitly superseded above. No browser permission, privacy boundary, profile authority, or ownership contract may be broadened by this patch.
