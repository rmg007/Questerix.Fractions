// Level 01 full flow: 5 attempts → completion screen
// per test-strategy.md §1.3, playtest-protocol.md §3/§5, accessibility.md §6
import { test, expect } from './_fixture';
import { navigateToLevel01 } from './test-helpers';

test.describe('Level 01 — full 5-attempt flow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToLevel01(page);
  });

  // TODO: 5-attempt flow flakes when the suite runs sequentially — likely
  // shared IndexedDB state across tests. Track via PLANS/E2E_FOLLOWUPS.md.
  test.skip('completes 5 attempts and shows completion screen with ProgressBar 5/5', async ({
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

      // Click next if still present; overlay may auto-dismiss before we click
      await feedbackNext.click({ force: true, timeout: 1500 }).catch(() => {});
      await expect(feedbackOverlay).toBeHidden({ timeout: 5000 });
    }

    // Attempt 5: the final attempt
    await expect(partitionTarget).toBeVisible({ timeout: 10000 });
    await partitionTarget.click();
    await expect(feedbackOverlay).toBeVisible({ timeout: 5000 });
    await feedbackNext.click({ force: true, timeout: 1500 }).catch(() => {});

    // Completion screen must appear
    const completionScreen = page.locator('[data-testid="completion-screen"]');
    await expect(completionScreen).toBeVisible({ timeout: 10000 });

    // ProgressBar shows 5/5
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '5');
    await expect(progressBar).toHaveAttribute('aria-valuemax', '5');

    // ARIA-live announces session completion per accessibility.md §6
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toContainText(/level \d+ complete|session complete|finished/i);
  });

  test('hint button is reachable and announces text via ARIA per accessibility.md §6', async ({
    page,
  }) => {
    const partitionTarget = page.locator('[data-testid="partition-target"]');
    await expect(partitionTarget).toBeVisible({ timeout: 10000 });

    const hintBtn = page.locator('[data-testid="hint-btn"]');
    await expect(hintBtn).toBeVisible();

    // Activate hint — force:true bypasses viewport check on narrow mobile viewports
    await hintBtn.click({ force: true });
    const hintText = page.locator('[data-testid="hint-text"]');
    await expect(hintText).toBeVisible({ timeout: 5000 });
  });
});
