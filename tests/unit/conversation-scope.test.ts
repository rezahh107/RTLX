import { describe, expect, it } from 'vitest';
import { scopeKey } from '../../src/background/settings-repository';
describe('privacy-safe conversation scopes', () => {
  it('is deterministic and excludes query/fragment by contract input', async () => {
    const first = await scopeKey('Example.COM', '/chat/abc/messages', 2);
    const second = await scopeKey('example.com', '/chat/abc/other', 2);
    expect(first).toBe(second);
    expect(first).toMatch(/^rtlx:conversation:example\.com:[a-f0-9]{64}$/u);
    expect(first).not.toContain('abc');
  });
  it('changes when bounded path scope changes', async () => {
    expect(await scopeKey('example.com', '/chat/a', 2)).not.toBe(
      await scopeKey('example.com', '/chat/b', 2)
    );
  });
});
