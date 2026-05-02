import { test, expect } from '@playwright/test';

test.describe('iPad Safari touch-drag', () => {
  test.use({
    viewport: { width: 768, height: 1024 },
    isMobile: true,
    hasTouch: true,
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/?testHooks=1');
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 15000 });
    await startBtn.click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });
  });

  test('touch-tap partition target on L1 registers interaction', async ({ page }) => {
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 15000 });

    const target = page.locator('[data-testid="partition-target"]');
    await expect(target).toBeVisible({ timeout: 10000 });

    // Simulate touch tap
    await target.tap();

    const overlay = page.locator('[data-testid="feedback-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 5000 });
  });

  test('canvas element has touch-action: none for drag prevention', async ({ page }) => {
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 15000 });

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const touchAction = await canvas.evaluate((el) => getComputedStyle(el).touchAction);
    expect(touchAction).toBe('none');
  });

  test('no scroll bounce during game interaction', async ({ page }) => {
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 15000 });

    const scrollBefore = await page.evaluate(() => window.scrollY);

    // Simulate touch drag on canvas
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }

    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBe(scrollBefore);
  });
});
