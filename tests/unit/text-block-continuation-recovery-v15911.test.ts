import { beforeEach, describe, expect, it } from 'vitest';
import { inspectTextBlockContinuationRecovery } from '../../src/content/text-block-continuation-recovery';
import { installDom } from '../dom-test-setup';

beforeEach(() => installDom());

describe('v15.9.11 capture continuation recovery', () => {
  it('invalidates a pending text-block continuation that is no longer processable', () => {
    document.body.innerHTML = '<section id="region">متن فارسی</section>';
    const region = document.querySelector('#region')!;
    const result = inspectTextBlockContinuationRecovery({
      pending: new Set([region]),
      visibleQueue: new Set(),
      backgroundQueue: new Set(),
      cursors: new Map([[region, {}]]),
      isProcessable: () => false,
    });
    expect(result.invalid).toEqual([region]);
    expect(result.recoverable).toEqual([]);
  });

  it('keeps a valid processable continuation recoverable when it fell out of both queues', () => {
    document.body.innerHTML = '<section id="region">متن فارسی</section>';
    const region = document.querySelector('#region')!;
    const result = inspectTextBlockContinuationRecovery({
      pending: new Set([region]),
      visibleQueue: new Set(),
      backgroundQueue: new Set(),
      cursors: new Map([[region, {}]]),
      isProcessable: () => true,
    });
    expect(result.invalid).toEqual([]);
    expect(result.recoverable).toEqual([region]);
  });
});
