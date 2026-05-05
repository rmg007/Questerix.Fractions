/**
 * Playwright fixture for performance baseline tests.
 *
 * Intentionally minimal — does NOT inject testHooks or bypass onboarding
 * so cold-start timing reflects the real user experience.
 *
 * Import this instead of @playwright/test in tests/perf spec files.
 */
import { test as base, expect } from '@playwright/test';
import { DEV_URL } from '../../src/config/shared';

/** Stats shape returned by the in-page rAF frame-timing loop. */
export interface FrameStats {
  p50: number;
  p95: number;
  mean: number;
  max: number;
  count: number;
}

/** Heap delta stats using performance.memory (Chromium only). */
export interface HeapStats {
  startMB: number;
  endMB: number;
  deltaMB: number;
  peakMB: number;
}

export const test = base.extend({
  // No-op override: perf tests use plain page.goto without mutation
  page: async ({ page }, use) => {
    await use(page);
  },
});

export { expect, DEV_URL };
