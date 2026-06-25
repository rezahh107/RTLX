# RTLX v15.2 RH-001–RH-017 Traceability

Status terms distinguish source implementation from executed verification. Browser or long-duration gates are not marked PASS without actual evidence.

| ID     | Requirement                                | Primary implementation                                              | Verification                                                  | Status                                                                |
| ------ | ------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| RH-001 | Restart/update-durable transaction journal | `storage-transaction.ts`, `storage-budgets.v1.json`                 | restart markers, checksum, committed and expired-record tests | implemented; verified_by_unit_test                                    |
| RH-002 | Single-flight initialization               | `lifecycle.ts`                                                      | concurrent entry and serialized reinitialization tests        | implemented; verified_by_unit_test                                    |
| RH-003 | Atomic content-script reconciliation       | `permission-manager.ts`                                             | supersession, in-place update, fallback tests                 | implemented; verified_by_unit_test                                    |
| RH-004 | Trusted-context storage access             | `storage-access.ts`, `api-adapter.ts`                               | supported/unsupported access tests                            | implemented; verified_by_unit_test                                    |
| RH-005 | Storage quota governor                     | `storage-quota-governor.ts`, registry                               | deterministic pruning and hard-limit tests                    | implemented; verified_by_unit_test                                    |
| RH-006 | Document-ID message binding                | `document-registry.ts`, `messages.ts`                               | stale epoch/document/lifecycle tests                          | implemented; verified_by_unit_test                                    |
| RH-007 | Discarded/sleeping tab recovery            | `tab-lifecycle-registry.ts`                                         | deduplicated queued-intent and reload-flush tests             | implemented; verified_by_unit_test                                    |
| RH-008 | Runtime/version handshake                  | `messages.ts`, content/background entry points                      | canonical metadata and stale command tests                    | implemented; verified_by_unit_test                                    |
| RH-009 | Bounded tab broadcast                      | `tab-lifecycle-registry.ts`                                         | 21-tab concurrency test; maximum eight in flight              | implemented; verified_by_unit_test                                    |
| RH-010 | Canonical cross-browser DTO                | `canonical-json.ts`, `api-adapter.ts`, `messages.ts`                | non-JSON/non-finite/size/response validation tests            | implemented; verified_by_unit_test                                    |
| RH-011 | Firefox opaque-frame parity boundary       | `permission-manager.ts`, capability registry, manifest E2E fixtures | fallback source tests; real Firefox frame matrix unavailable  | implemented; insufficient_evidence for real Firefox parity            |
| RH-012 | Alarm lease and missed-run recovery        | `alarm-lease.ts`, `alarm-manager.ts`                                | concurrent dedupe and stale-run tests                         | implemented; verified_by_unit_test                                    |
| RH-013 | Structured errors and circuit breaker      | `runtime-status.ts`, background entry points                        | retry/recovery/circuit tests                                  | implemented; verified_by_unit_test                                    |
| RH-014 | Browser crash injection                    | crash campaign and manifest worker termination                      | environment-dependent                                         | harness implemented; insufficient_evidence until all browsers execute |
| RH-015 | Chromium/Edge/Firefox manifest E2E         | manifest harness and browser-evidence workflow                      | environment-dependent                                         | harness implemented; insufficient_evidence until all browsers execute |
| RH-016 | Eight-hour multi-tab soak                  | bounded soak harness and performance registry                       | local bounded campaign only                                   | instrumentation implemented; full gate insufficient_evidence          |
| RH-017 | Browser-specific performance thresholds    | performance/storage registries and reports                          | requires pinned hardware/browser matrix                       | proposed acceptance target; insufficient_evidence                     |

## Conflict assessment

No RH requirement changes RTLX SSOT 12.0.0, Profile Schema v3, language scope, font policy, optional-host model, or ownership-checked rollback.
