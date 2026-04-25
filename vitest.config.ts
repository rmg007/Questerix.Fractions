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
      exclude: ['src/_legacy/**'],
    },
  },
});
