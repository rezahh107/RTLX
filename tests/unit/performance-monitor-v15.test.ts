import { describe, expect, it } from 'vitest';
import { PerformanceMonitor } from '../../src/content/performance-monitor';

describe('Performance dashboard v15', () => {
  it('aggregates phase summaries in stable lexical order', () => {
    const monitor = new PerformanceMonitor();
    monitor.measure('write', 2, () => 1);
    monitor.measure('classification', 4, () => 2);
    monitor.measure('classification', 3, () => 3);
    const summary = monitor.summary(() => new Date(0));
    expect(summary.generatedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(summary.phases.map((phase) => phase.phase)).toEqual(['classification', 'write']);
    expect(summary.phases[0]).toMatchObject({ samples: 2, totalCount: 7 });
  });
});
