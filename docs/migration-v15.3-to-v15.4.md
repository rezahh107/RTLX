# Migration: RTLX 15.3.0 to 15.4.0

No user settings, Profile Schema v3 data, permissions, language behavior, or font assets require migration.

Repository maintainers should:

1. run `npm ci --ignore-scripts`;
2. run `npm run check`;
3. create packages with `npm run build:release`;
4. run exact-artifact E2E with `npm run test:artifact-e2e:chromium` and Edge in its target environment;
5. aggregate gate evidence with `npm run evidence:gates`;
6. create and verify the attestation with `npm run evidence:attest` and `npm run evidence:verify`;
7. use the protected manual store-staging workflow; never publish from a development branch.

Existing 15.3 installations continue to use the same runtime data contracts.
