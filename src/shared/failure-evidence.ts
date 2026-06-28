import { canonicalByteLength } from './canonical-json';
import { LIMITS, PRODUCT_VERSION } from './constants';
import type {
  FailureElementEvidence,
  FailureElementEvidenceForReport,
  FailureEvidenceExportBlockedReason,
  FailureEvidenceStatus,
  RecordedFixtureSummary,
  RuntimeSnapshot,
} from './types';

const RESTRICTED_HOSTS = new Set([
  'chromewebstore.google.com',
  'chrome.google.com',
  'microsoftedge.microsoft.com',
  'addons.mozilla.org',
]);

export function failureEvidenceExportBlockedReason(
  snapshot: Pick<RuntimeSnapshot, 'captureReadiness'> | null | undefined
): FailureEvidenceExportBlockedReason | null {
  const readiness = snapshot?.captureReadiness;
  if (!readiness || readiness.status !== 'blocked') return null;
  return readiness.reasonCodes.includes('document_hidden') ||
    readiness.reasonCodes.includes('runtime_inactive')
    ? 'RTLX-CAPTURE-VISIBLE-TAB-REQUIRED'
    : null;
}

export function sanitizeFailureObservation(value: string): string {
  return value.replace(/\r\n?/gu, '\n').trim().slice(0, LIMITS.maxFailureObservationChars);
}

export function classifyPageUrl(value: string | undefined): {
  status: 'eligible' | 'browser_restricted' | 'unsupported_scheme';
  reasonCode: string;
  scheme: string;
  hostname: string | null;
  pathname: string | null;
} {
  if (!value)
    return {
      status: 'unsupported_scheme',
      reasonCode: 'RTLX-CAPTURE-NO-URL',
      scheme: 'unknown',
      hostname: null,
      pathname: null,
    };
  try {
    const url = new URL(value);
    const scheme = url.protocol.replace(/:$/u, '');
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
      return {
        status: 'browser_restricted',
        reasonCode: 'RTLX-CAPTURE-RESTRICTED-SCHEME',
        scheme,
        hostname: url.hostname || null,
        pathname: null,
      };
    const hostname = url.hostname.toLowerCase();
    if (RESTRICTED_HOSTS.has(hostname))
      return {
        status: 'browser_restricted',
        reasonCode: 'RTLX-CAPTURE-RESTRICTED-HOST',
        scheme,
        hostname,
        pathname: url.pathname,
      };
    return {
      status: 'eligible',
      reasonCode: 'RTLX-CAPTURE-ELIGIBLE',
      scheme,
      hostname,
      pathname: url.pathname,
    };
  } catch {
    return {
      status: 'unsupported_scheme',
      reasonCode: 'RTLX-CAPTURE-INVALID-URL',
      scheme: 'unknown',
      hostname: null,
      pathname: null,
    };
  }
}

export function pathnameDepth(pathname: string | null): number {
  if (!pathname) return 0;
  return pathname.split('/').filter(Boolean).length;
}

