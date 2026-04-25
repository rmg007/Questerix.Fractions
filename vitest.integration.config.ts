// Separate Vitest config for integration tests (Dexie repos, bootstrap, backup/restore)
// per test-strategy.md §1.2 — fake-indexeddb auto-imported here, not in unit config
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: 'integration',
      include: ['tests/integration/**/*.test.ts'],
      exclude: [],
      // fake-indexeddb is imported in tests/setup.ts via 'fake-indexeddb/auto'
      // setupFiles is inherited from base config — no additional setup needed here
      environment: 'jsdom',
      // Longer timeout for Dexie init sequences
      testTimeout: 15000,
      coverage: {
        // Integration coverage tracks the persistence layer
        include: ['src/persistence/**/*.ts', 'src/bootstrap/**/*.ts'],
      },
    },
  })
);
