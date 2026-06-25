import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import { pruneDetachedTextBlockState } from '../../src/content/detached-work-pruner';

describe('RTLX 15.9.1 detached continuation pruning', () => {
  beforeEach(() => installDom('<html><body></body></html>'));

  it('removes disconnected text-block continuations without touching connected work', () => {
    const connected = document.createElement('section');
    const detached = document.createElement('section');
    document.body.append(connected);
    const pending = new Set([connected, detached]);
    const cursors = new Map<Element, unknown>([
      [connected, { id: 'connected' }],
      [detached, { id: 'detached' }],
    ]);
    const results = new Map<Element, unknown>([
      [connected, []],
      [detached, []],
    ]);

    expect(pruneDetachedTextBlockState({ pending, cursors, results })).toBe(1);
    expect(pending.has(connected)).toBe(true);
    expect(cursors.has(connected)).toBe(true);
    expect(results.has(connected)).toBe(true);
    expect(pending.has(detached)).toBe(false);
    expect(cursors.has(detached)).toBe(false);
    expect(results.has(detached)).toBe(false);
  });
});
