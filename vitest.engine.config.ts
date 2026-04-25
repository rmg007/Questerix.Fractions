/**
 * Vitest config for pure-function engine tests.
 * Skips fake-indexeddb (not installed) since engine layer has no storage deps.
 */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // pure-rand ships no lib/esm — force CJS so fast-check ESM can resolve it
      'pure-rand': path.resolve(
        __dirname,
        'node_modules/pure-rand/lib/pure-rand.js',
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: [
      'tests/unit/bkt.test.ts',
      'tests/unit/router.test.ts',
      'tests/unit/calibration.test.ts',
    ],
    setupFiles: ['tests/setup.engine.ts'],
  },
});
