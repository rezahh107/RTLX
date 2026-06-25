# RTLX 15.9.4 requirements

- `RTLX-1594-LOCALE-001`: popup `lang` and `dir` shall follow the browser UI locale; Persian shall be RTL.
- `RTLX-1594-PRESSURE-001`: repeated observations of one uninterrupted full candidate queue shall cause at most one degradation failure.
- `RTLX-1594-PRESSURE-002`: a later pressure episode may be counted only after the queue remains below the existing low watermark for the existing stable-recovery interval.
- `RTLX-1594-MUTATION-001`: connected inserted element subtrees shall be preferred over their containing mutation parent as discovery roots.
- `RTLX-1594-MUTATION-002`: text, attribute, and removal changes shall reprocess the nearest candidate without unconditional parent-subtree discovery.
- `RTLX-1594-MUTATION-003`: full text-block enumeration invalidation shall be limited to structural/protection-boundary changes.
- `RTLX-1594-DEDUPE-001`: unchanged candidates already processed in the current runtime shall not be repeatedly admitted by overlapping discovery cursors.
- `RTLX-1594-BOUNDARY-001`: profiles, classifiers, queue limits, permissions, evidence privacy, and report schemas shall not change.
