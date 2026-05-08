import { defineConfig, devices } from '@playwright/test';

/**
 * Nightly config — runs against the live deployed URL, no dev server.
 * Usage: npx playwright test --config=playwright.nightly.config.ts
 * Env override: NIGHTLY_URL=https://fractions.questerix.com (default)
 */
const BASE_URL = process.env['NIGHTLY_URL'] ?? 'https://fractions.questerix.com';

export default defineConfig({
  testDir: 'tests',
  testMatch: [
    '**/e2e/nightly-browser-check.spec.ts',
    '**/e2e/smoke.spec.ts',
    '**/e2e/responsive-audit.spec.ts',
    '**/e2e/settings.spec.ts',
    '**/e2e/first-run.spec.ts',
  ],
  reporter: [['list'], ['json', { outputFile: 'test-results/nightly.json' }]],
  timeout: 30_000,
  retries: 1,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // No webServer — target is already deployed
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'mobile-portrait',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },
    {
      name: 'webkit-mobile',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce',
      },
    },
  ],
});
