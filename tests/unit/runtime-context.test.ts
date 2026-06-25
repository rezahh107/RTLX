import { describe, expect, it } from 'vitest';
import { RuntimeContext } from '../../src/content/runtime-context';
describe('runtime state', () => {
  it('start is idempotent', () => {
    const context = new RuntimeContext();
    context.start();
    context.start();
    expect(context.state()).toBe('ACTIVE');
    expect(context.diagnostics).toHaveLength(0);
  });
  it('reports invalid transitions', () => {
    const context = new RuntimeContext();
    context.suspend();
    expect(context.diagnostics[0]?.code).toBe('RTLX-STATE-001');
  });
  it('destroy is idempotent', () => {
    const context = new RuntimeContext();
    context.start();
    context.destroy();
    context.destroy();
    expect(context.state()).toBe('DESTROYED');
  });
});

it('aborts pending work on suspend and resumes with a fresh signal', () => {
  const context = new RuntimeContext();
  context.start();
  const original = context.signal();
  context.suspend();
  expect(original.aborted).toBe(true);
  context.start();
  expect(context.state()).toBe('ACTIVE');
  expect(context.signal().aborted).toBe(false);
});
