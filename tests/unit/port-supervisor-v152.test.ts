import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PortSupervisor } from '../../src/background/port-supervisor';

interface FakePort {
  postMessage: (value: unknown) => void;
  disconnect: () => void;
  onDisconnect: { addListener: (listener: () => void) => void };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('RH-011 idempotent port supervision', () => {
  it('bounds queued messages and handles duplicate disconnect notifications', async () => {
    const sent: unknown[] = [];
    const disconnectListeners: Array<() => void> = [];
    let connections = 0;
    const connect = (): chrome.runtime.Port => {
      connections += 1;
      const port: FakePort = {
        postMessage: (value) => sent.push(value),
        disconnect: () => undefined,
        onDisconnect: { addListener: (listener) => disconnectListeners.push(listener) },
      };
      return port as unknown as chrome.runtime.Port;
    };
    const supervisor = new PortSupervisor(connect, {
      maxQueuedMessages: 2,
      maxReconnectAttempts: 2,
      reconnectBaseDelayMs: 10,
    });
    supervisor.start();
    expect(supervisor.post('first')).toBe(true);
    disconnectListeners[0]?.();
    disconnectListeners[0]?.();
    supervisor.post('queued-1');
    supervisor.post('queued-2');
    supervisor.post('queued-3');
    expect(supervisor.snapshot().queuedMessages).toBe(2);
    await vi.advanceTimersByTimeAsync(10);
    expect(connections).toBe(2);
    expect(sent).toEqual(['first', 'queued-2', 'queued-3']);
    supervisor.stop();
    supervisor.stop();
    expect(supervisor.snapshot().queuedMessages).toBe(0);
  });
});
