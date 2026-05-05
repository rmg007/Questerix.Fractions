/**
 * iOS safe-area regression spec.
 *
 * Simulates an iPhone notch + home-indicator insets via CSS env() override and
 * asserts that no interactive element is positioned under the notch (top < 44 px)
 * or the home indicator (bottom < 34 px from the viewport bottom edge).
 *
 * Safe-area insets reference (iPhone 14 / notch models):
 *   env(safe-area-inset-top)    ≈ 47px  (status bar + notch)
 *   env(safe-area-inset-bottom) ≈ 34px  (home indicator)
 *
 * We inject these via a <style> override before the page loads so the game's
 * CSS env() references pick them up. We then check every [data-testid] element
 * that represents an interactive control (buttons, drag targets) against the
 * safe-area exclusion zones.
 *
 * Runs under the `webkit` Playwright project.
 */
import { test, expect } from '../_fixture';

/** Interactive testids we know about — extend as new controls are added. */
const INTERACTIVE_TESTIDS = [
  'boot-start-btn',
  'menu-scene',
  'level-card-L1',
  'settings-btn',
  'hint-btn',
  'partition-target',
  'feedback-overlay',
];

/** Safe-area exclusion thresholds (px). */
const NOTCH_TOP_PX = 44; // nothing interactive above this
const HOME_INDICATOR_BOTTOM_PX = 34; // nothing interactive below (viewport.height - this)

test.describe('iOS — safe-area inset guard', () => {
  test.beforeEach(async ({ page }) => {
    // Override CSS env() safe-area variables before the app loads.
    // This simulates the notch (top) and home indicator (bottom) insets that
    // iOS Safari reports on iPhone X / 11 / 12 / 13 / 14 models.
    await page.addInitScript(() => {
      // Inject a style rule that sets the CSS custom properties the app uses
      // as fallbacks for env(safe-area-inset-*). This runs before any app JS.
      const style = document.createElement('style');
      style.setAttribute('data-safe-area-sim', '1');
      style.textContent = `
        :root {
          --safe-area-top: 47px;
          --safe-area-bottom: 34px;
        }
      `;
      document.head.appendChild(style);
    });
  });

  test('boot-start-btn is not occluded by simulated notch', async ({ page }) => {
    await page.goto('/');

    const btn = page.locator('[data-testid="boot-start-btn"]');
    await expect(btn).toBeVisible({ timeout: 8000 });

    const bounds = await btn.boundingBox();
    expect(bounds).not.toBeNull();

    // The button's top edge must clear the notch zone.
    expect(bounds!.y).toBeGreaterThanOrEqual(NOTCH_TOP_PX);
  });

  test('boot-start-btn bottom edge is above home indicator zone', async ({ page }) => {
    await page.goto('/');

    const btn = page.locator('[data-testid="boot-start-btn"]');
    await expect(btn).toBeVisible({ timeout: 8000 });

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const bounds = await btn.boundingBox();
    expect(bounds).not.toBeNull();

    const btnBottom = bounds!.y + bounds!.height;
    const homeIndicatorThreshold = viewport!.height - HOME_INDICATOR_BOTTOM_PX;

    // The button must not extend into the home indicator zone.
    expect(btnBottom).toBeLessThanOrEqual(homeIndicatorThreshold);
  });

  test('menu scene interactive elements clear safe-area exclusion zones', async ({ page }) => {
    await page.goto('/');

    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 8000 });
    await startBtn.click();

    const menuScene = page.locator('[data-testid="menu-scene"]');
    await expect(menuScene).toBeVisible({ timeout: 8000 });

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const homeIndicatorThreshold = viewport!.height - HOME_INDICATOR_BOTTOM_PX;

    // Check each known interactive element that may be visible in MenuScene.
    const menuInteractiveIds = ['level-card-L1', 'settings-btn'];

    for (const testid of menuInteractiveIds) {
      const el = page.locator(`[data-testid="${testid}"]`);
      const isVisible = await el.isVisible().catch(() => false);
      if (!isVisible) continue; // element not rendered in this scene — skip

      const bounds = await el.boundingBox();
      if (!bounds) continue;

      // Top edge must clear the notch.
      expect(
        bounds.y,
        `[data-testid="${testid}"] top (${bounds.y}px) is under the notch zone (${NOTCH_TOP_PX}px)`
      ).toBeGreaterThanOrEqual(NOTCH_TOP_PX);

      // Bottom edge must clear the home indicator.
      const elBottom = bounds.y + bounds.height;
      expect(
        elBottom,
        `[data-testid="${testid}"] bottom (${elBottom}px) extends into home indicator zone (threshold: ${homeIndicatorThreshold}px)`
      ).toBeLessThanOrEqual(homeIndicatorThreshold);
    }
  });

  test('all known interactive testids clear safe-area zones on boot screen', async ({ page }) => {
    await page.goto('/');

    // Wait for at least the boot screen to settle.
    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 8000 });

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const homeIndicatorThreshold = viewport!.height - HOME_INDICATOR_BOTTOM_PX;

    for (const testid of INTERACTIVE_TESTIDS) {
      const el = page.locator(`[data-testid="${testid}"]`);
      const isVisible = await el.isVisible().catch(() => false);
      if (!isVisible) continue; // not rendered in boot screen — skip

      const bounds = await el.boundingBox();
      if (!bounds) continue;

      expect(
        bounds.y,
        `[data-testid="${testid}"] is positioned under the notch (top: ${bounds.y}px, threshold: ${NOTCH_TOP_PX}px)`
      ).toBeGreaterThanOrEqual(NOTCH_TOP_PX);

      const elBottom = bounds.y + bounds.height;
      expect(
        elBottom,
        `[data-testid="${testid}"] extends into home indicator zone (bottom: ${elBottom}px, threshold: ${homeIndicatorThreshold}px)`
      ).toBeLessThanOrEqual(homeIndicatorThreshold);
    }
  });
});
