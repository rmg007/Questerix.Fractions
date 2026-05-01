import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: [
      'src/**/*.test.ts',
      'tests/unit/**/*.test.ts',
    ],
    exclude: [
      'tests/e2e/**',
      'tests/_legacy/**',
      'src/_legacy/**',
    ],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/_legacy/**',
        // Test files themselves
        'src/**/*.test.ts',
        'src/**/__tests__/**',
        // Phaser-bound code with no useful unit-coverage signal
        'src/main.ts',
        'src/scenes/**',
        'src/components/**',
        // Generated / config-only
        'src/curriculum/bundle.json',
        'src/types/**',
      ],
      // Phase 6.4 — coverage gate on the three pure layers.
      // Thresholds set against the actual unit-suite baseline measured
      // 2026-05-01 (NOT the integration suite, which adds ~25 pts to
      // persistence coverage but runs separately via vitest.integration.config.ts):
      //   src/engine        — ~95% lines  → gate 90 / 85 functions
      //   src/validators    — ~91% lines  → gate 85 / 80 functions
      //   src/persistence   — ~50% lines  → gate 45 / 45 functions (regression
      //     prevention only; absolute coverage is bolstered by the integration
      //     suite. Tighten once tests/integration is folded into the unit run
      //     OR after a dedicated test-writing pass on the under-covered repos.)
      // Branch thresholds intentionally omitted for v1 — line coverage is
      // the conservative gate; ratchet branch later as tests grow.
      thresholds: {
        'src/engine/**/*.ts': {
          lines: 90,
          functions: 85,
        },
        'src/validators/**/*.ts': {
          lines: 85,
          functions: 80,
        },
        'src/persistence/**/*.ts': {
          lines: 45,
          functions: 45,
        },
      },
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