export function selectFailureConclusion(input: {
  eligibility: 'eligible' | 'browser_restricted' | 'unsupported_scheme' | 'permission_missing';
  contentScriptRegistered: boolean | null;
  contentReachable: boolean;
  contentDeliveryStatus?:
    | 'delivered'
    | 'discarded'
    | 'loading'
    | 'frozen'
    | 'unreachable'
    | 'timeout'
    | 'invalid_response'
    | 'missing_tab'
    | 'not_applicable';
  safeModeActive: boolean;
  runtimeState: string | null;
  degradationLevel: number | null;
  profileId: string | null;
  profileHealthStatus: string | null;
  selected: FailureElementEvidence | null;
  candidateCount: number | null;
}): { status: FailureEvidenceStatus; reasonCode: string } {
  if (input.eligibility === 'browser_restricted' || input.eligibility === 'unsupported_scheme')
    return { status: 'browser_restricted_page', reasonCode: 'RTLX-CAPTURE-RESTRICTED-PAGE' };
  if (input.eligibility === 'permission_missing')
    return { status: 'permission_missing', reasonCode: 'RTLX-CAPTURE-PERMISSION-MISSING' };
  if (input.contentScriptRegistered === false)
    return {
      status: 'content_script_not_registered',
      reasonCode: 'RTLX-CAPTURE-CONTENT-NOT-REGISTERED',
    };
  if (input.safeModeActive)
    return { status: 'safe_mode_active', reasonCode: 'RTLX-CAPTURE-SAFE-MODE' };
  if (!input.contentReachable) {
    const delivery = input.contentDeliveryStatus ?? 'unreachable';
    if (delivery === 'discarded')
      return { status: 'tab_discarded', reasonCode: 'RTLX-CAPTURE-TAB-DISCARDED' };
    if (delivery === 'loading')
      return { status: 'tab_loading', reasonCode: 'RTLX-CAPTURE-TAB-LOADING' };
    if (delivery === 'frozen')
      return { status: 'tab_frozen', reasonCode: 'RTLX-CAPTURE-TAB-FROZEN' };
    if (delivery === 'timeout')
      return { status: 'content_message_timeout', reasonCode: 'RTLX-CAPTURE-CONTENT-TIMEOUT' };
    return { status: 'content_script_unreachable', reasonCode: 'RTLX-CAPTURE-CONTENT-UNREACHABLE' };
  }
  if (input.runtimeState === null)
    return { status: 'runtime_exception', reasonCode: 'RTLX-CAPTURE-RUNTIME-NOT-AVAILABLE' };
  if (input.degradationLevel !== null && input.degradationLevel > 0)
    return { status: 'runtime_degraded', reasonCode: 'RTLX-CAPTURE-RUNTIME-DEGRADED' };
  if (input.profileId === null)
    return { status: 'profile_not_selected', reasonCode: 'RTLX-CAPTURE-NO-PROFILE' };
  if (input.profileHealthStatus === 'no-match')
    return { status: 'profile_rule_no_match', reasonCode: 'RTLX-CAPTURE-PROFILE-NO-MATCH' };
  if (input.candidateCount === 0)
    return {
      status: 'no_rtl_candidate_detected',
      reasonCode: 'RTLX-CAPTURE-NO-RTL-CANDIDATE',
    };
  if (input.selected?.classification.exclusionReason)
    return { status: 'element_hard_excluded', reasonCode: 'RTLX-CAPTURE-ELEMENT-EXCLUDED' };
  if (input.selected?.classification.typographyDecision === 'code-zone')
    return { status: 'element_classified_as_code', reasonCode: 'RTLX-CAPTURE-ELEMENT-CODE' };
  if (input.selected?.classification.typographyDecision === 'editor-zone')
    return { status: 'element_classified_as_editor', reasonCode: 'RTLX-CAPTURE-ELEMENT-EDITOR' };
  return { status: 'captured', reasonCode: 'RTLX-CAPTURE-COMPLETE' };
}

