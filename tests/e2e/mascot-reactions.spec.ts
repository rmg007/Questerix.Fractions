/**
 * Mascot reaction verification — e2e smoke (ux-elevation §9 T27).
 *
 * Asserts that the hidden DOM sentinel [data-testid="mascot-state"] carries
 * the correct `data-state` value after each observable mascot trigger:
 *
 *   correct answer  → data-state="cheer"
 *   hint requested  → data-state="think"
 *   session complete → data-state="cheer-big"
 *
 * Navigation: Boot → seed gate (not needed for L1) → Menu → Adventure Map
 *             → Level 1 (partition mechanic, always correct on partition-target click).
 *
 * The sentinel is mounted by Mascot.ts on construction and removed on destroy()
 * so it does not leak between scene transitions.
 */
import { test, expect } from '@playwright/test';

async function navigateToLevel01(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?testHooks=1');
  await expect(page.locator('[data-testid="boot-start-btn"]').first()).toBeVisible({
    timeout: 8000,
  });
  await page.locator('[data-testid="boot-start-btn"]').click();
  await expect(page.locator('[data-testid="menu-scene"]').first()).toBeVisible({ timeout: 8000 });
  await page.locator('[data-testid="level-card-L1"]').click();
  await expect(page.locator('[data-testid="level-map-scene"]').first()).toBeVisible({
    timeout: 8000,
  });
  await page.locator('[data-testid="map-level-1"]').click();
  await expect(page.locator('[data-testid="level01-scene"]').first()).toBeVisible({
    timeout: 8000,
  });
}

test.describe('Mascot reactions (T27) — e2e smoke', () => {
  test('correct answer sets mascot sentinel to cheer', async ({ page }) => {
    await navigateToLevel01(page);

    const partitionTarget = page.locator('[data-testid="partition-target"]');
    await expect(partitionTarget).toBeVisible({ timeout: 5000 });
    await partitionTarget.click();

    // FeedbackOverlay shows synchronously and mascot.setState('cheer') is called
    // immediately after, so we can assert while the overlay is still visible.
    await expect(page.locator('[data-testid="feedback-overlay"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'cheer',
      { timeout: 2000 }
    );
  });

  test('hint button press sets mascot sentinel to think', async ({ page }) => {
    await navigateToLevel01(page);

    const hintBtn = page.locator('[data-testid="hint-btn"]');
    await expect(hintBtn).toBeVisible({ timeout: 5000 });
    await hintBtn.click();

    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'think',
      { timeout: 2000 }
    );
  });

  test('session complete sets mascot sentinel to cheer-big', async ({ page }) => {
    await navigateToLevel01(page);

    // Trigger session-complete directly via the test hook rather than playing
    // through 5 questions, so the test does not depend on feedback auto-dismiss
    // timing (which relies on Phaser's game-loop tick and can stall in CI).
    await page.locator('[data-testid="session-complete-btn"]').click({ force: true });

    // Session complete overlay appears and mascot transitions to cheer-big
    await expect(page.locator('[data-testid="completion-screen"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'cheer-big',
      { timeout: 3000 }
    );
  });
});
