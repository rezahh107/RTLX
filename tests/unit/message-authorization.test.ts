import { describe, expect, it } from 'vitest';
import { isAuthorizedMessage } from '../../src/background/message-authorization';
import type { RequestMessage } from '../../src/shared/messages';

const requestId = '00000000-0000-4000-8000-000000000000';
const extensionBase = 'moz-extension://rtlx/';

function sender(url: string, tabId?: number): chrome.runtime.MessageSender {
  return {
    id: 'extension-id',
    url,
    ...(tabId === undefined ? {} : { tab: { id: tabId, url } as chrome.tabs.Tab }),
  };
}

describe('message authorization', () => {
  it('allows content-only diagnostics and rejects privileged imports from content', () => {
    const content = sender('https://example.com/chat', 7);
    const diagnostic = {
      type: 'REPORT_DIAGNOSTICS',
      requestId,
      payload: { diagnostics: [] },
    } as RequestMessage;
    const profileImport = {
      type: 'IMPORT_USER_PROFILES',
      requestId,
      payload: { content: '{}' },
    } as RequestMessage;
    expect(isAuthorizedMessage(diagnostic, content, extensionBase)).toBe(true);
    const signedImport = {
      type: 'IMPORT_SIGNED_PROFILE',
      requestId,
      payload: { content: '{}' },
    } as RequestMessage;
    expect(isAuthorizedMessage(profileImport, content, extensionBase)).toBe(false);
    expect(isAuthorizedMessage(signedImport, content, extensionBase)).toBe(false);
  });

  it('allows privileged messages only from extension pages', () => {
    const extension = sender(`${extensionBase}options/index.html`);
    const profileExport = {
      type: 'EXPORT_USER_PROFILES',
      requestId,
      payload: {},
    } as RequestMessage;
    expect(isAuthorizedMessage(profileExport, extension, extensionBase)).toBe(true);
    expect(
      isAuthorizedMessage(profileExport, sender('https://example.com/', 1), extensionBase)
    ).toBe(false);
  });

  it('binds content context requests to the sender hostname', () => {
    const context = (hostname: string): RequestMessage => ({
      type: 'REQUEST_CONTEXT',
      requestId,
      payload: { hostname, pathname: '/chat' },
    });
    const content = sender('https://example.com/chat', 7);
    expect(isAuthorizedMessage(context('example.com'), content, extensionBase)).toBe(true);
    expect(isAuthorizedMessage(context('other.example'), content, extensionBase)).toBe(false);
  });
});
