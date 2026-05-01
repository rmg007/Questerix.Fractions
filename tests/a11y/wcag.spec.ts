// WCAG 2.1 AA automated checks and touch-target audit
// per accessibility.md §7 (test plan) and §2 (touch targets ≥ 44×44 CSS px)
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA — axe-core automated checks', () => {
  test('Menu scene — zero axe violations', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 3000 });

    const results = await new AxeBuilder({ page })
      // Target only critical and serious violations as committed in accessibility.md §7
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Level01 scene — zero axe violations', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 5000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      // Exclude the Phaser canvas — known canvas-specific gap per accessibility.md §8
      .exclude('[data-testid="phaser-canvas"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

test.describe('Touch target audit — ≥ 44×44 CSS px per accessibility.md §2', () => {
  /**
   * Every interactive element outside the Phaser canvas must meet the
   * 44 × 44 CSS px minimum (Apple HIG / WCAG 2.5.5 enhanced, stricter floor
   * for K–2 fingers per accessibility.md §2).
   */
  async function auditTouchTargets(page: import('@playwright/test').Page): Promise<{ selector: string; width: number; height: number }[]> {
    return page.evaluate(() => {
      const MIN_PX = 44;
      const interactive = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button, [role="button"], a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
      return interactive
        .filter(el => {
          // Skip elements inside the Phaser canvas wrapper (not measurable from DOM)
          if (el.closest('[data-testid="phaser-canvas"]')) return false;
          const rect = el.getBoundingClientRect();
          return rect.width < MIN_PX || rect.height < MIN_PX;
        })
        .map(el => ({
          selector: el.getAttribute('data-testid') ?? el.tagName.toLowerCase(),
          width: Math.round(el.getBoundingClientRect().width),
          height: Math.round(el.getBoundingClientRect().height),
        }));
    });
  }

  test('Menu scene — all interactive elements ≥ 44×44 CSS px', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 3000 });

    const violations = await auditTouchTargets(page);
    expect(violations, `Touch targets below 44px: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
  });

  test('Level01 scene — all interactive elements ≥ 44×44 CSS px', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 5000 });

    const violations = await auditTouchTargets(page);
    expect(violations, `Touch targets below 44px: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
  });
});

test.describe('Skip link — WCAG 2.4.1 Bypass Blocks', () => {
  /**
   * Verifies that after game load:
   * 1. The skip link element is present in the DOM.
   * 2. The skip link href points to a target element that exists in the DOM.
   * 3. The target element (canvas) has a tabindex so focus can land on it.
   * per SkipLink.ts — CANVAS_ID = 'qf-canvas', SKIP_LINK_ID = 'qf-skip-link'
   */
  test('Menu scene — skip link present and target canvas exists', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 3000 });

    // 1. Skip link element must be in DOM.
    const skipLink = page.locator('#qf-skip-link');
    await expect(skipLink).toBeAttached();

    // 2. Skip link href must target #qf-canvas.
    const href = await skipLink.getAttribute('href');
    expect(href).toBe('#qf-canvas');

    // 3. The canvas with id="qf-canvas" must exist in DOM so the anchor resolves.
    const canvas = page.locator('#qf-canvas');
    await expect(canvas).toBeAttached();

    // 4. Canvas must have tabindex so focus can programmatically land on it.
    const tabindex = await canvas.getAttribute('tabindex');
    expect(tabindex).not.toBeNull();
  });
});
