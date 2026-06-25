import { LIMITS, PRODUCT_VERSION } from './constants';
import { isUntrustedDiagnostic } from './diagnostics';
import { isFailureElementEvidence } from './failure-evidence';
import { validateSelectors } from './selector-validator';
import { isRecord, validateSettings } from './settings';
import type {
  Diagnostic,
  ElementKind,
  FailureElementEvidence,
  PerSiteSettings,
  PickerSelection,
  ProfileRule,
  QuickOverrideMode,
  Settings,
  SiteMode,
} from './types';

export const MESSAGE_PROTOCOL_VERSION = '1.0.0' as const;

export interface MessageMetadata {
  protocolVersion: typeof MESSAGE_PROTOCOL_VERSION;
  extensionVersion: typeof PRODUCT_VERSION;
  documentInstanceId: string;
  documentGeneration: number;
  runtimeEpoch: string | null;
}

let configuredRuntimeEpoch: string | null = null;
let documentInstanceId: string | null = null;

export function configureMessageRuntimeEpoch(epoch: string | null): void {
  configuredRuntimeEpoch = epoch;
}

export function currentDocumentInstanceId(): string {
  documentInstanceId ??= crypto.randomUUID();
  return documentInstanceId;
}

export function resetMessageContextForTests(): void {
  configuredRuntimeEpoch = null;
  documentInstanceId = null;
}

export function createMessageMetadata(): MessageMetadata {
  return Object.freeze({
    protocolVersion: MESSAGE_PROTOCOL_VERSION,
    extensionVersion: PRODUCT_VERSION,
    documentInstanceId: currentDocumentInstanceId(),
    documentGeneration: 1,
    runtimeEpoch: configuredRuntimeEpoch,
  });
}

export type RulePatch = Partial<
  Pick<
    ProfileRule,
    'enabled' | 'directionMode' | 'alignmentMode' | 'typographyMode' | 'initialDelayMs'
  >
>;
type RequestPayload =
  | Readonly<{
      type: 'REQUEST_CONTEXT';
      requestId: string;
      payload: { hostname: string; pathname: string };
    }>
  | Readonly<{ type: 'UPDATE_SETTINGS'; requestId: string; payload: { settings: Settings } }>
  | Readonly<{
      type: 'UPDATE_SITE_SETTINGS';
      requestId: string;
      payload: { hostname: string; pathname: string; settings: PerSiteSettings };
    }>
  | Readonly<{
      type: 'APPLY_CURRENT_TAB' | 'ENSURE_CURRENT_TAB_RUNTIME' | 'ROLLBACK';
      requestId: string;
      payload: { tabId: number };
    }>
  | Readonly<{
      type: 'TEMPORARY_DISABLE';
      requestId: string;
      payload: { tabId: number; hostname: string; minutes: number };
    }>
  | Readonly<{
      type: 'RESET_TEMPORARY_DISABLE' | 'DELETE_USER_PROFILE';
      requestId: string;
      payload: { hostname: string };
    }>
  | Readonly<{
      type: 'GET_STATUS' | 'TOGGLE_SITE_DISABLED';
      requestId: string;
      payload: { tabId: number; hostname: string; pathname: string };
    }>
  | Readonly<{
      type: 'REPORT_DIAGNOSTICS';
      requestId: string;
      payload: { diagnostics: Diagnostic[] };
    }>
  | Readonly<{
      type:
        | 'REPORT_SUSPICIOUS_DIRECTION'
        | 'EXPORT_DIAGNOSTICS'
        | 'RESET_SETTINGS'
        | 'LIST_USER_PROFILES'
        | 'EXPORT_USER_PROFILES'
        | 'GET_COMMUNITY_CATALOG'
        | 'GET_OPERATIONAL_STATUS'
        | 'RESET_SAFE_MODE'
        | 'RUN_PERSONAL_HEALTH_CHECK'
        | 'EXPORT_PERSONAL_SUPPORT_BUNDLE'
        | 'CLEAR_DIAGNOSTICS'
        | 'ATTEMPT_PERSONAL_RECOVERY';
      requestId: string;
      payload: {};
    }>
  | Readonly<{
      type: 'START_PICKER';
      requestId: string;
      payload: { tabId: number; kind: ElementKind };
    }>
  | Readonly<{
      type: 'START_FAILURE_PICKER';
      requestId: string;
      payload: { tabId: number };
    }>
  | Readonly<{
      type: 'SAVE_FAILURE_ELEMENT_EVIDENCE';
      requestId: string;
      payload: { evidence: FailureElementEvidence };
    }>
  | Readonly<{
      type: 'EXPORT_FAILURE_EVIDENCE';
      requestId: string;
      payload: { tabId: number; expected: string; actual: string };
    }>
  | Readonly<{
      type: 'SAVE_PICKER_SELECTION';
      requestId: string;
      payload: { selection: PickerSelection };
    }>
  | Readonly<{ type: 'IMPORT_USER_PROFILES'; requestId: string; payload: { content: string } }>
  | Readonly<{
      type: 'EXPORT_PERSONAL_BACKUP';
      requestId: string;
      payload: { includeDiagnostics: boolean };
    }>
  | Readonly<{
      type: 'IMPORT_PERSONAL_BACKUP';
      requestId: string;
      payload: { content: string; dryRun: boolean };
    }>
  | Readonly<{ type: 'IMPORT_SIGNED_PROFILE'; requestId: string; payload: { content: string } }>
  | Readonly<{
      type: 'UPDATE_PROFILE_RULE';
      requestId: string;
      payload: { hostname: string; ruleId: string; patch: RulePatch };
    }>
  | Readonly<{
      type: 'DELETE_PROFILE_RULE';
      requestId: string;
      payload: { hostname: string; ruleId: string };
    }>
  | Readonly<{ type: 'OPEN_CONTROL_PANEL'; requestId: string; payload: { tabId: number } }>
  | Readonly<{
      type: 'GET_RUNTIME_SNAPSHOT' | 'RECORD_FIXTURE_SUMMARY';
      requestId: string;
      payload: { tabId: number };
    }>
  | Readonly<{
      type: 'LIST_PROFILE_HISTORY';
      requestId: string;
      payload: { hostname: string };
    }>
  | Readonly<{
      type: 'RESTORE_PROFILE_HISTORY';
      requestId: string;
      payload: { hostname: string; hash: string };
    }>
  | Readonly<{ type: 'ENABLE_CONTEXT_MENU'; requestId: string; payload: {} }>;

