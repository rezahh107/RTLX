import { describe, expect, it, vi } from 'vitest';
import { cooperativeYield } from '../../src/content/scheduler';
import { installDom } from '../dom-test-setup';

describe('v15.6.0 cooperative scheduler adapter', () => {
  it('uses scheduler.yield when available', async () => {
    installDom();
    const yielded = vi.fn(async () => undefined);
    Object.assign(window, { scheduler: { yield: yielded } });
    await cooperativeYield({ signal: new AbortController().signal });
    expect(yielded).toHaveBeenCalledTimes(1);
  });

  it('falls back without requiring scheduler.yield', async () => {
    installDom();
    Object.assign(window, { scheduler: undefined });
    await expect(
      cooperativeYield({ signal: new AbortController().signal })
    ).resolves.toBeUndefined();
  });
});
