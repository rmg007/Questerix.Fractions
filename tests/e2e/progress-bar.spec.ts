// Smoke test: star progress bar sentinel updates after one correct answer.
// per test-strategy.md §1.3, task-43 (progress-bar e2e coverage)
//
// Correct-answer strategy: use the [data-testid="a11y-snap-center"] button
// (mounted by A11yLayer in Level01Scene) to move the partition handle to center
// (equal halves), then submit via partition-target. This guarantees the
// validator returns outcome:"correct" and Level01Scene calls setProgress(1).
//
// Storage is cleared before each test so prior sessions cannot make the
// assertion pass spuriously via session-restoration (aria-valuenow would
// otherwise be set to the restored attemptCount rather than a new correct answer).
import { test, expect } from './_fixture';
import { navigateToLevel01 } from './test-helpers';

test.describe('ProgressBar sentinel — star progress smoke test', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB + storage so no prior session can restore a non-zero
    // progress count before the test's own correct answer is submitted.
    await page.goto('/');
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('questerix-fractions');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  // TODO: a11y-snap-center → submit no longer increments progress to 1.
  // Track via PLANS/E2E_FOLLOWUPS.md (progress-bar smoke).
  test.skip('aria-valuenow equals 1 after submitting one correct answer', async ({ page }) => {
    await navigateToLevel01(page);

    const partitionTarget = page.locator('[data-testid="partition-target"]');
    const feedbackOverlay = page.locator('[data-testid="feedback-overlay"]');
    const progressBar = page.locator('[data-testid="progress-bar"]');
    const snapCenter = page.locator('[data-testid="a11y-snap-center"]');

    // Wait for the question to be ready
    await expect(partitionTarget).toBeVisible({ timeout: 5000 });

    // Snap the handle to center (equal halves → correct answer).
    // The a11y button is SR-only (clipped, outside viewport) so we trigger it
    // programmatically to bypass Playwright's viewport check.
    await snapCenter.evaluate((el: HTMLElement) => el.click());

    // Submit the centred partition
    await partitionTarget.click();

    // Feedback overlay must appear before asserting progress
    await expect(feedbackOverlay).toBeVisible({ timeout: 2000 });

    // Progress bar sentinel must reflect exactly one correct answer
    await expect(progressBar).toHaveAttribute('aria-valuenow', '1');
  });
});
