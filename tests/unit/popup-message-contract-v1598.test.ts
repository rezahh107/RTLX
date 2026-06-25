import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installDom } from '../dom-test-setup';

class MockRequestContractError extends TypeError {
  readonly failureBoundary = 'request_validation' as const;
  readonly responseReceived = false as const;

  constructor(
    readonly requestId: string,
    readonly issue: {
      invalidPaths: readonly string[];
      invalidValueKinds: readonly string[];
      provenance: { producer: 'popup'; handlerId: string; messageType: string };
    }
  ) {
    super('Invalid extension request');
  }
}

class MockResponseContractError extends Error {}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('RTLX 15.9.11 popup message-contract diagnostics', () => {
  it('keeps the report available for an RTLX-MESSAGE-005 producer violation', async () => {
    const harness = installPopupHarness();
    vi.doMock('../../src/shared/api-adapter', () => ({
      ExtensionRequestContractError: MockRequestContractError,
      ExtensionResponseContractError: MockResponseContractError,
      sendMessage: vi.fn().mockResolvedValue({
        requestId: crypto.randomUUID(),
        success: false,
        error: {
          code: 'RTLX-MESSAGE-005',
          message: 'Background response contract violation at $.data.site',
        },
      }),
    }));

    await import('../../src/ui/popup/index');

    await vi.waitFor(() => {
      expect(harness.status.textContent).toBe('statusResponseContractViolation');
    });
    expect(harness.report.disabled).toBe(false);
    harness.report.click();

    const payload = await harness.downloadedPayload();
    expect(payload).toMatchObject({
      schemaVersion: '2.1.0',
      reportType: 'popup-bootstrap-failure',
      failure: {
        stage: 'REQUEST_CONTEXT',
        category: 'responseContractViolation',
        failureBoundary: 'background_response_contract',
        responseReceived: true,
        provenance: {
          producer: 'background',
          handlerId: 'background.runtime.onMessage:REQUEST_CONTEXT',
          messageType: 'REQUEST_CONTEXT',
        },
      },
    });
  });

  it('preserves requestId and request provenance when local request validation fails', async () => {
    const harness = installPopupHarness();
    let observedRequestId = '';
    vi.doMock('../../src/shared/api-adapter', () => ({
      ExtensionRequestContractError: MockRequestContractError,
      ExtensionResponseContractError: MockResponseContractError,
      sendMessage: vi.fn().mockImplementation((request: { requestId: string }) => {
        observedRequestId = request.requestId;
        return Promise.reject(
          new MockRequestContractError(request.requestId, {
            invalidPaths: ['$.payload.settings.value'],
            invalidValueKinds: ['undefined'],
            provenance: {
              producer: 'popup',
              handlerId: 'popup.sendMessage:REQUEST_CONTEXT',
              messageType: 'REQUEST_CONTEXT',
            },
          })
        );
      }),
    }));

    await import('../../src/ui/popup/index');

    await vi.waitFor(() => {
      expect(harness.status.textContent).toBe('statusRequestContractViolation');
    });
    expect(harness.report.disabled).toBe(false);
    harness.report.click();

    const payload = await harness.downloadedPayload();
    expect(payload).toMatchObject({
      schemaVersion: '2.1.0',
      failure: {
        category: 'requestContractViolation',
        requestId: observedRequestId,
        failureBoundary: 'request_validation',
        responseReceived: false,
        invalidPaths: ['$.payload.settings.value'],
        invalidValueKinds: ['undefined'],
        provenance: {
          producer: 'popup',
          handlerId: 'popup.sendMessage:REQUEST_CONTEXT',
          messageType: 'REQUEST_CONTEXT',
        },
      },
    });
  });
});

function installPopupHarness(): {
  status: HTMLElement;
  report: HTMLButtonElement;
  downloadedPayload: () => Promise<Record<string, unknown>>;
} {
  const document = installDom(readPopupHtml());
  let downloadedBlob: Blob | null = null;

  vi.stubGlobal('chrome', {
    runtime: {
      id: 'rtlx-test',
      getManifest: () => ({ version: '15.9.11', manifest_version: 3 }),
    },
    tabs: {
      query: (_query: chrome.tabs.QueryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) =>
        callback([{ id: 7, url: 'https://chatgpt.com/c/example' } as chrome.tabs.Tab]),
    },
    permissions: {
      contains: (_permissions: unknown, callback: (granted: boolean) => void) => callback(true),
      request: (_permissions: unknown, callback: (granted: boolean) => void) => callback(true),
    },
    i18n: {
      getUILanguage: () => 'en-US',
      getMessage: (key: string) => key,
    },
  });

  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
    downloadedBlob = blob as Blob;
    return 'blob:rtlx-test';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  const createElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    const element = createElement(tagName);
    if (tagName.toLowerCase() === 'a')
      Object.defineProperty(element, 'click', { configurable: true, value: () => undefined });
    return element;
  });

  return {
    status: document.getElementById('status-message')!,
    report: document.getElementById('download-page-debug-report') as HTMLButtonElement,
    downloadedPayload: async () => {
      await vi.waitFor(() => expect(downloadedBlob).not.toBeNull());
      return JSON.parse(await downloadedBlob!.text()) as Record<string, unknown>;
    },
  };
}

function readPopupHtml(): string {
  return readFileSync('src/ui/popup/index.html', 'utf8');
}
