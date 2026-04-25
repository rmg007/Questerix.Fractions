/**
 * Vitest config for pure-function validator tests only.
 * No fake-indexeddb, no Phaser stubs needed.
 */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/validators/**/*.test.ts'],
    setupFiles: [],
  },
});
