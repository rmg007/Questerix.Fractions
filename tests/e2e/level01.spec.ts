// Level 01 full flow: 5 attempts → completion screen
// per test-strategy.md §1.3, playtest-protocol.md §3/§5, accessibility.md §6
import { test, expect } from '@playwright/test';

// SKIP: All tests in this file require data-testid attributes not yet implemented in scenes:
// boot-start-btn, menu-scene, level-card-L1, level01-scene, partition-target,
// feedback-overlay, feedback-next-btn, progress-bar, completion-screen, hint-btn, hint-text.
test.describe('Level 01 — full 5-attempt flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testHooks=1');
    // Navigate Boot → Menu → Adventure Map → Level 1
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 15000 });
    // level-card-L1 now opens LevelMapScene (Adventure Map)
    await page.locator('[data-testid="level-card-L1"]').click();
    await expect(page.locator('[data-testid="level-map-scene"]')).toBeVisible({ timeout: 15000 });
    // Select Level 1 from the map
    await page.locator('[data-testid="map-level-1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 15000 });
  });

  test('completes 5 attempts and shows completion screen with ProgressBar 5/5', async ({
    page,
  }) => {
    const partitionTarget = page.locator('[data-testid="partition-target"]');
    const feedbackOverlay = page.locator('[data-testid="feedback-overlay"]');
    const feedbackNext = page.locator('[data-testid="feedback-next-btn"]');

    // Attempt 1–4: interact, wait for feedback, dismiss
    for (let i = 1; i <= 4; i++) {
      await expect(partitionTarget).toBeVisible({ timeout: 10000 });
      await partitionTarget.click();
      await expect(feedbackOverlay).toBeVisible({ timeout: 5000 });

      // ARIA-live region announces outcome per accessibility.md §6
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).not.toBeEmpty({ timeout: 500 });

      // Progress bar should reflect current attempt count
      const progressBar = page.locator('[data-testid="progress-bar"]');
      await expect(progressBar).toHaveAttribute('aria-valuenow', String(i));

      await feedbackNext.click();
      await expect(feedbackOverlay).toBeHidden({ timeout: 5000 });
    }

    // Attempt 5: the final attempt
    await expect(partitionTarget).toBeVisible({ timeout: 10000 });
    await partitionTarget.click();
    await expect(feedbackOverlay).toBeVisible({ timeout: 5000 });
    await feedbackNext.click();

    // Completion screen must appear
    const completionScreen = page.locator('[data-testid="completion-screen"]');
    await expect(completionScreen).toBeVisible({ timeout: 10000 });

    // ProgressBar shows 5/5
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '5');
    await expect(progressBar).toHaveAttribute('aria-valuemax', '5');

    // ARIA-live announces session completion per accessibility.md §6
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toContainText(/session complete|finished|problems/i);
  });

  test('drag-handle reaches center and submit produces feedback', async ({ page }) => {
    // Wait for the Level 1 scene and drag handle to be ready
    const dragHandle = page.locator('[data-testid="drag-handle"]');
    await expect(dragHandle).toBeVisible({ timeout: 10000 });

    // Drag the handle to the center of its bounding box (correct halves answer)
    const handleBox = await dragHandle.boundingBox();
    if (handleBox) {
      const canvasOrScene = page.locator('[data-testid="level01-scene"]');
      const sceneBox = await canvasOrScene.boundingBox();
      const targetX = sceneBox ? sceneBox.x + sceneBox.width / 2 : handleBox.x + handleBox.width / 2;
      const targetY = handleBox.y + handleBox.height / 2;
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetX, targetY, { steps: 10 });
      await page.mouse.up();
    }

    // Submit the answer via the submit/check button
    const submitBtn = page.locator('[data-testid="submit-btn"]');
    const partitionTarget = page.locator('[data-testid="partition-target"]');
    // Use whichever submit surface is present — some builds expose submit-btn,
    // others trigger via partition-target click
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
    } else {
      await expect(partitionTarget).toBeVisible({ timeout: 3000 });
      await partitionTarget.click();
    }

    // Feedback overlay must appear
    const feedbackOverlay = page.locator('[data-testid="feedback-overlay"]');
    await expect(feedbackOverlay).toBeVisible({ timeout: 5000 });

    // ARIA-live region announces outcome
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).not.toBeEmpty({ timeout: 1000 });

    // Progress bar reflects that one attempt was made
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '1', { timeout: 3000 });
  });

  test('hint button is reachable and announces text via ARIA per accessibility.md §6', async ({
    page,
  }) => {
    const partitionTarget = page.locator('[data-testid="partition-target"]');
    await expect(partitionTarget).toBeVisible({ timeout: 10000 });

    const hintBtn = page.locator('[data-testid="hint-btn"]');
    await expect(hintBtn).toBeVisible();

    // Activate hint
    await hintBtn.click();
    const hintText = page.locator('[data-testid="hint-text"]');
    await expect(hintText).toBeVisible({ timeout: 5000 });
  });
});
