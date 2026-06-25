import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installDom } from '../dom-test-setup';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('RTLX 15.9.11 popup bootstrap failure recovery', () => {
  it('leaves checking state and downloads a local diagnostic when context messaging rejects', async () => {
    const html = readFileSync('src/ui/popup/index.html', 'utf8');
    const document = installDom(html);
    let downloadedName = '';
    let downloadedBlob: Blob | null = null;

    vi.doMock('../../src/shared/api-adapter', () => ({
      ExtensionRequestContractError: class ExtensionRequestContractError extends TypeError {},
      ExtensionResponseContractError: class ExtensionResponseContractError extends Error {},
      sendMessage: vi.fn().mockRejectedValue(new Error('Extension message timed out')),
    }));

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
      if (tagName.toLowerCase() === 'a') {
        Object.defineProperty(element, 'click', {
          configurable: true,
          value: () => {
            downloadedName = (element as HTMLAnchorElement).download;
          },
        });
      }
      return element;
    });

    await import('../../src/ui/popup/index');

    await vi.waitFor(() => {
      expect(document.getElementById('status-message')?.textContent).toBe('statusContextTimedOut');
    });

    const report = document.getElementById('download-page-debug-report') as HTMLButtonElement;
    expect(report.disabled).toBe(false);
    report.click();

    await vi.waitFor(() => {
      expect(downloadedName).toMatch(/^rtlx-bootstrap-chatgpt\.com-/u);
    });
    expect(downloadedBlob).not.toBeNull();
    const payload = JSON.parse(await downloadedBlob!.text()) as Record<string, unknown>;
    expect(payload).toMatchObject({
      schemaVersion: '2.1.0',
      reportType: 'popup-bootstrap-failure',
      extension: {
        version: '15.9.11',
        manifestVersion: 3,
      },
      failure: {
        stage: 'REQUEST_CONTEXT',
        category: 'contextTimedOut',
        failureBoundary: 'message_transport',
        responseReceived: false,
        responseKeys: [],
        invalidPaths: [],
        invalidValueKinds: [],
      },
    });
  });
});
