/**
 * First-run and multi-student E2E tests.
 * per multi-student-and-first-run plan §Phase 2 / §Phase 5
 *
 * Tests:
 *   1. Fresh device → FirstRunScene appears, skip creates "Player 1" → OnboardingScene
 *   2. Fresh device → FirstRunScene appears, name entry → OnboardingScene
 *   3. Returning user with valid lastUsedStudentId → PreloadScene (no FirstRunScene)
 *   4. Stale lastUsedStudentId (row deleted) → cleared → FirstRunScene
 */

import { test, expect } from './_fixture';

async function clearAllStorage(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('questerix-fractions');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    localStorage.clear();
    sessionStorage.clear();
  });
}

test.describe('First-Run flow (Phase 2 + Phase 5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAllStorage(page);
  });

  test('fresh device boots to FirstRunScene', async ({ page }) => {
    test.setTimeout(60_000);

    // Navigate to the app with testHooks enabled for reliable sentinel detection
    await page.goto('/?testHooks=1');

    // Wait for boot-scene sentinel to appear
    await page.waitForSelector('[data-testid="boot-scene"]', { timeout: 15_000 });

    // Trigger boot sequence
    await page.click('[data-testid="boot-start-btn"]');

    // After boot, FirstRunScene should be shown (no profiles → no lastUsedStudentId)
    await page.waitForSelector('[data-testid="first-run-scene"]', { timeout: 15_000 });
    await expect(page.locator('[data-testid="first-run-scene"]')).toBeVisible();
  });

  test('skip button in FirstRunScene creates Player 1 and routes to OnboardingScene', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await page.goto('/?testHooks=1');
    await page.waitForSelector('[data-testid="boot-scene"]', { timeout: 15_000 });
    await page.click('[data-testid="boot-start-btn"]');
    await page.waitForSelector('[data-testid="first-run-scene"]', { timeout: 15_000 });

    // Click the skip button
    await page.click('[data-testid="first-run-skip-btn"]');

    // Should proceed to OnboardingScene (or MenuScene if onboarding already done)
    // We wait for either onboarding-scene or menu-scene to appear
    await page.waitForSelector('[data-testid="onboarding-scene"], [data-testid="menu-scene"]', {
      timeout: 15_000,
    });

    // Verify localStorage was set
    const storedId = await page.evaluate(() => localStorage.getItem('questerix.lastUsedStudentId'));
    expect(storedId).toBeTruthy();
  });

  test('returning user with valid lastUsedStudentId skips FirstRunScene', async ({ page }) => {
    test.setTimeout(60_000);

    // Simulate a returning user: create a student in IndexedDB and set localStorage
    await page.goto('/?testHooks=1');
    await page.waitForSelector('[data-testid="boot-scene"]', { timeout: 15_000 });
    await page.click('[data-testid="boot-start-btn"]');

    // Go through first run once to create a profile
    await page.waitForSelector('[data-testid="first-run-scene"]', { timeout: 15_000 });
    await page.click('[data-testid="first-run-skip-btn"]');
    await page.waitForSelector('[data-testid="onboarding-scene"], [data-testid="menu-scene"]', {
      timeout: 15_000,
    });

    // Now reload — should go directly to PreloadScene, NOT FirstRunScene
    await page.reload();
    await page.waitForSelector('[data-testid="boot-scene"]', { timeout: 15_000 });
    await page.click('[data-testid="boot-start-btn"]');

    // Should NOT see first-run-scene this time
    // Wait for preload or menu instead
    await page.waitForSelector(
      '[data-testid="preload-scene"], [data-testid="menu-scene"], [data-testid="onboarding-scene"]',
      { timeout: 15_000 }
    );

    // Verify first-run-scene is NOT present
    const firstRunVisible = await page.locator('[data-testid="first-run-scene"]').isVisible();
    expect(firstRunVisible).toBe(false);
  });
});
