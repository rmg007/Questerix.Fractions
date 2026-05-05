/**
 * Touch-target size audit — all data-testid elements must have bounding rect ≥ 44×44 CSS px.
 * WCAG 2.5.5 / Apple HIG minimum for K–2 touch interactions.
 *
 * Runs at 360 px viewport width (minimum supported per C7).
 * Elements inside #qf-testhooks are excluded (e2e affordances, not production controls).
 * Elements inside the Phaser canvas are excluded (measured via canvas-space audit instead).
 *
 * per PLANS/2026-05-04-touchscreen-a11y-audit.md Phase 2 + 3
 */

import { test, expect } from '../_fixture';

const VIEWPORT_360 = { width: 360, height: 800 };
const MIN_PX = 44;

/** Collect all DOM-visible interactive elements that violate the 44×44 minimum. */
async function auditTouchTargets(
  page: import('@playwright/test').Page
): Promise<Array<{ testid: string; width: number; height: number }>> {
  return page.evaluate((minPx) => {
    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, [role="button"], a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
    return interactive
      .filter((el) => {
        // Skip Phaser canvas — not measurable from DOM
        if (el.closest('#qf-canvas')) return false;
        // Skip TestHooks overlays — e2e affordances only
        if (el.closest('#qf-testhooks')) return false;
        // Skip elements with zero dimensions (hidden/offscreen)
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return rect.width < minPx || rect.height < minPx;
      })
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          testid:
            el.getAttribute('data-testid') ?? el.getAttribute('id') ?? el.tagName.toLowerCase(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
  }, MIN_PX);
}

test.describe('Touch target audit — ≥ 44×44 CSS px @ 360 px viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT_360);
  });

  test('Menu scene — all interactive DOM elements ≥ 44×44 CSS px', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });

    const violations = await auditTouchTargets(page);
    expect(
      violations,
      `Touch targets below ${MIN_PX}px at 360 vp: ${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });

  test('Settings scene — all interactive DOM elements ≥ 44×44 CSS px', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="settings-btn"]').click();
    await expect(page.locator('[data-testid="settings-scene"]')).toBeVisible({ timeout: 8000 });

    const violations = await auditTouchTargets(page);
    expect(
      violations,
      `Touch targets below ${MIN_PX}px at 360 vp: ${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });

  test('Level Map scene — all interactive DOM elements ≥ 44×44 CSS px', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level-map-scene"]')).toBeVisible({ timeout: 10000 });

    const violations = await auditTouchTargets(page);
    expect(
      violations,
      `Touch targets below ${MIN_PX}px at 360 vp: ${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });

  test('Onboarding scene — all interactive DOM elements ≥ 44×44 CSS px', async ({ page }) => {
    // Override fixture's onboardingSeen flag so OnboardingScene is shown
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('questerix.onboardingSeen');
      } catch {
        // ignore
      }
    });

    await page.goto('/');
    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="level-card-L1"]').click();
    // Onboarding intercepts Play before Level Map when not yet seen
    await expect(page.locator('[data-testid="onboarding-scene"]')).toBeVisible({ timeout: 10000 });

    const violations = await auditTouchTargets(page);
    expect(
      violations,
      `Touch targets below ${MIN_PX}px at 360 vp: ${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });

  test('Level01 scene — all interactive DOM elements ≥ 44×44 CSS px', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level-map-scene"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="map-level-1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 10000 });

    const violations = await auditTouchTargets(page);
    expect(
      violations,
      `Touch targets below ${MIN_PX}px at 360 vp: ${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });
});
