/**
 * Playwright fixture that:
 *  1. Auto-injects ?testHooks=1 into all page.goto() calls so the boot scene
 *     mounts boot-start-btn instead of auto-advancing.
 *  2. Pre-seeds the legacy `questerix.onboardingSeen` localStorage flag before
 *     the page loads so the Dexie v7 upgrade writes
 *     `deviceMeta.onboardingComplete=true` on first DB open. This bypasses
 *     OnboardingScene for every e2e test by default — the helper-less specs
 *     (smoke, settings, levels-2-9, etc.) expect `level-card-L1` → LevelMapScene.
 *     Specs that need to exercise onboarding can call the helper directly.
 *
 * Import this instead of @playwright/test in tests/e2e spec files.
 */
import { test as base, expect } from '@playwright/test';
import { TEST_HOOKS_PARAM, DEV_URL } from '../../src/config/shared';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        // Picked up by the v7 upgrade callback in src/persistence/db.ts.
        localStorage.setItem('questerix.onboardingSeen', '1');
      } catch {
        // Some early page contexts (about:blank) deny localStorage access.
      }
    });

    const originalGoto = page.goto.bind(page);

    page.goto = async (url: string | URL | null, options?: any) => {
      if (url === null) {
        return originalGoto(null, options);
      }

      const urlStr = String(url);
      const urlObj = new URL(urlStr, DEV_URL);
      urlObj.searchParams.set(TEST_HOOKS_PARAM, '1');

      return originalGoto(urlObj.toString(), options);
    };

    await use(page);
  },
});

export { expect };
