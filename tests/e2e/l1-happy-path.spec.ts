import { test, expect } from '@playwright/test';

test.describe('L1 happy-path E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testHooks=1');
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 15000 });
    await startBtn.click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });
  });

  test('navigate Menu → L1 → complete 5 questions → return to Menu', async ({ page }) => {
    // Enter L1
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 15000 });

    // Complete 5 attempts by clicking partition-target and dismissing feedback
    for (let i = 0; i < 5; i++) {
      const target = page.locator('[data-testid="partition-target"]');
      await expect(target).toBeVisible({ timeout: 10000 });
      await target.click();

      const overlay = page.locator('[data-testid="feedback-overlay"]');
      await expect(overlay).toBeVisible({ timeout: 5000 });

      const nextBtn = page.locator('[data-testid="feedback-next-btn"]');
      await nextBtn.click();
      await expect(overlay).toBeHidden({ timeout: 5000 });
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
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 15000 });

    for (let i = 1; i <= 3; i++) {
      const target = page.locator('[data-testid="partition-target"]');
      await expect(target).toBeVisible({ timeout: 10000 });
      await target.click();

      const overlay = page.locator('[data-testid="feedback-overlay"]');
      await expect(overlay).toBeVisible({ timeout: 5000 });

      const bar = page.locator('[data-testid="progress-bar"]');
      await expect(bar).toHaveAttribute('aria-valuenow', String(i));

      await page.locator('[data-testid="feedback-next-btn"]').click();
      await expect(overlay).toBeHidden({ timeout: 5000 });
    }
  });

  test('hint button shows hint text', async ({ page }) => {
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 15000 });

    const target = page.locator('[data-testid="partition-target"]');
    await expect(target).toBeVisible({ timeout: 10000 });

    const hintBtn = page.locator('[data-testid="hint-btn"]');
    await hintBtn.click();

    const hintText = page.locator('[data-testid="hint-text"]');
    await expect(hintText).toBeVisible({ timeout: 5000 });
  });
});