export function isFailureElementEvidence(value: unknown): value is FailureElementEvidence {
  if (!isRecord(value) || value.schemaVersion !== '1.2.0') return false;
  if (
    (value.selector !== null && typeof value.selector !== 'string') ||
    (value.selectorStrategy !== null && typeof value.selectorStrategy !== 'string') ||
    typeof value.tag !== 'string' ||
    (value.role !== null && typeof value.role !== 'string') ||
    !isNullableDir(value.explicitDir) ||
    (value.explicitLang !== null && typeof value.explicitLang !== 'string') ||
    typeof value.contentEditable !== 'boolean' ||
    !isRecord(value.classification) ||
    !isRecord(value.semanticBlock) ||
    !isRecord(value.semanticRegion) ||
    !isRecord(value.textBlock) ||
    !isRecord(value.directionTarget) ||
    !isRecord(value.alignmentTarget) ||
    !isRecord(value.typographyCoverage) ||
    !isRecord(value.computed) ||
    !isRecord(value.layout) ||
    !isRecord(value.directionSource) ||
    !isRecord(value.iconEvidence) ||
    !isRecord(value.font) ||
    !isRecord(value.context) ||
    !isRecord(value.textShape) ||
    !isRecord(value.profileMatch)
  )
    return false;
  const classification = value.classification;
  const semanticBlock = value.semanticBlock;
  const semanticRegion = value.semanticRegion;
  const textBlock = value.textBlock;
  const directionTarget = value.directionTarget;
  const alignmentTarget = value.alignmentTarget;
  const typographyCoverage = value.typographyCoverage;
  const computed = value.computed;
  const layout = value.layout;
  const directionSource = value.directionSource;
  const iconEvidence = value.iconEvidence;
  const font = value.font;
  const context = value.context;
  const textShape = value.textShape;
  const profileMatch = value.profileMatch;
  return (
    typeof classification.language === 'string' &&
    typeof classification.confidence === 'number' &&
    Number.isFinite(classification.confidence) &&
    typeof classification.detectedDirection === 'string' &&
    (classification.exclusionReason === null ||
      typeof classification.exclusionReason === 'string') &&
    typeof classification.typographyDecision === 'string' &&
    typeof classification.directionAction === 'string' &&
    typeof classification.directionReason === 'string' &&
    classification.documentLangUsedAsStrongSignal === false &&
    (classification.notModifiedReason === null ||
      typeof classification.notModifiedReason === 'string') &&
    typeof semanticBlock.tag === 'string' &&
    (semanticBlock.role === null || typeof semanticBlock.role === 'string') &&
    typeof semanticBlock.strategy === 'string' &&
    isNonNegativeInteger(semanticBlock.depth) &&
    Array.isArray(semanticBlock.ancestorKinds) &&
    semanticBlock.ancestorKinds.every((item) => typeof item === 'string') &&
    (semanticBlock.directionTargetTag === null ||
      typeof semanticBlock.directionTargetTag === 'string') &&
    (semanticBlock.directionTargetRole === null ||
      typeof semanticBlock.directionTargetRole === 'string') &&
    typeof semanticBlock.directionTargetStrategy === 'string' &&
    isNonNegativeInteger(semanticBlock.directionTargetDepth) &&
    typeof semanticBlock.layoutSensitive === 'boolean' &&
    (semanticBlock.layoutReason === null || typeof semanticBlock.layoutReason === 'string') &&
    typeof semanticRegion.tag === 'string' &&
    (semanticRegion.role === null || typeof semanticRegion.role === 'string') &&
    typeof semanticRegion.strategy === 'string' &&
    isNonNegativeInteger(semanticRegion.depth) &&
    isNonNegativeInteger(semanticRegion.textBlockCount) &&
    typeof textBlock.tag === 'string' &&
    (textBlock.role === null || typeof textBlock.role === 'string') &&
    typeof textBlock.kind === 'string' &&
    isNonNegativeInteger(textBlock.depth) &&
    (directionTarget.tag === null || typeof directionTarget.tag === 'string') &&
    (directionTarget.role === null || typeof directionTarget.role === 'string') &&
    typeof directionTarget.strategy === 'string' &&
    isNonNegativeInteger(directionTarget.depth) &&
    isNullableDir(directionTarget.explicitDir) &&
    (directionTarget.computedDirection === null ||
      typeof directionTarget.computedDirection === 'string') &&
    (alignmentTarget.tag === null || typeof alignmentTarget.tag === 'string') &&
    (alignmentTarget.role === null || typeof alignmentTarget.role === 'string') &&
    (alignmentTarget.computedTextAlign === null ||
      typeof alignmentTarget.computedTextAlign === 'string') &&
    isNonNegativeInteger(typographyCoverage.inspected) &&
    isNonNegativeInteger(typographyCoverage.eligible) &&
    isNonNegativeInteger(typographyCoverage.targets) &&
    typeof typographyCoverage.continuationPending === 'boolean' &&
    typeof computed.direction === 'string' &&
    typeof computed.unicodeBidi === 'string' &&
    typeof computed.textAlign === 'string' &&
    typeof computed.writingMode === 'string' &&
    typeof computed.whiteSpace === 'string' &&
    typeof computed.display === 'string' &&
    typeof computed.fontFamily === 'string' &&
    typeof computed.flexDirection === 'string' &&
    typeof computed.overflowX === 'string' &&
    typeof computed.overflowY === 'string' &&
    typeof layout.layoutSensitive === 'boolean' &&
    (layout.reason === null || typeof layout.reason === 'string') &&
    typeof layout.containsIcons === 'boolean' &&
    typeof layout.containsControls === 'boolean' &&
    typeof layout.directNaturalText === 'boolean' &&
    ['explicit', 'inherited', 'computed-default'].includes(String(directionSource.kind)) &&
    (directionSource.sourceDepth === null || isNonNegativeInteger(directionSource.sourceDepth)) &&
    (directionSource.sourceTag === null || typeof directionSource.sourceTag === 'string') &&
    (directionSource.sourceDisplay === null || typeof directionSource.sourceDisplay === 'string') &&
    typeof directionSource.sourceOwnedByRtlx === 'boolean' &&
    typeof directionSource.sourceContainsIcons === 'boolean' &&
    typeof directionSource.sourceContainsControls === 'boolean' &&
    typeof iconEvidence.iconProtected === 'boolean' &&
    typeof iconEvidence.hasSvgDescendant === 'boolean' &&
    typeof iconEvidence.hasRoleImgDescendant === 'boolean' &&
    typeof iconEvidence.hasAriaHiddenDescendant === 'boolean' &&
    typeof iconEvidence.beforeContentPresent === 'boolean' &&
    typeof iconEvidence.afterContentPresent === 'boolean' &&
    typeof iconEvidence.beforePrivateUse === 'boolean' &&
    typeof iconEvidence.afterPrivateUse === 'boolean' &&
    (iconEvidence.beforeFontFamily === null || typeof iconEvidence.beforeFontFamily === 'string') &&
    (iconEvidence.afterFontFamily === null || typeof iconEvidence.afterFontFamily === 'string') &&
    (font.fontSetStatus === 'loading' ||
      font.fontSetStatus === 'loaded' ||
      font.fontSetStatus === 'unsupported') &&
    typeof font.fontSetReady === 'boolean' &&
    typeof font.declaredAliasPresent === 'boolean' &&
    font.exactLocalFontUsed === 'unknown' &&
    isNonNegativeInteger(context.iframeDepth) &&
    isNonNegativeInteger(context.shadowRootDepth) &&
    typeof context.sameOriginTopFrame === 'boolean' &&
    typeof textShape.lengthBucket === 'string' &&
    isNonNegativeInteger(textShape.totalCodepoints) &&
    isNonNegativeInteger(textShape.persianLetters) &&
    isNonNegativeInteger(textShape.arabicScriptNonPersianLetters) &&
    isNonNegativeInteger(textShape.latinLetters) &&
    isNonNegativeInteger(textShape.digits) &&
    (profileMatch.profileId === null || typeof profileMatch.profileId === 'string') &&
    (profileMatch.ruleId === null || typeof profileMatch.ruleId === 'string') &&
    Array.isArray(profileMatch.matchedRuleIds) &&
    profileMatch.matchedRuleIds.every((item) => typeof item === 'string') &&
    (profileMatch.group === null || typeof profileMatch.group === 'string') &&
    typeof profileMatch.candidateOwned === 'boolean' &&
    isNonNegativeInteger(profileMatch.ownedWrappers) &&
    isNonNegativeInteger(profileMatch.journalEntries)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}
function isNullableDir(value: unknown): value is 'rtl' | 'ltr' | 'auto' | null {
  return value === null || value === 'rtl' || value === 'ltr' || value === 'auto';
}

export function sanitizeFailureElementEvidenceForReport(
  evidence: FailureElementEvidence
): FailureElementEvidenceForReport {
  const sensitivity = classifySelectorSensitivity(evidence.selector);
  if (sensitivity === 'none')
    return Object.freeze({
      ...evidence,
      selectorPrivacy: Object.freeze({
        status: evidence.selector === null ? 'not_provided' : 'preserved',
        reasonCode:
          evidence.selector === null
            ? 'RTLX-FEC-SELECTOR-NOT-PROVIDED'
            : 'RTLX-FEC-SELECTOR-PRESERVED',
        tokenShape: 'none',
      }),
    });
  return Object.freeze({
    ...evidence,
    selector: null,
    selectorPrivacy: Object.freeze({
      status: 'redacted',
      reasonCode: 'RTLX-FEC-SELECTOR-REDACTED-SENSITIVE-TOKEN',
      tokenShape: sensitivity,
    }),
  });
}

export function isRuntimeSnapshot(value: unknown): value is RuntimeSnapshot {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === '1.10.0' &&
    typeof value.processorVersion === 'string' &&
    typeof value.runtimeInstanceId === 'string' &&
    typeof value.runtimeStartedAt === 'string' &&
    Number.isFinite(Date.parse(value.runtimeStartedAt)) &&
    typeof value.runtimeState === 'string' &&
    typeof value.lifecycleState === 'string' &&
    isNonNegativeInteger(value.lifecycleGeneration) &&
    [0, 1, 2, 3, 4].includes(Number(value.degradationLevel)) &&
    isRecord(value.degradation) &&
    [0, 1, 2, 3, 4].includes(Number(value.degradation.level)) &&
    isNonNegativeInteger(value.degradation.transitions) &&
    isNonNegativeInteger(value.degradation.recoveryTransitions) &&
    (value.degradation.lastTransitionReason === null ||
      typeof value.degradation.lastTransitionReason === 'string') &&
    isRecord(value.degradation.dwellTimeMsByLevel) &&
    Object.values(value.degradation.dwellTimeMsByLevel).every(isNonNegativeInteger) &&
    isRecord(value.provenance) &&
    typeof value.provenance.buildInputHash === 'string' &&
    /^sha256:[a-f0-9]{64}$/u.test(value.provenance.buildInputHash) &&
    (value.provenance.profileHash === null ||
      (typeof value.provenance.profileHash === 'string' &&
        /^sha256:[a-f0-9]{64}$/u.test(value.provenance.profileHash))) &&
    isRecord(value.captureReadiness) &&
    ['ready', 'partial', 'blocked'].includes(String(value.captureReadiness.status)) &&
    Array.isArray(value.captureReadiness.reasonCodes) &&
    value.captureReadiness.reasonCodes.every((item) => typeof item === 'string') &&
    typeof value.captureReadiness.certificationEligible === 'boolean' &&
    isNonNegativeInteger(value.captureReadiness.textBlocksProcessingPending) &&
    isRecord(value.captureStabilization) &&
    typeof value.captureStabilization.attempted === 'boolean' &&
    ['ready', 'partial', 'blocked'].includes(String(value.captureStabilization.initialStatus)) &&
    ['ready', 'partial', 'blocked'].includes(String(value.captureStabilization.finalStatus)) &&
    isNonNegativeInteger(value.captureStabilization.waitedMs) &&
    isNonNegativeInteger(value.captureStabilization.attempts) &&
    typeof value.captureStabilization.timedOut === 'boolean' &&
    isRecord(value.startupReconciliation) &&
    value.startupReconciliation.schemaVersion === '1.0.0' &&
    Object.entries(value.startupReconciliation)
      .filter(
        ([key]) => !['schemaVersion', 'previousRuntimeMarker', 'cleanupPerformed'].includes(key)
      )
      .every(([, current]) => isNonNegativeInteger(current)) &&
    (value.startupReconciliation.previousRuntimeMarker === null ||
      typeof value.startupReconciliation.previousRuntimeMarker === 'string') &&
    typeof value.startupReconciliation.cleanupPerformed === 'boolean' &&
    isRecord(value.detachedWorkPruned) &&
    Object.values(value.detachedWorkPruned).every(isNonNegativeInteger) &&
    isRecord(value.profileHealth) &&
    value.profileHealth.schemaVersion === '1.1.0' &&
    ['none', 'protective-only', 'semantic-assisted'].includes(
      String(value.profileHealth.profileMode)
    ) &&
    isRecord(value.performance) &&
    isRecord(value.streaming) &&
    isRecord(value.backpressure) &&
    isRecord(value.queues) &&
    isRecord(value.discovery) &&
    isRecord(value.typography) &&
    isRecord(value.processing) &&
    isRecord(value.classifications) &&
    isRecord(value.directionDecisions) &&
    isRecord(value.notModifiedReasons) &&
    Array.isArray(value.ruleEffectiveness) &&
    isRecord(value.wrapperLifecycle) &&
    isRecord(value.textDecisionCache) &&
    isRecord(value.processedTextFingerprintCache) &&
    isRecord(value.textBlockCoverage) &&
    isRecord(value.layoutSafety) &&
    isRecord(value.metricsScope) &&
    isRecord(value.fontDiagnostics) &&
    Object.values(value.queues).every(isNonNegativeInteger) &&
    Object.values(value.discovery).every(isNonNegativeInteger) &&
    Object.values(value.typography).every(isNonNegativeInteger) &&
    Object.values(value.processing).every(isNonNegativeInteger) &&
    Object.values(value.classifications).every(isNonNegativeInteger) &&
    Object.values(value.directionDecisions).every(isNonNegativeInteger) &&
    Object.values(value.notModifiedReasons).every(isNonNegativeInteger) &&
    value.ruleEffectiveness.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.ruleId === 'string' &&
        Object.entries(entry)
          .filter(([key]) => key !== 'ruleId')
          .every(([, current]) => isNonNegativeInteger(current))
    ) &&
    Object.values(value.wrapperLifecycle).every(isNonNegativeInteger) &&
    Object.values(value.textDecisionCache).every(isNonNegativeInteger) &&
    Object.values(value.processedTextFingerprintCache).every(isNonNegativeInteger) &&
    isRecord(value.textBlockCoverage.textBlockKinds) &&
    isRecord(value.textBlockCoverage.typographySkipped) &&
    [
      value.textBlockCoverage.semanticRegions,
      value.textBlockCoverage.textBlocksDiscovered,
      value.textBlockCoverage.textBlocksProcessed,
      value.textBlockCoverage.typographyNodesInspected,
      value.textBlockCoverage.typographyNodesEligible,
      value.textBlockCoverage.typographyTargetsPlanned,
      value.textBlockCoverage.typographyContinuationsQueued,
      value.textBlockCoverage.typographyScansCompleted,
      value.textBlockCoverage.typographyContinuationsPending,
    ].every(isNonNegativeInteger) &&
    Object.values(value.textBlockCoverage.textBlockKinds).every(isNonNegativeInteger) &&
    Object.values(value.textBlockCoverage.typographySkipped).every(isNonNegativeInteger) &&
    isNonNegativeInteger(value.layoutSafety.semanticLayoutContainers) &&
    isNonNegativeInteger(value.layoutSafety.uniqueSemanticLayoutContainers) &&
    isNonNegativeInteger(value.layoutSafety.directionTargetsRedirected) &&
    isNonNegativeInteger(value.layoutSafety.uniqueDirectionTargetsRedirected) &&
    isNonNegativeInteger(value.layoutSafety.directionMutationsSuppressed) &&
    isRecord(value.layoutSafety.directionTargetRedirectReasons) &&
    Object.values(value.layoutSafety.directionTargetRedirectReasons).every(isNonNegativeInteger) &&
    value.metricsScope.discovery === 'runtime-lifetime' &&
    value.metricsScope.processing === 'runtime-lifetime' &&
    value.metricsScope.fixtureSummary === 'current-dom' &&
    isRecord(value.pageDebug) &&
    value.pageDebug.schemaVersion === '1.2.0' &&
    typeof value.pageDebug.styleElementPresent === 'boolean' &&
    typeof value.pageDebug.ownedCandidates === 'number' &&
    typeof value.pageDebug.ownedTypographyTargets === 'number'
  );
}

