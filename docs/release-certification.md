# Release Certification Procedure

1. Build deterministic release artifacts twice and compare SHA-256 values.
2. Execute the exact ZIP artifact in each supported browser environment.
3. Record command, exit code, browser version, artifact hash and sanitized observations.
4. Run crash, update/rollback, soak, performance, Edge policy, Firefox Android and accessibility campaigns.
5. Aggregate statuses without converting missing evidence into PASS.
6. Produce and verify `release-attestation.json`.
7. Upload only through a protected manual staging environment.
8. Verify the signed/repacked artifact before staged rollout.
9. Rehearse rollback before stable publication.
