import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/synthetic',
  testMatch: 'playtest.spec.ts',
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev:app',
    port: 5173,
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  // No retries — each session should be independent
  retries: 0,
  workers: 1, // sessions run serially to avoid resource contention
  timeout: 30 * 60 * 1000, // 30 min total
});
