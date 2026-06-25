import { afterEach, describe, expect, it, vi } from 'vitest';
import { StreamingStabilityController } from '../../src/content/streaming-stability';
import { installDom } from '../dom-test-setup';

afterEach(() => vi.useRealTimers());

describe('RTLX 15.9.1 streaming queue resilience', () => {
  it('coalesces descendant roots under the smallest queued ancestor set', () => {
    vi.useFakeTimers();
    const document = installDom(
      '<html><body><main><section><p>سلام</p></section></main></body></html>'
    );
    const flushed: Element[][] = [];
    const controller = new StreamingStabilityController((roots) => {
      flushed.push(roots.filter((root): root is Element => root instanceof Element));
    });
    const main = document.querySelector('main')!;
    const section = document.querySelector('section')!;
    const paragraph = document.querySelector('p')!;

    expect(controller.enqueue(paragraph).status).toBe('accepted');
    expect(controller.enqueue(section).status).toBe('accepted');
    expect(controller.enqueue(paragraph).status).toBe('coalesced');
    expect(controller.enqueue(main).status).toBe('accepted');
    expect(controller.snapshot()).toMatchObject({ queuedRoots: 1, coalescedRoots: 3 });

    controller.flush();
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toEqual([main]);
  });

  it('flushes at capacity instead of rejecting a transient burst', () => {
    vi.useFakeTimers();
    const document = installDom(
      '<html><body><div id="a"></div><div id="b"></div><div id="c"></div></body></html>'
    );
    const batches: string[][] = [];
    const controller = new StreamingStabilityController(
      (roots) =>
        batches.push(
          roots.map((root) => (root instanceof Element ? root.id : root.constructor.name))
        ),
      80,
      400,
      2
    );

    expect(controller.enqueue(document.querySelector('#a')!).status).toBe('accepted');
    expect(controller.enqueue(document.querySelector('#b')!).status).toBe('accepted');
    const third = controller.enqueue(document.querySelector('#c')!);
    expect(third).toMatchObject({ accepted: true, status: 'forced-flush' });
    expect(batches).toEqual([['a', 'b']]);
    controller.flush();
    expect(batches).toEqual([['a', 'b'], ['c']]);
    expect(controller.snapshot()).toMatchObject({
      forcedFlushes: 1,
      overflowEpisodes: 1,
      rejectedRoots: 0,
      rootsFlushed: 3,
    });
  });

  it('reports only one new overflow episode while a failed flush remains active', () => {
    vi.useFakeTimers();
    const document = installDom('<html><body><div id="a"></div><div id="b"></div></body></html>');
    let fail = true;
    const controller = new StreamingStabilityController(
      () => {
        if (fail) throw new Error('synthetic flush failure');
      },
      80,
      400,
      1
    );
    expect(controller.enqueue(document.querySelector('#a')!).accepted).toBe(true);
    const rejected = controller.enqueue(document.querySelector('#b')!);
    expect(rejected).toMatchObject({
      accepted: false,
      status: 'rejected',
      overflowEpisodeStarted: true,
    });
    fail = false;
    const retried = controller.enqueue(document.querySelector('#b')!);
    expect(retried).toMatchObject({
      accepted: true,
      status: 'forced-flush',
      overflowEpisodeStarted: false,
    });
    expect(controller.snapshot()).toMatchObject({
      overflowEpisodes: 1,
      rejectedRoots: 1,
      flushFailures: 1,
    });
  });
});