export type RequestMessage = RequestPayload & Readonly<{ meta?: MessageMetadata }>;

export interface CommandMetadata {
  protocolVersion: typeof MESSAGE_PROTOCOL_VERSION;
  extensionVersion: typeof PRODUCT_VERSION;
  runtimeEpoch: string;
  commandId: string;
  targetDocumentInstanceId: string | null;
}

export type ContentCommandPayload =
  | Readonly<{
      type: 'RTLX_ROLLBACK' | 'RTLX_PING' | 'RTLX_REPROCESS' | 'RTLX_REBIND_RUNTIME_EPOCH';
    }>
  | Readonly<{ type: 'RTLX_START_PICKER'; kind: ElementKind }>
  | Readonly<{ type: 'RTLX_START_FAILURE_PICKER' }>
  | Readonly<{ type: 'RTLX_QUICK_OVERRIDE'; mode: QuickOverrideMode }>
  | Readonly<{ type: 'RTLX_RUNTIME_SNAPSHOT' | 'RTLX_RECORD_FIXTURE' }>
  | Readonly<{ type: 'RTLX_FAILURE_SNAPSHOT'; captureId: string }>;

export type ContentCommand = ContentCommandPayload & Readonly<{ meta?: CommandMetadata }>;
export type ResponseMessage =
  | Readonly<{ requestId: string; success: true; data?: unknown }>
  | Readonly<{ requestId: string; success: false; error: { code: string; message: string } }>;

