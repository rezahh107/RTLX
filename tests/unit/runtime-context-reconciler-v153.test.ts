import { beforeEach, describe, expect, it } from 'vitest';
import {
  reconcileRuntimeContexts,
  resetRuntimeContextCensusForTests,
} from '../../src/background/runtime-context-reconciler';

beforeEach(() => resetRuntimeContextCensusForTests());

describe('OU-005 runtime context census', () => {
  it('uses feature detection and returns no URLs', async () => {
    Object.assign(globalThis, {
      chrome: {
        runtime: {
          lastError: null,
          getContexts: async () => [
            {
              contextType: 'TAB',
              contextId: 'context-b',
              documentId: 'document-b',
              tabId: 2,
              frameId: 0,
              incognito: false,
              documentUrl: 'https://example.test/private?query=secret',
            },
            {
              contextType: 'BACKGROUND',
              contextId: 'context-a',
              documentId: 'document-a',
              tabId: -1,
              frameId: -1,
              incognito: false,
            },
          ],
        },
      },
    });
    const census = await reconcileRuntimeContexts();
    expect(census.status).toBe('observed');
    expect(census.contexts.map((entry) => entry.contextType)).toEqual(['BACKGROUND', 'TAB']);
    expect(JSON.stringify(census)).not.toContain('example.test');
    expect(JSON.stringify(census)).not.toContain('secret');
  });

  it('falls back cleanly when getContexts is unavailable', async () => {
    Object.assign(globalThis, { chrome: { runtime: { lastError: null } } });
    expect((await reconcileRuntimeContexts()).status).toBe('unsupported');
  });
});
