# RTLX 15.4.0 Architecture Delta

## Scope

RTLX 15.4 adds a certification layer around the 15.3 runtime. It does not alter the DOM classifier, mutation planner, profile model, permission model, font policy, or rollback semantics.

## Exact artifact execution

`package-release.mjs` creates deterministic ZIPs. `browser-manifest-e2e.mjs` can now receive `RTLX_EXTENSION_ARTIFACT`, validates the target filename, hashes the ZIP, rejects unsafe archive paths, extracts to a temporary directory, and loads that exact content into Chromium-family browsers.

## Evidence chain

Each machine-readable gate remains an observation, never a substituted fact. `evidence-attestation.mjs` hashes:

- the sanitized source tree;
- produced browser artifacts;
- every JSON evidence file.

`verify-evidence-attestation.mjs` rechecks the attestation digest and each evidence hash. Missing browser/device/store evidence remains `not_run` or `insufficient_evidence`.

## Distribution boundary

The store staging workflow is manual-only and stops before upload or publication. Signed artifact verification permits signature-container additions but rejects changed JavaScript, CSS, HTML, JSON, removed files, or unexpected additions.

## Lint warning control

The existing warnings are captured in a versioned reviewed baseline. A new, moved, or newly introduced warning fails `lint:warnings`; global disabling of the relevant security rules is not introduced.
