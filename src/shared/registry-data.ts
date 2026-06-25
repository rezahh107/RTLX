import persianSignalsJson from '../../registries/persian-signals.v1.json';
import bidiTokenTypesJson from '../../registries/bidi-token-types.v1.json';
import hardExclusionsJson from '../../registries/hard-exclusions.v1.json';
import performanceBudgetsJson from '../../registries/performance-budgets.v3.json';
import storageBudgetsJson from '../../registries/storage-budgets.v1.json';
import browserCapabilitiesJson from '../../registries/browser-capabilities.v1.json';
import operationalBudgetsJson from '../../registries/operational-budgets.v1.json';

export const PERSIAN_SIGNALS_REGISTRY = Object.freeze({
  distinctCodePoints: Object.freeze([...persianSignalsJson.distinctCodePoints]),
  nonPersianDistinctCodePoints: Object.freeze([...persianSignalsJson.nonPersianDistinctCodePoints]),
  lexicalSignals: Object.freeze([...persianSignalsJson.lexicalSignals]),
  thresholds: Object.freeze({ ...persianSignalsJson.thresholds }),
});

export const BIDI_TOKEN_REGISTRY = Object.freeze(
  Object.fromEntries(
    bidiTokenTypesJson.types.map((entry) => [entry.type, Object.freeze({ ...entry })])
  )
);

export const HARD_EXCLUSIONS_REGISTRY = Object.freeze({
  elements: Object.freeze([...hardExclusionsJson.elements]),
  codeZones: Object.freeze([...hardExclusionsJson.codeZones]),
  mutationSensitive: Object.freeze([...hardExclusionsJson.mutationSensitive]),
  codeZoneHeuristics: Object.freeze({ ...hardExclusionsJson.codeZoneHeuristics }),
});

export const PERFORMANCE_LIMITS_REGISTRY = Object.freeze({
  ...performanceBudgetsJson.runtimeLimits,
});

export const STORAGE_BUDGETS_REGISTRY = Object.freeze({
  ...storageBudgetsJson,
  namespaceBudgets: Object.freeze({ ...storageBudgetsJson.namespaceBudgets }),
  evictionOrder: Object.freeze([...storageBudgetsJson.evictionOrder]),
});

export const BROWSER_CAPABILITIES_REGISTRY = Object.freeze({
  ...browserCapabilitiesJson,
  baseline: Object.freeze({ ...browserCapabilitiesJson.baseline }),
  capabilities: Object.freeze({ ...browserCapabilitiesJson.capabilities }),
  forbidden: Object.freeze([...browserCapabilitiesJson.forbidden]),
});

export const OPERATIONAL_BUDGETS_REGISTRY = Object.freeze({
  ...operationalBudgetsJson,
  evidenceGates: Object.freeze([...operationalBudgetsJson.evidenceGates]),
});
