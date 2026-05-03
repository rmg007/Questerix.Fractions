import { test, expect } from './_fixture';
import { navigateToLevel01, doAttempt } from './test-helpers';

test.describe('L1 happy-path E2E', () => {
  test('navigate Menu → L1 → complete 5 questions → return to Menu', async ({ page }) => {
    await navigateToLevel01(page);

    // Complete 5 attempts by clicking partition-target and dismissing feedback
    for (let i = 0; i < 5; i++) {
      await doAttempt(page);
    }

    // Completion screen shows
    await expect(page.locator('[data-testid="completion-screen"]')).toBeVisible({ timeout: 10000 });

    // Return to menu
    const menuBtn = page.locator('[data-testid="completion-menu-btn"]');
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });
    }
  });

  test('progress bar updates on each attempt', async ({ page }) => {
    await navigateToLevel01(page);

    for (let i = 1; i <= 3; i++) {
      await doAttempt(page);

      const bar = page.locator('[data-testid="progress-bar"]');
      await expect(bar).toHaveAttribute('aria-valuenow', String(i), { timeout: 3000 });
    }
  });

  test('hint button shows hint text', async ({ page }) => {
    await navigateToLevel01(page);

    const target = page.locator('[data-testid="partition-target"]');
    await expect(target).toBeVisible({ timeout: 10000 });

    const hintBtn = page.locator('[data-testid="hint-btn"]');
    await hintBtn.click();

    const hintText = page.locator('[data-testid="hint-text"]');
    await expect(hintText).toBeVisible({ timeout: 5000 });
  });
});
