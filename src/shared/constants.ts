import { PERFORMANCE_LIMITS_REGISTRY } from './registry-data';

export const PRODUCT_VERSION = '15.9.11' as const;
export const BUILD_FLAVOR = 'no-font-binaries' as const;
export const SETTINGS_SCHEMA_VERSION = '2.1.0' as const;
export const DIAGNOSTIC_SCHEMA_VERSION = '1.0.0' as const;
export const PROFILE_SCHEMA_VERSION = '3.0.0' as const;
export const PROCESSOR_VERSION = '15.9.11' as const;
export const FIREFOX_MIN_VERSION = '140.0' as const;
export const FIREFOX_EXTENSION_ID = '{c70856f4-3b2c-4c21-a94f-b5a9172c46ac}' as const;
export const LIMITS = Object.freeze({
  maxInitialRoots: 100,
  maxDiscoveryNodes: 5000,
  maxSampleCodepointsPerCandidate: 4096,
  maxSliceMs: 8,
  maxTextNodesPerSlice: 50,
  idleMinRemainingMs: 2,
  maxShadowRootsPerFrame: 100,
  maxNestedShadowDepth: 20,
  maxWrappersPerDocument: 500,
  maxTokensPerTextNode: 32,
  maxPendingRoots: 500,
  maxTextNodeUtf16Length: 20000,
  maxMutationsPerBatch: 1000,
  maxMessageBytes: 2560 * 1024,
  maxCanonicalJsonDepth: 64,
  maxRemoteProfileBytes: 256 * 1024,
  selectorMaxCount: 128,
  selectorMaxLength: 256,
  maxUserProfiles: 100,
  maxProfileExportBytes: 512 * 1024,
  maxPersonalBackupBytes: 2 * 1024 * 1024,
  maxFailureObservationChars: 2000,
  maxFailureEvidenceDiagnostics: 50,
  maxFailureEvidenceBytes: 512 * 1024,
  maxFailureEvidenceRuntimeSnapshotBytes: 128 * 1024,
  maxFailureEvidenceFixtureSummaryBytes: 64 * 1024,
  maxFailureEvidenceSelectedElementBytes: 32 * 1024,
  maxFailureEvidenceProfileEvidenceBytes: 32 * 1024,
  maxFailureEvidenceContentTimeoutMs: 8000,
  maxPickerCandidates: 8,
  maxRuleDelayMs: 5000,
  maxProfileRules: 128,
  maxConversationScopePathLength: 512,
  profileHealthMaxMatchesPerRule: 250,
  profileHistoryMaxSnapshots: 10,
  streamingQuietWindowMs: 80,
  streamingMaxWaitMs: 400,
  streamingMaxQueuedRoots: 100,
  ...PERFORMANCE_LIMITS_REGISTRY,
});
export const OWNED_CLASS = 'rtlx-owned-candidate';
export const TYPOGRAPHY_CLASS = 'rtlx-owned-typography';
export const DIRECTION_RTL_CLASS = 'rtlx-direction-rtl';
export const DIRECTION_LTR_CLASS = 'rtlx-direction-ltr';
export const OWNED_WRAPPER_CLASS = 'rtlx-owned-bdi';
export const SESSION_IGNORE_CLASS = 'rtlx-session-ignore';
export const STYLE_ELEMENT_ID = 'rtlx-v17-style';
export const DIRECTION_STYLE_ELEMENT_ID = 'rtlx-v17-direction-style';
export const PICKER_HOST_ID = 'rtlx-v17-issue-host';
export const RUNTIME_OWNER_ATTRIBUTE = 'data-rtlx-runtime-owner';
export const DIRECTION_OWNER_ATTRIBUTE = 'data-rtlx-dir-owner';
export const PROFILE_UPDATE_ALARM = 'rtlx-profile-update-v1';
export const REMOTE_PROFILE_ENDPOINT: null = null;
