# Security

## Trust boundaries

Untrusted inputs include page DOM, content-origin messages, picker selections, imported profiles, stored settings, bundled/remote profile data, and signed envelopes. Background privileges are not exposed through external messaging.

## Message authorization

Messages are exact discriminated unions with a byte limit. Authorization is command-specific:

- diagnostics, suspicious-direction reports, and picker selections require an authenticated content sender with a tab and matching hostname;
- settings, permissions, profile import/export/delete, picker start, and site toggle require an extension-page sender;
- context requests from content require sender hostname equality;
- unknown fields and unknown commands are rejected.

## Controls

- strict MV3 CSP; no inline/eval/remote executable code;
- minimal permissions and user-granted optional host access;
- no `innerHTML` sinks in runtime bundles;
- deterministic selector generation and selector safety validation;
- strict JSON parser with duplicate-key rejection;
- Profile v2 and export-package schemas;
- RFC 8785-compatible canonicalization for supported JSON values;
- WebCrypto ECDSA P-256/SHA-256 verification;
- key validity/revocation, envelope/payload binding, and anti-rollback;
- local bundled profile fallback;
- bounded message, profile, selector, token, wrapper, queue, and task resources;
- release scan for prohibited dynamic code and forbidden permissions.

## STRIDE summary

- **Spoofing:** extension ID, sender context, tab, and hostname validation.
- **Tampering:** signed profile envelopes, exact package versions, font/artifact hashes.
- **Repudiation:** text-free diagnostic codes and deterministic build reports.
- **Information disclosure:** no page text transfer or persistence; telemetry remains false.
- **Denial of service:** bounded roots, selectors, nodes, tokens, wrappers, queues, slices, and imports.
- **Elevation of privilege:** no externally connectable interface and command-specific authorization.

## Remaining evidence

Production remote-profile activation still requires an authoritative HTTPS endpoint and approved production P-256 key lifecycle. Full malicious-page E2E, store review, and formal disposition of development-only audit advisories remain release evidence, not implementation assumptions.
