import { beforeEach, describe, expect, it } from 'vitest';
import {
  BACKGROUND_RUNTIME_EPOCH,
  currentDocumentIdentityForTab,
  invalidateTabDocuments,
  isCurrentDocumentIdentity,
  registerContentDocument,
  resetDocumentRegistryForTests,
  targetDocumentInstanceForTab,
  validateContentDocument,
} from '../../src/background/document-registry';
import type { RequestMessage } from '../../src/shared/messages';

const documentInstanceId = '123e4567-e89b-42d3-a456-426614174000';
const requestId = '123e4567-e89b-42d3-a456-426614174001';

beforeEach(() => resetDocumentRegistryForTests());

function request(runtimeEpoch: string | null, type: 'REQUEST_CONTEXT' | 'REPORT_DIAGNOSTICS') {
  return {
    type,
    requestId,
    payload:
      type === 'REQUEST_CONTEXT' ? { hostname: 'example.com', pathname: '/' } : { diagnostics: [] },
    meta: {
      protocolVersion: '1.0.0',
      extensionVersion: '15.9.11',
      documentInstanceId,
      documentGeneration: 1,
      runtimeEpoch,
    },
  } as RequestMessage;
}

function sender(lifecycle = 'active', browserDocumentId = 'browser-doc-1') {
  return {
    id: 'extension',
    tab: { id: 9, url: 'https://example.com/' } as chrome.tabs.Tab,
    frameId: 0,
    documentId: browserDocumentId,
    documentLifecycle: lifecycle,
    url: 'https://example.com/',
  } as chrome.runtime.MessageSender;
}

describe('RH-006/RH-008 document identity binding', () => {
  it('binds a handshake and accepts only the current epoch and document', () => {
    const registered = registerContentDocument(request(null, 'REQUEST_CONTEXT'), sender());
    expect(registered.ok).toBe(true);
    expect(targetDocumentInstanceForTab(9)).toBe(documentInstanceId);
    expect(
      validateContentDocument(request(BACKGROUND_RUNTIME_EPOCH, 'REPORT_DIAGNOSTICS'), sender()).ok
    ).toBe(true);
    expect(
      validateContentDocument(request(crypto.randomUUID(), 'REPORT_DIAGNOSTICS'), sender()).ok
    ).toBe(false);
    expect(
      validateContentDocument(
        request(BACKGROUND_RUNTIME_EPOCH, 'REPORT_DIAGNOSTICS'),
        sender('active', 'different-browser-doc')
      ).ok
    ).toBe(false);
  });

  it('keeps physical document identity stable across a content-runtime rebind', () => {
    expect(registerContentDocument(request(null, 'REQUEST_CONTEXT'), sender()).ok).toBe(true);
    const previous = currentDocumentIdentityForTab(9)!;
    const reboundRequest = {
      ...request(BACKGROUND_RUNTIME_EPOCH, 'REQUEST_CONTEXT'),
      meta: {
        ...request(BACKGROUND_RUNTIME_EPOCH, 'REQUEST_CONTEXT').meta!,
        documentInstanceId: '123e4567-e89b-42d3-a456-426614174099',
      },
    } as RequestMessage;
    expect(registerContentDocument(reboundRequest, sender()).ok).toBe(true);
    expect(isCurrentDocumentIdentity(previous)).toBe(true);
    expect(isCurrentDocumentIdentity({ ...previous, browserDocumentId: 'browser-doc-old' })).toBe(
      false
    );
  });

  it('rejects prerender and clears identity at navigation', () => {
    expect(registerContentDocument(request(null, 'REQUEST_CONTEXT'), sender('prerender')).ok).toBe(
      false
    );
    expect(registerContentDocument(request(null, 'REQUEST_CONTEXT'), sender()).ok).toBe(true);
    invalidateTabDocuments(9);
    expect(targetDocumentInstanceForTab(9)).toBeNull();
  });
});