const TYPES = new Set<RequestMessage['type']>([
  'REQUEST_CONTEXT',
  'UPDATE_SETTINGS',
  'UPDATE_SITE_SETTINGS',
  'APPLY_CURRENT_TAB',
  'ENSURE_CURRENT_TAB_RUNTIME',
  'ROLLBACK',
  'TEMPORARY_DISABLE',
  'RESET_TEMPORARY_DISABLE',
  'GET_STATUS',
  'REPORT_DIAGNOSTICS',
  'REPORT_SUSPICIOUS_DIRECTION',
  'EXPORT_DIAGNOSTICS',
  'RESET_SETTINGS',
  'START_PICKER',
  'START_FAILURE_PICKER',
  'SAVE_FAILURE_ELEMENT_EVIDENCE',
  'EXPORT_FAILURE_EVIDENCE',
  'SAVE_PICKER_SELECTION',
  'LIST_USER_PROFILES',
  'EXPORT_USER_PROFILES',
  'IMPORT_USER_PROFILES',
  'IMPORT_SIGNED_PROFILE',
  'DELETE_USER_PROFILE',
  'TOGGLE_SITE_DISABLED',
  'UPDATE_PROFILE_RULE',
  'DELETE_PROFILE_RULE',
  'GET_COMMUNITY_CATALOG',
  'GET_OPERATIONAL_STATUS',
  'RESET_SAFE_MODE',
  'RUN_PERSONAL_HEALTH_CHECK',
  'EXPORT_PERSONAL_SUPPORT_BUNDLE',
  'CLEAR_DIAGNOSTICS',
  'ATTEMPT_PERSONAL_RECOVERY',
  'EXPORT_PERSONAL_BACKUP',
  'IMPORT_PERSONAL_BACKUP',
  'OPEN_CONTROL_PANEL',
  'ENABLE_CONTEXT_MENU',
  'GET_RUNTIME_SNAPSHOT',
  'RECORD_FIXTURE_SUMMARY',
  'LIST_PROFILE_HISTORY',
  'RESTORE_PROFILE_HISTORY',
]);
const SITE_MODES = new Set<SiteMode>(['disabled', 'ask', 'auto-safe', 'force-candidate-rtl']);
const ELEMENT_KINDS = new Set<ElementKind>([
  'content',
  'code',
  'math',
  'editor',
  'terminal',
  'ignore',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const HOSTNAME =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/iu;
const RULE_ID = /^rule-[0-9a-f]{8}$/u;

export function isRequestMessage(value: unknown): value is RequestMessage {
  if (
    !isRecord(value) ||
    !exactKeysOneOf(value, [
      ['type', 'requestId', 'payload'],
      ['type', 'requestId', 'payload', 'meta'],
    ]) ||
    (value.meta !== undefined && !isMessageMetadata(value.meta)) ||
    typeof value.type !== 'string' ||
    !TYPES.has(value.type as RequestMessage['type']) ||
    typeof value.requestId !== 'string' ||
    !UUID.test(value.requestId) ||
    !isRecord(value.payload)
  )
    return false;
  switch (value.type) {
    case 'REQUEST_CONTEXT':
      return (
        exactKeys(value.payload, ['hostname', 'pathname']) &&
        isHostnameOrInternal(value.payload.hostname) &&
        isPathname(value.payload.pathname)
      );
    case 'UPDATE_SETTINGS':
      return exactKeys(value.payload, ['settings']) && validateSettings(value.payload.settings);
    case 'UPDATE_SITE_SETTINGS':
      return (
        exactKeys(value.payload, ['hostname', 'pathname', 'settings']) &&
        isHostname(value.payload.hostname) &&
        isPathname(value.payload.pathname) &&
        validatePerSiteSettings(value.payload.settings)
      );
    case 'APPLY_CURRENT_TAB':
    case 'ENSURE_CURRENT_TAB_RUNTIME':
    case 'ROLLBACK':
    case 'OPEN_CONTROL_PANEL':
    case 'GET_RUNTIME_SNAPSHOT':
    case 'RECORD_FIXTURE_SUMMARY':
    case 'START_FAILURE_PICKER':
      return exactKeys(value.payload, ['tabId']) && isPositiveInteger(value.payload.tabId);
    case 'EXPORT_FAILURE_EVIDENCE':
      return (
        exactKeys(value.payload, ['actual', 'expected', 'tabId']) &&
        isPositiveInteger(value.payload.tabId) &&
        typeof value.payload.expected === 'string' &&
        value.payload.expected.length <= LIMITS.maxFailureObservationChars &&
        typeof value.payload.actual === 'string' &&
        value.payload.actual.length <= LIMITS.maxFailureObservationChars
      );
    case 'TEMPORARY_DISABLE':
      return (
        exactKeys(value.payload, ['tabId', 'hostname', 'minutes']) &&
        isPositiveInteger(value.payload.tabId) &&
        isHostname(value.payload.hostname) &&
        Number.isInteger(value.payload.minutes) &&
        Number(value.payload.minutes) >= 1 &&
        Number(value.payload.minutes) <= 60
      );
    case 'RESET_TEMPORARY_DISABLE':
    case 'DELETE_USER_PROFILE':
    case 'LIST_PROFILE_HISTORY':
      return exactKeys(value.payload, ['hostname']) && isHostname(value.payload.hostname);
    case 'GET_STATUS':
    case 'TOGGLE_SITE_DISABLED':
      return (
        exactKeys(value.payload, ['tabId', 'hostname', 'pathname']) &&
        isPositiveInteger(value.payload.tabId) &&
        isHostname(value.payload.hostname) &&
        isPathname(value.payload.pathname)
      );
    case 'REPORT_DIAGNOSTICS':
      return (
        exactKeys(value.payload, ['diagnostics']) &&
        Array.isArray(value.payload.diagnostics) &&
        value.payload.diagnostics.length <= 100 &&
        value.payload.diagnostics.every(isUntrustedDiagnostic)
      );
    case 'REPORT_SUSPICIOUS_DIRECTION':
    case 'EXPORT_DIAGNOSTICS':
    case 'RESET_SETTINGS':
    case 'LIST_USER_PROFILES':
    case 'EXPORT_USER_PROFILES':
    case 'GET_COMMUNITY_CATALOG':
    case 'GET_OPERATIONAL_STATUS':
    case 'RESET_SAFE_MODE':
    case 'ENABLE_CONTEXT_MENU':
    case 'RUN_PERSONAL_HEALTH_CHECK':
    case 'EXPORT_PERSONAL_SUPPORT_BUNDLE':
    case 'CLEAR_DIAGNOSTICS':
    case 'ATTEMPT_PERSONAL_RECOVERY':
      return exactKeys(value.payload, []);
    case 'EXPORT_PERSONAL_BACKUP':
      return (
        exactKeys(value.payload, ['includeDiagnostics']) &&
        typeof value.payload.includeDiagnostics === 'boolean'
      );
    case 'IMPORT_PERSONAL_BACKUP':
      return (
        exactKeys(value.payload, ['content', 'dryRun']) &&
        typeof value.payload.content === 'string' &&
        new TextEncoder().encode(value.payload.content).byteLength <=
          LIMITS.maxPersonalBackupBytes &&
        typeof value.payload.dryRun === 'boolean'
      );
    case 'START_PICKER':
      return (
        exactKeys(value.payload, ['tabId', 'kind']) &&
        isPositiveInteger(value.payload.tabId) &&
        isElementKind(value.payload.kind)
      );
    case 'SAVE_PICKER_SELECTION':
      return exactKeys(value.payload, ['selection']) && isPickerSelection(value.payload.selection);
    case 'SAVE_FAILURE_ELEMENT_EVIDENCE':
      return (
        exactKeys(value.payload, ['evidence']) && isFailureElementEvidence(value.payload.evidence)
      );
    case 'IMPORT_USER_PROFILES':
    case 'IMPORT_SIGNED_PROFILE':
      return (
        exactKeys(value.payload, ['content']) &&
        typeof value.payload.content === 'string' &&
        new TextEncoder().encode(value.payload.content).byteLength <= LIMITS.maxProfileExportBytes
      );
    case 'UPDATE_PROFILE_RULE':
      return (
        exactKeys(value.payload, ['hostname', 'patch', 'ruleId']) &&
        isHostname(value.payload.hostname) &&
        typeof value.payload.ruleId === 'string' &&
        RULE_ID.test(value.payload.ruleId) &&
        isRulePatch(value.payload.patch)
      );
    case 'DELETE_PROFILE_RULE':
      return (
        exactKeys(value.payload, ['hostname', 'ruleId']) &&
        isHostname(value.payload.hostname) &&
        typeof value.payload.ruleId === 'string' &&
        RULE_ID.test(value.payload.ruleId)
      );
    case 'RESTORE_PROFILE_HISTORY':
      return (
        exactKeys(value.payload, ['hash', 'hostname']) &&
        isHostname(value.payload.hostname) &&
        typeof value.payload.hash === 'string' &&
        /^[a-f0-9]{64}$/u.test(value.payload.hash)
      );
  }
  return false;
}

export function isContentCommand(value: unknown): value is ContentCommand {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  const baseKeys = value.meta === undefined ? ['type'] : ['meta', 'type'];
  if (value.meta !== undefined && !isCommandMetadata(value.meta)) return false;
  if (value.type === 'RTLX_START_PICKER')
    return exactKeys(value, [...baseKeys, 'kind']) && isElementKind(value.kind);
  if (value.type === 'RTLX_START_FAILURE_PICKER') return exactKeys(value, baseKeys);
  if (value.type === 'RTLX_QUICK_OVERRIDE')
    return (
      exactKeys(value, [...baseKeys, 'mode']) &&
      (value.mode === 'content' || value.mode === 'ltr' || value.mode === 'ignore')
    );
  if (value.type === 'RTLX_FAILURE_SNAPSHOT')
    return (
      exactKeys(value, [...baseKeys, 'captureId']) &&
      typeof value.captureId === 'string' &&
      UUID.test(value.captureId)
    );
  return (
    exactKeys(value, baseKeys) &&
    (value.type === 'RTLX_ROLLBACK' ||
      value.type === 'RTLX_PING' ||
      value.type === 'RTLX_REPROCESS' ||
      value.type === 'RTLX_REBIND_RUNTIME_EPOCH' ||
      value.type === 'RTLX_RUNTIME_SNAPSHOT' ||
      value.type === 'RTLX_RECORD_FIXTURE')
  );
}

export function createContentCommand(
  command: ContentCommandPayload,
  runtimeEpoch: string,
  targetDocumentInstanceId: string | null = null
): ContentCommand {
  return Object.freeze({
    ...command,
    meta: Object.freeze({
      protocolVersion: MESSAGE_PROTOCOL_VERSION,
      extensionVersion: PRODUCT_VERSION,
      runtimeEpoch,
      commandId: crypto.randomUUID(),
      targetDocumentInstanceId,
    }),
  });
}

export function isCommandForCurrentDocument(value: ContentCommand): boolean {
  if (!value.meta) return configuredRuntimeEpoch === null;
  if (configuredRuntimeEpoch === null) configuredRuntimeEpoch = value.meta.runtimeEpoch;
  return (
    value.meta.runtimeEpoch === configuredRuntimeEpoch &&
    (value.meta.targetDocumentInstanceId === null ||
      value.meta.targetDocumentInstanceId === currentDocumentInstanceId())
  );
}

export function isRuntimeEpochRebindForCurrentDocument(value: ContentCommand): boolean {
  return (
    value.type === 'RTLX_REBIND_RUNTIME_EPOCH' &&
    value.meta !== undefined &&
    (value.meta.targetDocumentInstanceId === null ||
      value.meta.targetDocumentInstanceId === currentDocumentInstanceId())
  );
}

function isCommandMetadata(value: unknown): value is CommandMetadata {
  return (
    isRecord(value) &&
    exactKeys(value, [
      'protocolVersion',
      'extensionVersion',
      'runtimeEpoch',
      'commandId',
      'targetDocumentInstanceId',
    ]) &&
    value.protocolVersion === MESSAGE_PROTOCOL_VERSION &&
    value.extensionVersion === PRODUCT_VERSION &&
    typeof value.runtimeEpoch === 'string' &&
    UUID.test(value.runtimeEpoch) &&
    typeof value.commandId === 'string' &&
    UUID.test(value.commandId) &&
    (value.targetDocumentInstanceId === null ||
      (typeof value.targetDocumentInstanceId === 'string' &&
        UUID.test(value.targetDocumentInstanceId)))
  );
}

export function message<T extends RequestMessage>(type: T['type'], payload: T['payload']): T {
  return Object.freeze({
    type,
    requestId: crypto.randomUUID(),
    payload,
    meta: createMessageMetadata(),
  }) as T;
}

export function isMessageMetadata(value: unknown): value is MessageMetadata {
  return (
    isRecord(value) &&
    exactKeys(value, [
      'protocolVersion',
      'extensionVersion',
      'documentInstanceId',
      'documentGeneration',
      'runtimeEpoch',
    ]) &&
    value.protocolVersion === MESSAGE_PROTOCOL_VERSION &&
    value.extensionVersion === PRODUCT_VERSION &&
    typeof value.documentInstanceId === 'string' &&
    UUID.test(value.documentInstanceId) &&
    Number.isInteger(value.documentGeneration) &&
    Number(value.documentGeneration) >= 1 &&
    Number(value.documentGeneration) <= 1_000_000 &&
    (value.runtimeEpoch === null ||
      (typeof value.runtimeEpoch === 'string' && UUID.test(value.runtimeEpoch)))
  );
}

function isPickerSelection(value: unknown): value is PickerSelection {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      'alignmentMode',
      'directionMode',
      'hostname',
      'initialDelayMs',
      'kind',
      'schemaVersion',
      'selector',
      'typographyMode',
    ])
  )
    return false;
  if (
    value.schemaVersion !== '2.0.0' ||
    !isHostname(value.hostname) ||
    !isElementKind(value.kind) ||
    typeof value.selector !== 'string' ||
    !['auto-safe', 'force-rtl', 'force-ltr', 'preserve'].includes(String(value.directionMode)) ||
    !['start', 'preserve'].includes(String(value.alignmentMode)) ||
    !['persian-only', 'preserve'].includes(String(value.typographyMode)) ||
    !Number.isInteger(value.initialDelayMs) ||
    Number(value.initialDelayMs) < 0 ||
    Number(value.initialDelayMs) > LIMITS.maxRuleDelayMs
  )
    return false;
  const result = validateSelectors([value.selector]);
  return result.ok && result.value[0] === value.selector.trim();
}
function isRulePatch(value: unknown): value is RulePatch {
  if (
    !isRecord(value) ||
    Object.keys(value).length === 0 ||
    !Object.keys(value).every((key) =>
      ['enabled', 'directionMode', 'alignmentMode', 'typographyMode', 'initialDelayMs'].includes(
        key
      )
    )
  )
    return false;
  return (
    (value.enabled === undefined || typeof value.enabled === 'boolean') &&
    (value.directionMode === undefined ||
      ['auto-safe', 'force-rtl', 'force-ltr', 'preserve'].includes(String(value.directionMode))) &&
    (value.alignmentMode === undefined ||
      ['start', 'preserve'].includes(String(value.alignmentMode))) &&
    (value.typographyMode === undefined ||
      ['persian-only', 'preserve'].includes(String(value.typographyMode))) &&
    (value.initialDelayMs === undefined ||
      (Number.isInteger(value.initialDelayMs) &&
        Number(value.initialDelayMs) >= 0 &&
        Number(value.initialDelayMs) <= LIMITS.maxRuleDelayMs))
  );
}
export function validatePerSiteSettings(value: unknown): value is PerSiteSettings {
  if (!isRecord(value)) return false;
  const allowed = [
    'siteMode',
    'lastEnabledSiteMode',
    'directionCorrection',
    'bidiIsolation',
    'typography',
    'formFieldDirection',
    'inputDirectionAssistant',
    'listRepair',
    'latinFont',
    'persianFont',
    'settingsScope',
    'confirmedSuspiciousDirection',
  ];
  if (!Object.keys(value).every((key) => allowed.includes(key))) return false;
  return (
    (value.siteMode === undefined ||
      (typeof value.siteMode === 'string' && SITE_MODES.has(value.siteMode as SiteMode))) &&
    (value.lastEnabledSiteMode === undefined ||
      value.lastEnabledSiteMode === 'ask' ||
      value.lastEnabledSiteMode === 'auto-safe' ||
      value.lastEnabledSiteMode === 'force-candidate-rtl') &&
    [
      'directionCorrection',
      'bidiIsolation',
      'typography',
      'formFieldDirection',
      'inputDirectionAssistant',
      'listRepair',
      'confirmedSuspiciousDirection',
    ].every((key) => value[key] === undefined || typeof value[key] === 'boolean') &&
    (value.latinFont === undefined ||
      value.latinFont === 'inter' ||
      value.latinFont === 'amazon-ember-local' ||
      value.latinFont === 'preserve') &&
    (value.persianFont === undefined ||
      value.persianFont === 'vazirmatn-bundled' ||
      value.persianFont === 'local-first') &&
    (value.settingsScope === undefined ||
      value.settingsScope === 'site' ||
      value.settingsScope === 'conversation')
  );
}
function isElementKind(value: unknown): value is ElementKind {
  return typeof value === 'string' && ELEMENT_KINDS.has(value as ElementKind);
}
function isHostname(value: unknown): value is string {
  return typeof value === 'string' && HOSTNAME.test(value);
}
function isHostnameOrInternal(value: unknown): value is string {
  return value === 'options.internal' || value === 'sidepanel.internal' || isHostname(value);
}
function isPathname(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    value.length <= 2048 &&
    !value.includes('?') &&
    !value.includes('#')
  );
}
function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}
function exactKeysOneOf(
  record: Record<string, unknown>,
  candidates: readonly (readonly string[])[]
): boolean {
  return candidates.some((keys) => exactKeys(record, keys));
}

function exactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(record).sort().join('|') === [...keys].sort().join('|');
}
