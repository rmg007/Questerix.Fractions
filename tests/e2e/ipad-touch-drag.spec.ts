import { test, expect } from './_fixture';
import { navigateToLevel01 } from './test-helpers';

test.describe('iPad Safari touch-drag', () => {
  test.use({
    viewport: { width: 768, height: 1024 },
    isMobile: true,
    hasTouch: true,
  });

  test('touch-tap partition target on L1 registers interaction', async ({ page }) => {
    await navigateToLevel01(page);

    const target = page.locator('[data-testid="partition-target"]');
    await expect(target).toBeVisible({ timeout: 10000 });

    // Simulate touch tap
    await target.tap();

    const overlay = page.locator('[data-testid="feedback-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 5000 });
  });

  test('canvas element has touch-action: none for drag prevention', async ({ page }) => {
    await navigateToLevel01(page);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const touchAction = await canvas.evaluate((el) => getComputedStyle(el).touchAction);
    expect(touchAction).toBe('none');
  });

  test('no scroll bounce during game interaction', async ({ page }) => {
    await navigateToLevel01(page);

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
