import { canonicalByteLength, toCanonicalJson } from './canonical-json';
import { LIMITS } from './constants';
import { isRequestMessage, type RequestMessage, type ResponseMessage } from './messages';
import {
  canonicalFailure,
  inspectResponseMessage,
  messageContractProvenance,
  type MessageContractProvenance,
  type ResponseContractIssue,
} from './response-contract';

const MESSAGE_TIMEOUT_MS = 10_000;

export type RequestContractIssueCategory = 'non_canonical' | 'too_large' | 'invalid_request';

export interface RequestContractIssue {
  readonly category: RequestContractIssueCategory;
  readonly message: string;
  readonly invalidPaths: readonly string[];
  readonly invalidValueKinds: readonly string[];
  readonly provenance: MessageContractProvenance;
}

export class ExtensionRequestContractError extends TypeError {
  override readonly name = 'ExtensionRequestContractError';
  readonly failureBoundary = 'request_validation' as const;
  readonly responseReceived = false as const;

  constructor(
    readonly requestId: string,
    readonly issue: RequestContractIssue
  ) {
    super('Invalid extension request');
  }
}

export class ExtensionResponseContractError extends Error {
  override readonly name = 'ExtensionResponseContractError';
  readonly failureBoundary = 'consumer_validation' as const;
  readonly responseReceived = true as const;

  constructor(
    readonly requestId: string,
    readonly issue: ResponseContractIssue
  ) {
    super('Invalid extension response');
  }
}

export function runtimeUrl(path: string): string {
  return chrome.runtime.getURL(path);
}

export async function sendMessage(request: RequestMessage): Promise<ResponseMessage> {
  const requestIssue = inspectRequestMessage(request);
  if (requestIssue) throw new ExtensionRequestContractError(request.requestId, requestIssue);
  return new Promise<ResponseMessage>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Extension message timed out'));
    }, MESSAGE_TIMEOUT_MS);
    chrome.runtime.sendMessage(request, (response: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      const inspection = inspectResponseMessage(
        response,
        request.requestId,
        messageContractProvenance(
          'background',
          `background.runtime.onMessage:${request.type}`,
          request.type
        )
      );
      if (!inspection.ok) {
        reject(new ExtensionResponseContractError(request.requestId, inspection.issue));
        return;
      }
      resolve(inspection.value);
    });
  });
}

function inspectRequestMessage(request: RequestMessage): RequestContractIssue | null {
  const provenance = messageContractProvenance(
    requestSourceContext(),
    `${requestSourceContext()}.sendMessage:${request.type}`,
    request.type
  );
  try {
    toCanonicalJson(request);
  } catch (error) {
    const canonical = canonicalFailure(error);
    return Object.freeze({
      category: 'non_canonical',
      message: error instanceof Error ? error.message : String(error),
      invalidPaths: canonical.invalidPaths,
      invalidValueKinds: canonical.invalidValueKinds,
      provenance,
    });
  }
  if (canonicalByteLength(request) > LIMITS.maxMessageBytes)
    return Object.freeze({
      category: 'too_large',
      message: 'Request exceeds size limit',
      invalidPaths: Object.freeze([]),
      invalidValueKinds: Object.freeze([]),
      provenance,
    });
  if (!isRequestMessage(request))
    return Object.freeze({
      category: 'invalid_request',
      message: 'Request envelope is invalid',
      invalidPaths: Object.freeze([]),
      invalidValueKinds: Object.freeze([]),
      provenance,
    });
  return null;
}

function requestSourceContext(): 'popup' | 'content' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  const protocol = window.location?.protocol;
  if ((protocol === 'chrome-extension:' || protocol === 'moz-extension:') && window.top === window)
    return 'popup';
  return 'content';
}

export type StorageAreaName = 'sync' | 'local' | 'session';
export type StorageAccessLevel = 'TRUSTED_CONTEXTS' | 'TRUSTED_AND_UNTRUSTED_CONTEXTS';

export function hasStorageArea(area: StorageAreaName): boolean {
  return Boolean(chrome.storage?.[area]);
}

export async function storageGet<T>(area: StorageAreaName, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) =>
    chrome.storage[area].get(key, (items) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(items[key] as T | undefined);
    })
  );
}

export async function storageSet(
  area: StorageAreaName,
  items: Record<string, unknown>
): Promise<void> {
  toCanonicalJson(items);
  return new Promise((resolve, reject) =>
    chrome.storage[area].set(items, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    })
  );
}

export async function storageGetAll(area: StorageAreaName): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) =>
    chrome.storage[area].get(null, (items) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(items);
    })
  );
}

export async function storageRemove(area: StorageAreaName, keys: string | string[]): Promise<void> {
  return new Promise((resolve, reject) =>
    chrome.storage[area].remove(keys, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    })
  );
}

export async function storageGetBytesInUse(
  area: StorageAreaName,
  keys: null | string | string[] = null
): Promise<number | null> {
  const storageArea = chrome.storage?.[area] as chrome.storage.StorageArea & {
    getBytesInUse?: (
      keys: null | string | string[],
      callback: (bytesInUse: number) => void
    ) => void;
  };
  if (typeof storageArea?.getBytesInUse !== 'function') return null;
  return new Promise((resolve, reject) =>
    storageArea.getBytesInUse(keys, (bytesInUse) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(bytesInUse);
    })
  );
}

export async function storageSetAccessLevel(
  area: StorageAreaName,
  accessLevel: StorageAccessLevel
): Promise<'applied' | 'unsupported'> {
  const storageArea = chrome.storage?.[area] as chrome.storage.StorageArea & {
    setAccessLevel?: (
      options: { accessLevel: StorageAccessLevel },
      callback?: () => void
    ) => Promise<void> | void;
  };
  if (typeof storageArea?.setAccessLevel !== 'function') return 'unsupported';
  return new Promise((resolve, reject) => {
    let settled = false;
    const complete = (error?: Error): void => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve('applied');
    };
    try {
      const setAccessLevel = storageArea.setAccessLevel as (
        options: { accessLevel: StorageAccessLevel },
        callback?: () => void
      ) => Promise<void> | void;
      const result = setAccessLevel({ accessLevel }, () => {
        const error = chrome.runtime.lastError;
        complete(error ? new Error(error.message) : undefined);
      });
      if (result && typeof result.then === 'function')
        void result.then(
          () => complete(),
          (error: unknown) => complete(error instanceof Error ? error : new Error(String(error)))
        );
    } catch (error) {
      complete(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