export function isRecordedFixtureSummary(value: unknown): value is RecordedFixtureSummary {
  if (!isRecord(value) || !isRecord(value.counts)) return false;
  return (
    value.schemaVersion === '1.0.0' &&
    value.productVersion === PRODUCT_VERSION &&
    value.textIncluded === false &&
    (value.profileId === null || typeof value.profileId === 'string') &&
    (value.profileVersion === null || isNonNegativeInteger(value.profileVersion)) &&
    Object.values(value.counts).every(isNonNegativeInteger)
  );
}

export function fitsCanonicalBudget(value: unknown, maxBytes: number): boolean {
  try {
    return canonicalByteLength(value) <= maxBytes;
  } catch {
    return false;
  }
}

function classifySelectorSensitivity(
  selector: string | null
): 'none' | 'email_like' | 'account_like' | 'long_numeric' | 'unknown_sensitive' {
  if (selector === null || selector.length === 0) return 'none';
  const normalized = normalizeCssSelectorTokenText(selector);
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu.test(normalized)) return 'email_like';
  if (/\b\d{9,}\b/u.test(normalized)) return 'long_numeric';
  if (containsAccountLikeSelectorToken(normalized)) return 'account_like';
  if (/[\p{Letter}._%+-]{3,}\\40\s*[\p{Letter}\p{Number}.-]{2,}/iu.test(selector))
    return 'email_like';
  return 'none';
}

