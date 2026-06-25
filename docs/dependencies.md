# Dependency Justification

All versions are exact and recorded in `package-lock.json`.

- `typescript`, `esbuild`: strict compilation and browser bundles.
- `vitest`, `@vitest/coverage-v8`, `fast-check`: unit, coverage, and permutation/property tests.
- `eslint`, TypeScript/security/no-unsanitized plugins, `prettier`: static quality and sink checks.
- `ajv`: build-time JSON Schema compilation and fixture validation.
- `css-tree`: standards-oriented selector parsing in a DOM-free background context.
- `fontkit`: build-time WOFF2 cmap inspection and reproducible Unicode-range generation.
- `@fontsource/vazirmatn`, `@fontsource/inter`: pinned OFL font sources copied into builds.
- `fflate`: deterministic release ZIP generation with fixed timestamps.
- `linkedom`: unit-test DOM only; not bundled into the extension.
- `@types/*`: compile-time declarations only.

No production bundle loads a library from a CDN or executes postinstall code.

## v15.2 verification toolchain

`vitest` and `@vitest/coverage-v8` are pinned to `4.1.8`. The v4 single-worker configuration uses `maxWorkers: 1` and `isolate: false`; removed `poolOptions` flags are not used. Final production and full dependency audits report zero vulnerabilities.
