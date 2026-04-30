/**
 * Sprint 5 Happy-path E2E test: Start → Menu → L1 → 5 questions → completion → back to menu
 * Tests full session flow with timing measurements.
 * per test-strategy.md §1.3 and playtest-protocol.md §3/§5
 */

import { test, expect } from './_fixture';
import { navigateToLevel01, doAttempt } from './test-helpers';

test.describe('Happy Path — Start → Menu → L1 → 5Q → Completion → Menu', () => {
  test('completes full session: 5 attempts → completion screen → back to menu', async ({
    page,
  }) => {
    const startTime = Date.now();

    // Step 1: Boot → Menu
    await page.goto('/');
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 15000 });
    await startBtn.click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 15000 });

    const bootToMenuMs = Date.now() - startTime;

    // Step 2: Menu → Adventure Map → Level 1
    const level1Card = page.locator('[data-testid="level-card-L1"]');
    await expect(level1Card).toBeVisible();
    await level1Card.click();
    await expect(page.locator('[data-testid="level-map-scene"]')).toBeVisible({
      timeout: 15000,
    });

    // Step 3: Adventure Map → Level 01 Scene
    await page.locator('[data-testid="map-level-1"]').click();
    const level01Scene = page.locator('[data-testid="level01-scene"]');
    await expect(level01Scene).toBeVisible({ timeout: 15000 });

    const bootToLevel01Ms = Date.now() - startTime;

    // Step 4: Complete 5 attempts
    const attemptTimings: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const attemptStart = Date.now();
      const elapsedMs = await doAttempt(page);
      attemptTimings.push(elapsedMs);

      if (i < 5) {
        // Verify progress bar updates for attempts 1-4
        const progressBar = page.locator('[data-testid="progress-bar"]');
        await expect(progressBar).toHaveAttribute('aria-valuenow', String(i), {
          timeout: 3000,
        });
      }
    }

    const allAttemptsMs = Date.now() - startTime - bootToLevel01Ms;

    // Step 5: Verify completion screen appears
    const completionScreen = page.locator('[data-testid="completion-screen"]');
    await expect(completionScreen).toBeVisible({ timeout: 15000 });

    // Verify progress bar shows 5/5
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '5', { timeout: 3000 });
    await expect(progressBar).toHaveAttribute('aria-valuemax', '5', { timeout: 3000 });

    // Verify ARIA-live region announces completion
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toContainText(/session complete|finished|problems|congratulations/i, {
      timeout: 3000,
    });

    const completionMs = Date.now() - startTime;

    // Step 6: Navigate back to menu
    const backBtn = page.locator('[data-testid="completion-back-btn"]');
    await expect(backBtn).toBeVisible({ timeout: 3000 });
    await backBtn.click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 15000 });

    const fullSessionMs = Date.now() - startTime;

    // Report timings
    console.log('Happy-path timings:');
    console.log(`  Boot → Menu: ${bootToMenuMs}ms`);
    console.log(`  Boot → Level01 Scene: ${bootToLevel01Ms}ms`);
    console.log(`  All 5 attempts: ${allAttemptsMs}ms`);
    console.log(`  Individual attempt timings (feedback response):`, attemptTimings);
    console.log(`  Boot → Completion: ${completionMs}ms`);
    console.log(`  Full session (back to menu): ${fullSessionMs}ms`);

    // Sanity checks on timings
    expect(bootToMenuMs).toBeLessThan(20000);
    expect(bootToLevel01Ms).toBeLessThan(35000);
    expect(allAttemptsMs).toBeLessThan(60000);
    expect(fullSessionMs).toBeLessThan(90000);
    expect(attemptTimings.every((t) => t < 5000)).toBe(true);
  });

  test('hint button is accessible throughout session', async ({ page }) => {
    await navigateToLevel01(page);

    // Verify hint button is visible before first attempt
    const hintBtn = page.locator('[data-testid="hint-btn"]');
    await expect(hintBtn).toBeVisible({ timeout: 5000 });

    // Click hint and verify text appears
    await hintBtn.click();
    const hintText = page.locator('[data-testid="hint-text"]');
    await expect(hintText).toBeVisible({ timeout: 3000 });

    // Close hint and continue with an attempt
    const closeHint = page.locator('[data-testid="hint-close-btn"]');
    if ((await closeHint.isVisible().catch(() => false))) {
      await closeHint.click();
      await expect(hintText).toBeHidden({ timeout: 2000 });
    }

    // Do one attempt
    await doAttempt(page);

    // Hint button should still be accessible
    await expect(hintBtn).toBeVisible();
  });

  test('progress is tracked across all 5 attempts', async ({ page }) => {
    await navigateToLevel01(page);

    const progressBar = page.locator('[data-testid="progress-bar"]');

    // Attempt 1
    await doAttempt(page);
    await expect(progressBar).toHaveAttribute('aria-valuenow', '1', { timeout: 3000 });

    // Attempt 2
    await doAttempt(page);
    await expect(progressBar).toHaveAttribute('aria-valuenow', '2', { timeout: 3000 });

    // Attempt 3
    await doAttempt(page);
    await expect(progressBar).toHaveAttribute('aria-valuenow', '3', { timeout: 3000 });

    // Attempt 4
    await doAttempt(page);
    await expect(progressBar).toHaveAttribute('aria-valuenow', '4', { timeout: 3000 });

    // Attempt 5 → completion
    const partitionTarget = page.locator('[data-testid="partition-target"]');
    const feedbackOverlay = page.locator('[data-testid="feedback-overlay"]');
    const feedbackNext = page.locator('[data-testid="feedback-next-btn"]');

    await expect(partitionTarget).toBeVisible({ timeout: 10000 });
    await partitionTarget.click();
    await expect(feedbackOverlay).toBeVisible({ timeout: 1000 });
    await feedbackNext.click();

    // Completion screen should appear
    const completionScreen = page.locator('[data-testid="completion-screen"]');
    await expect(completionScreen).toBeVisible({ timeout: 10000 });

    // Progress bar shows 5/5
    await expect(progressBar).toHaveAttribute('aria-valuenow', '5', { timeout: 3000 });
  });
});
