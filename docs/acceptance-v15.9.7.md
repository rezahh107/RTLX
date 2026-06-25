# RTLX 15.9.7 Acceptance Criteria

- [ ] A canonical success response is accepted directly, after JSON round-trip, and after structured clone.
- [ ] A response containing `undefined` is rejected with an exact invalid path.
- [ ] Producer rejection yields a canonical `RTLX-MESSAGE-005` response.
- [ ] Request-ID mismatch is rejected.
- [ ] Malformed failure envelopes are rejected.
- [ ] All content-script responses use the canonical producer helper.
- [ ] Background content-response validation rejects non-canonical data.
- [ ] Popup bootstrap report schema is `2.0.0`.
- [ ] Bootstrap report contains no pathname, raw response, settings, DOM, text, or selectors.
- [ ] Existing optional-site omission remains valid under JSON and structured clone.
- [ ] Full typecheck, lint, tests, schemas, profiles, build, manifest, security, and integrity checks pass.
- [ ] Real-browser results are labeled `verified_by_real_browser` or `insufficient_evidence`; build success is not substituted.
