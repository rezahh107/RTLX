# RTLX 15.9.4 acceptance criteria

- English locale resolves to `lang="en" dir="ltr"`; Persian resolves to `lang="fa" dir="rtl"`.
- Repeated saturation observations in one episode start one episode and one degradation event.
- A new episode can start only after stable low-watermark recovery.
- Adding a nested element produces that element as a discovery root, not the broad mutation parent.
- Text-node, attribute, and removal changes produce direct candidate work without broad discovery.
- Character-data and non-structural attribute mutations do not reset full text-block enumeration.
- Structural block insertion/removal and protection-boundary attributes do reset enumeration.
- Controlled Chromium smoke ends with degradation level 0, no pending candidate/discovery work, complete text-block coverage, and zero verification failures.
- All deterministic repository gates pass.
