import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    maxWorkers: 1,
    isolate: false,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/content/language-classifier.ts',
        'src/content/direction-decider.ts',
        'src/content/bidi-tokenizer.ts',
        'src/content/overlap-resolver.ts',
        'src/shared/selector-validator.ts',
        'src/shared/strict-json.ts',
        'src/content/mutation-journal.ts',
        'src/content/runtime-context.ts',
        'src/content/profile-health.ts',
        'src/content/streaming-stability.ts',
        'src/content/performance-monitor.ts',
        'src/content/profile-zone.ts',
        'src/content/fixture-recorder.ts',
        'src/content/mutation-applier.ts',
        'src/background/profile-history-repository.ts',
      ],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 },
    },
  },
});
