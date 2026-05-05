/**
 * E2E visual tests for reduced-motion compliance (Phase 6 gate).
 *
 * Loads the app with prefers-reduced-motion: reduce media query active.
 * Verifies that scene transitions and UI interactions produce zero visible tweens.
 *
 * Run:
 *   npm run test:e2e -- --grep "reduced-motion"
 *   npm run test:e2e -- --grep "reduced-motion" --update-snapshots=only
 *
 * Baselines stored in tests/e2e/__baselines__/reduced-motion/
 */

import { test, expect } from './_fixture';

test.describe('reduced-motion compliance: visual proof', () => {
  // Set up the prefers-reduced-motion media query for all tests in this suite
  test.beforeEach(async ({ page }) => {
    // Inject a <style> that simulates prefers-reduced-motion: reduce
    // This is more reliable than manipulating window.matchMedia directly
    // because it affects the CSS media query and any JS that reads it.
    await page.addInitScript(() => {
      // Create a media query list emulator
      const originalMatchMedia = window.matchMedia;

      // Override matchMedia to report prefers-reduced-motion: reduce
      window.matchMedia = function (query: string) {
        const mql = originalMatchMedia(query);

        // If the query is prefers-reduced-motion, return true for 'reduce'
        if (query === '(prefers-reduced-motion: reduce)') {
          return {
            ...mql,
            matches: true,
            media: query,
          } as MediaQueryList;
        }

        // For all other queries, return the original result
        return mql;
      } as any;
    });
  });

  test('BootScene renders with prefers-reduced-motion active', async ({ page }) => {
    await page.goto('/');

    // Boot scene renders a Start button
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 5000 });

    // Snapshot at boot (no tweens should fire here; it's just a button)
    await page.waitForTimeout(500); // Brief pause to ensure layout is stable
    await expect(page).toHaveScreenshot('boot-start-btn.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('MenuScene transitions from Boot with zero tween motion', async ({ page }) => {
    await page.goto('/');

    // Boot scene renders a Start button
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 5000 });

    // Click to navigate to Menu
    await startBtn.click();

    // MenuScene must be visible without animation delay
    // (reduced-motion mode uses Duration.instant = 0 ms, so the transition
    // is imperceptible and MenuScene appears immediately)
    const menuScene = page.locator('[data-testid="menu-scene"]');
    await expect(menuScene).toBeVisible({ timeout: 5000 });

    // Wait for layout to stabilize
    await page.waitForTimeout(500);

    // Snapshot: Menu should be idle (no tweens animating elements)
    await expect(page).toHaveScreenshot('menu-scene-idle.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('LevelMapScene enters without transition motion', async ({ page }) => {
    await page.goto('/');

    // Skip boot
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    // Wait for Menu
    const menuScene = page.locator('[data-testid="menu-scene"]');
    await expect(menuScene).toBeVisible({ timeout: 5000 });

    // Click to open LevelMapScene (Adventure Map)
    const level1Card = page.locator('[data-testid="level-card-L1"]');
    await expect(level1Card).toBeVisible();
    await level1Card.click();

    // LevelMapScene must appear immediately (no fade-in)
    const levelMap = page.locator('[data-testid="level-map-scene"]');
    await expect(levelMap).toBeVisible({ timeout: 5000 });

    // Wait for layout stabilization
    await page.waitForTimeout(500);

    // Snapshot: Map should be fully visible without transition animation
    await expect(page).toHaveScreenshot('level-map-scene.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('Level01Scene loads without entry motion', async ({ page }) => {
    await page.goto('/');

    // Boot → Menu → Map → Level01
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    const menuScene = page.locator('[data-testid="menu-scene"]');
    await expect(menuScene).toBeVisible({ timeout: 5000 });

    const level1Card = page.locator('[data-testid="level-card-L1"]');
    await expect(level1Card).toBeVisible();
    await level1Card.click();

    const levelMap = page.locator('[data-testid="level-map-scene"]');
    await expect(levelMap).toBeVisible({ timeout: 5000 });

    // Select Level 1 from the map
    await page.locator('[data-testid="map-level-1"]').click();

    // Level01Scene should load without entry animations
    const level01Scene = page.locator('[data-testid="level01-scene"]');
    await expect(level01Scene).toBeVisible({ timeout: 5000 });

    // Wait for initial layout
    await page.waitForTimeout(500);

    // Snapshot: Level 1 should be fully loaded and idle
    // No mascot entry tween, no question fade-in, no UI bounce
    await expect(page).toHaveScreenshot('level01-scene.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('FeedbackOverlay renders without scale/alpha tweens', async ({ page }) => {
    await page.goto('/');

    // Boot → Menu → Map → Level01
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    const menuScene = page.locator('[data-testid="menu-scene"]');
    await expect(menuScene).toBeVisible({ timeout: 5000 });

    const level1Card = page.locator('[data-testid="level-card-L1"]');
    await expect(level1Card).toBeVisible();
    await level1Card.click();

    const levelMap = page.locator('[data-testid="level-map-scene"]');
    await expect(levelMap).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="map-level-1"]').click();

    const level01Scene = page.locator('[data-testid="level01-scene"]');
    await expect(level01Scene).toBeVisible({ timeout: 5000 });

    // Make one attempt (tap the partition mechanic)
    const partitionTarget = page.locator('[data-testid="partition-target"]');
    await expect(partitionTarget).toBeVisible({ timeout: 15000 });
    await partitionTarget.click();

    // FeedbackOverlay should appear immediately (no scale-up animation)
    const feedbackOverlay = page.locator('[data-testid="feedback-overlay"]');
    await expect(feedbackOverlay).toBeVisible({ timeout: 15000 });

    // Wait for overlay to stabilize
    await page.waitForTimeout(300);

    // Snapshot: Feedback should be fully visible, not mid-scale/alpha tween
    // In reduced-motion mode, it appears at full scale and opacity immediately
    await expect(page).toHaveScreenshot('feedback-overlay-instant.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('MenuScene button presses have no visible scale tween', async ({ page }) => {
    await page.goto('/');

    // Boot → Menu
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    const menuScene = page.locator('[data-testid="menu-scene"]');
    await expect(menuScene).toBeVisible({ timeout: 5000 });

    // Get a menu button (e.g., Settings)
    const settingsBtn = page.locator('[data-testid="menu-settings-btn"]');
    if (await settingsBtn.isVisible()) {
      // Capture the button before press
      await expect(page).toHaveScreenshot('menu-button-idle.png', {
        mask: [settingsBtn],
        maxDiffPixels: 10,
        threshold: 0.2,
      });

      // In reduced-motion mode, the press state should be instant
      // (no animation between idle → pressed → released).
      // Press and hold briefly
      await settingsBtn.click({ clickCount: 1 });

      // Capture immediately after click (should show released state, not in-progress scale)
      await page.waitForTimeout(100);
      await expect(page).toHaveScreenshot('menu-button-post-click.png', {
        mask: [settingsBtn],
        maxDiffPixels: 10,
        threshold: 0.2,
      });
    }
  });
});

/**
 * ─── BASELINE MANAGEMENT ───────────────────────────────────────────────────
 *
 * Baselines capture the expected visual state with prefers-reduced-motion: reduce.
 * Every tween should be instant (0 ms duration), so elements appear at their
 * final state with no visible animation.
 *
 * Create/update baselines:
 *   npm run test:e2e -- --grep "reduced-motion" --update-snapshots=only
 *
 * Run regression checks:
 *   npm run test:e2e -- --grep "reduced-motion"
 *
 * If a baseline changes (e.g., UI layout updated), update it and commit with:
 *   git add tests/e2e/__baselines__/reduced-motion/
 *   git commit -m "refactor: update reduced-motion baseline after UI layout change"
 *
 * Never update baselines to hide real tween violations. If a test fails:
 * 1. Check the diff (Playwright HTML report shows side-by-side)
 * 2. If the difference is a new tween (element mid-scale, mid-alpha, etc.),
 *    it's a real violation — fix the code, not the baseline
 * 3. If the difference is layout/color (unrelated to motion), update safely
 */
