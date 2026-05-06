/**
 * Responsive audit — verifies no horizontal overflow and canvas fits viewport
 * at the three C7 breakpoints: 360 px (minimum), 768 px (tablet), 1024 px (desktop).
 *
 * Phaser 4 renders to a canvas with Scale.FIT, so the canvas always scales to
 * fit the viewport width without overflowing. These specs catch regressions
 * where layout changes would push the canvas or DOM overlays outside the
 * visible area.
 *
 * per touchscreen-a11y-audit plan Phase 5 and constraint C7.
 */
import { test, expect } from './_fixture';

const VIEWPORTS = [
  { label: '360 px (C7 minimum)', width: 360, height: 640 },
  { label: '768 px (tablet)', width: 768, height: 1024 },
  { label: '1024 px (desktop)', width: 1024, height: 768 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`Viewport ${vp.label}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('no horizontal overflow on boot/menu', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 15000 });
      await page.locator('[data-testid="boot-start-btn"]').click();
      await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
      }));

      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
      expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    });

    test('canvas fits within viewport width', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 15000 });
      await page.locator('[data-testid="boot-start-btn"]').click();
      await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });

      const canvasMetrics = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
          right: rect.right,
          width: rect.width,
          viewportWidth: window.innerWidth,
        };
      });

      expect(canvasMetrics).not.toBeNull();
      // Canvas right edge must not exceed viewport (1px tolerance for sub-pixel rounding)
      expect(canvasMetrics!.right).toBeLessThanOrEqual(vp.width + 1);
      // Canvas must fill the constraining dimension (Scale.FIT).
      // Portrait canvas (800×1280, AR=0.625): constrained by width when vpAR < 0.625,
      // constrained by height otherwise (canvas is pillarboxed in landscape viewports).
      const canvasAR = 800 / 1280;
      const vpAR = vp.width / vp.height;
      const expectedMinWidth =
        vpAR < canvasAR
          ? vp.width * 0.95 // width-constrained: fills ~100% of viewport width
          : vp.height * canvasAR * 0.95; // height-constrained: pillarboxed
      expect(canvasMetrics!.width).toBeGreaterThanOrEqual(expectedMinWidth);
    });

    test('A11y layer interactive buttons are accessible at menu', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 15000 });
      await page.locator('[data-testid="boot-start-btn"]').click();
      await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });

      // A11y layer buttons should be reachable in the DOM (keyboard/screen-reader path)
      const a11yButtons = page.locator('.qf-a11y-container button');
      const count = await a11yButtons.count();
      // At least the Play button should be present
      expect(count).toBeGreaterThanOrEqual(1);

      // All A11y buttons should have accessible names
      for (let i = 0; i < count; i++) {
        const btn = a11yButtons.nth(i);
        const label = await btn.getAttribute('aria-label');
        const text = await btn.textContent();
        expect(label ?? text ?? '').not.toBe('');
      }
    });
  });
}
