// WCAG 2.1 AA automated checks and touch-target audit
// per accessibility.md §7 (test plan) and §2 (touch targets ≥ 44×44 CSS px)
import { test, expect } from './_fixture';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA — axe-core automated checks', () => {
  test('Menu scene — zero axe violations', async ({ page }) => {
    await page.goto('/');
    // CI dev-server cold-start needs more headroom than dev mode.
    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });

    const results = await new AxeBuilder({ page })
      // Target only critical and serious violations as committed in accessibility.md §7
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Level01 scene — zero axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level-map-scene"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="map-level-1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 10000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      // Exclude the Phaser canvas — known canvas-specific gap per accessibility.md §8
      .exclude('[data-testid="phaser-canvas"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

// Cluster F fix: filter TestHooks interactive overlays (#qf-testhooks) from
// the audit — they are e2e affordances, not production controls. Real
// interactive controls outside both #qf-testhooks and the canvas are audited.
test.describe('Touch target audit — ≥ 44×44 CSS px per accessibility.md §2', () => {
  /**
   * Every production interactive element outside the Phaser canvas must meet
   * the 44 × 44 CSS px minimum (Apple HIG / WCAG 2.5.5 enhanced, stricter
   * floor for K–2 fingers per accessibility.md §2).
   */
  async function auditTouchTargets(
    page: import('@playwright/test').Page
  ): Promise<{ selector: string; width: number; height: number }[]> {
    return page.evaluate(() => {
      const MIN_PX = 44;
      const interactive = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button, [role="button"], a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
      return interactive
        .filter((el) => {
          // Skip Phaser canvas wrapper (not measurable from DOM)
          if (el.closest('[data-testid="phaser-canvas"]')) return false;
          // Skip TestHooks overlays — e2e affordances, not production controls
          if (el.closest('#qf-testhooks')) return false;
          const rect = el.getBoundingClientRect();
          return rect.width < MIN_PX || rect.height < MIN_PX;
        })
        .map((el) => ({
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
    expect(violations, `Touch targets below 44px: ${JSON.stringify(violations, null, 2)}`).toEqual(
      []
    );
  });

  test('Level01 scene — all interactive elements ≥ 44×44 CSS px', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 3000 });
    // level-card-L1 opens the Adventure Map; select Level 1 from there
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level-map-scene"]')).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="map-level-1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 5000 });

    const violations = await auditTouchTargets(page);
    expect(violations, `Touch targets below 44px: ${JSON.stringify(violations, null, 2)}`).toEqual(
      []
    );
  });
});

// Cluster G fix: SkipLink.ts uses a <button> (R12 rework) — button focuses
// [data-a11y-id] elements on click. Test updated to match the button API.
test.describe('Skip link — WCAG 2.4.1 Bypass Blocks', () => {
  /**
   * Verifies that after game load:
   * 1. The skip link button is present in the DOM.
   * 2. The canvas target (qf-canvas) exists and is focusable (tabindex).
   * per SkipLink.ts — CANVAS_ID = 'qf-canvas', SKIP_LINK_ID = 'qf-skip-link'
   */
  test('Menu scene — skip link present and target canvas exists', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 3000 });

    // 1. Skip link button must be in DOM.
    const skipLink = page.locator('#qf-skip-link');
    await expect(skipLink).toBeAttached();

    // 2. It must be a button (R12: button approach for programmatic focus).
    const tagName = await skipLink.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('button');

    // 3. The canvas with id="qf-canvas" must exist in DOM.
    const canvas = page.locator('#qf-canvas');
    await expect(canvas).toBeAttached();

    // 4. Canvas must have tabindex so focus can programmatically land on it.
    const tabindex = await canvas.getAttribute('tabindex');
    expect(tabindex).not.toBeNull();
  });
});
