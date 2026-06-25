# RTLX 15.9.4 architecture delta

This patch changes only mutation intake, candidate admission, candidate-pressure episode tracking, and popup document direction.

```text
MutationRecord
  -> planMutationIntake
     -> precise inserted-element discovery roots
     -> direct nearest-candidate reprocessing for text/attribute/removal changes
  -> CandidateWorkController
     -> unchanged cross-cursor work skipped
     -> mutation-dirty and continuation work admitted
     -> one degradation failure per active candidate-saturation episode
```

Full text-block enumeration state is invalidated only by structural block changes or attributes that can change semantic/protection boundaries. Existing discovery, classification, resolution, mutation planning, journaling, and rollback components remain in place.
