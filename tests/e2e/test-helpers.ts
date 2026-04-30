/**
 * Shared Playwright helpers for Questerix Fractions e2e tests.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Navigate from root to Level01Scene via DOM sentinels.
 * Route: boot-start-btn → menu-scene → level-card-L1 → level01-scene.
 * Note: level-card-L1 navigates directly to Level01Scene (not via the
 * Adventure Map). See MenuScene line ~163.
 */
export async function navigateToLevel01(page: Page): Promise<void> {
  await page.goto('/');
  const startBtn = page.locator('[data-testid="boot-start-btn"]');
  await expect(startBtn).toBeVisible({ timeout: 8000 });
  await startBtn.click();
  await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 8000 });
  await page.locator('[data-testid="level-card-L1"]').click();
  await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 10000 });
}

/**
 * Perform one attempt: click partition-target, wait for feedback, dismiss via feedback-next-btn.
 * Returns elapsed ms from click to feedback visible.
 */
export async function doAttempt(page: Page): Promise<number> {
  const partitionTarget = page.locator('[data-testid="partition-target"]');
  const feedbackOverlay = page.locator('[data-testid="feedback-overlay"]');
  const feedbackNext = page.locator('[data-testid="feedback-next-btn"]');

  await expect(partitionTarget).toBeVisible({ timeout: 3000 });
  const t0 = Date.now();
  await partitionTarget.click();
  await expect(feedbackOverlay).toBeVisible({ timeout: 1000 });
  const elapsed = Date.now() - t0;
  await feedbackNext.click();
  await expect(feedbackOverlay).toBeHidden({ timeout: 2000 });
  return elapsed;
}
