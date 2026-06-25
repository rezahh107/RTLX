# Site Profile Authoring — v14

Profiles are declarative data conforming to `schemas/site-profile.schema.json` version `2.0.0`.

## No manual selector requirement

End users create selectors through the Smart Element Picker. The picker generates bounded candidates from stable IDs, allowlisted data attributes, stable classes, and limited structural paths. It validates uniqueness in the current root. No options or popup field accepts handwritten CSS.

## Selector groups

- `content`
- `exclude`
- `code`
- `math`
- `editor`
- `terminal`
- `mutationSensitive`

Profiles cannot remove hard exclusions. All selectors are validated before storage or use.

## Restrictions

Profiles cannot contain JavaScript, HTML, CSS declarations, event handlers, executable URLs, arbitrary dispatch names, permission requests, telemetry controls, closed-shadow enablement, or hard-exclusion removal. The profile has at most 128 selectors in total and each selector has at most 256 characters. Pseudo-elements, `:has()`, universal-only selectors, and `html`/`body` targeting are rejected.

## Precedence

```text
hard safety locks
→ explicit per-site settings
→ user picker profile
→ bundled offline profile
→ valid newer remote profile when explicitly enabled and fully verified
→ generic defaults
```

Remote profile activation remains disabled while the production endpoint/key evidence is absent.

## Bundled profile workflow

1. Add a strict Profile v2 file under `profiles/bundled/`.
2. Add the filename to `profiles/bundled/index.json` in lexical order.
3. Record source and actual verification state in `metadata`.
4. Add deterministic positive and malformed fixtures.
5. Run `npm run validate:profiles`, tests, and browser fixtures.
6. Never label a synthetic or live-smoke profile as verified by a real fixture.

## User profile export/import

Options exports canonical JSON using stable sorting and RFC 8785-compatible serialization for supported values. Import uses duplicate-key rejection, byte limits, Profile v2 validation, selector validation, profile-count limits, and deterministic version merge.

Strict legacy Profile v1 data is migrated by the versioned normalizer. Unknown shapes are rejected.

## Signing

Use `npm run profile:sign` with a P-256 private JWK, explicit key ID, and explicit UTC validity interval. The private key must remain outside the repository. The verifier enforces byte size, strict JSON, exact envelope keys, UTC timestamps, key validity/revocation, payload schema, selector safety, identity binding, anti-rollback, RFC 8785 canonicalization, and ECDSA P-256/SHA-256.
