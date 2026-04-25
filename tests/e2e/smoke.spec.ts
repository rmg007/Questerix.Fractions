// Smoke test: Boot → Menu → Level01 first attempt
// per test-strategy.md §1.3 (E2E happy path) and playtest-protocol.md §4
import { test, expect } from '@playwright/test';

test.describe('Smoke — boot to first attempt', () => {
  test('boots app, navigates Boot→Menu→L1, renders FeedbackOverlay within 1000ms', async ({ page }) => {
    // SKIP: data-testid attributes (boot-start-btn, menu-scene, level-card-L1, level01-scene,
    // partition-target, feedback-overlay) are not yet implemented in scenes.
    await page.goto('/');

    // Boot scene renders a Start button
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 5000 });

    // Navigate to Menu
    await startBtn.click();
    const menuScene = page.locator('[data-testid="menu-scene"]');
    await expect(menuScene).toBeVisible({ timeout: 3000 });

    // Select Level 1
    const level1Card = page.locator('[data-testid="level-card-L1"]');
    await expect(level1Card).toBeVisible();
    await level1Card.click();

    // Level 1 activity canvas / scene loads
    const activityScene = page.locator('[data-testid="level01-scene"]');
    await expect(activityScene).toBeVisible({ timeout: 5000 });

    // Interact with the partition mechanic — locate the primary drag/tap target
    const partitionTarget = page.locator('[data-testid="partition-target"]');
    await expect(partitionTarget).toBeVisible({ timeout: 3000 });

    // Tap/click the partition mechanic to make one attempt
    const t0 = Date.now();
    await partitionTarget.click();

    // FeedbackOverlay must appear within 1000 ms of the interaction
    // per accessibility.md §6 (ARIA-live outcome announcements)
    const feedback = page.locator('[data-testid="feedback-overlay"]');
    await expect(feedback).toBeVisible({ timeout: 1000 });
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});