function normalizeCssSelectorTokenText(value: string): string {
  return value
    .replace(/\\([0-9a-f]{1,6})\s?/giu, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/\\([^0-9a-f])/giu, '$1')
    .normalize('NFKC');
}

function containsAccountLikeSelectorToken(value: string): boolean {
  const lower = value.toLowerCase();
  const markers = [
    'username',
    'account',
    'customer',
    'profile',
    'tenant',
    'client',
    'member',
    'email',
    'acct',
    'user',
  ];
  for (const marker of markers) {
    let offset = 0;
    while (offset < lower.length) {
      const start = lower.indexOf(marker, offset);
      if (start < 0) break;
      const suffix = stripSelectorSeparators(lower.slice(start + marker.length));
      if (hasSensitiveSelectorSuffix(suffix)) return true;
      offset = start + marker.length;
    }
  }
  return false;
}

function stripSelectorSeparators(value: string): string {
  let index = 0;
  while (index < value.length && isSelectorSeparator(value.charAt(index))) index += 1;
  return value.slice(index);
}

function isSelectorSeparator(value: string): boolean {
  return (
    value === '-' ||
    value === '_' ||
    value === ':' ||
    value === '=' ||
    value === '[' ||
    value === ']' ||
    value === '"' ||
    value === "'" ||
    value === '.' ||
    value === '\\'
  );
}

function hasSensitiveSelectorSuffix(value: string): boolean {
  let count = 0;
  for (const char of value) {
    if (!isSelectorTokenCharacter(char)) break;
    count += 1;
    if (count >= 3) return true;
  }
  return false;
}

function isSelectorTokenCharacter(value: string): boolean {
  return /^[\p{Letter}\p{Number}._%+-]$/u.test(value);
}
