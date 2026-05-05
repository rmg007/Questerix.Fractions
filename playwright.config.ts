import { defineConfig, devices } from '@playwright/test';
import { DEV_PORT, BROWSERS } from './src/config/shared';

export default defineConfig({
  testDir: 'tests',
  testMatch: ['**/e2e/**/*.spec.ts', '**/a11y/**/*.spec.ts'],
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${DEV_PORT}`,
  },
  webServer: {
    command: 'npm run dev',
    port: DEV_PORT,
    reuseExistingServer: !process.env['CI'],
  },
  projects: [
    // ── Chromium (blocking, existing) ────────────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'iPhone SE 2020',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'iPhone 12',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'Pixel 5',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },
    {
      name: 'iPad Mini',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },

    // ── WebKit / iOS Safari (blocking on PR, matches C7) ────────────────────
    // Viewport matrix mirrors the three breakpoints from constraint C7 (360–1024 px).
    // reducedMotion:'reduce' is set here so that iOS-specific reduced-motion specs
    // can rely on it without per-test override. The existing Chromium specs are
    // unaffected — they run under their own project config.
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 360, height: 667 },
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'webkit-768',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 768, height: 1024 },
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'webkit-1024',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1024, height: 768 },
        reducedMotion: 'reduce',
      },
    },

    // ── Firefox (advisory — does not block merge) ────────────────────────────
    // Run with `--project=firefox` or via the `test:e2e:webkit` npm script
    // (package.json is owned by another agent). Tagged @advisory so CI can
    // choose to run but not fail the required checks.
    // Use grep filter: npx playwright test --project=firefox --grep "@firefox"
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
      // Advisory: match only tests explicitly tagged @advisory or @firefox
      grep: /@advisory|@firefox/,
    },
  ],
});

// Script reference for CI / local use:
//   npm run test:e2e:webkit  →  npx playwright test --project=webkit --project=webkit-768 --project=webkit-1024
// (package.json script is owned by another agent in this phase)
