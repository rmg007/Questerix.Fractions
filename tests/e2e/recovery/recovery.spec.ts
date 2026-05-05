/**
 * Recovery flow E2E tests — crash-and-recovery plan Phase 4.
 *
 * Covers:
 * 1. Scene-level throw → RecoveryScene with both CTAs visible
 * 2. Curriculum bundle 500 → curriculum-fail recovery variant
 *
 * Tests run against the dev server (see playwright.config.ts baseURL).
 * They rely on data-testid sentinels mounted by TestHooks.
 */
import { test, expect } from '../_fixture';

// Timeout budget for these tests: recovery scenes may need extra time to appear.
const RECOVERY_TIMEOUT = 12_000;
const BOOT_TIMEOUT = 8_000;

test.describe('Recovery flows', () => {
  test('error in window dispatches recovery — RecoveryScene shows both CTAs', async ({ page }) => {
    await page.goto('/');

    // Wait for boot to complete
    const bootSentinel = page.locator('[data-testid="boot-scene"]');
    await expect(bootSentinel).toBeVisible({ timeout: BOOT_TIMEOUT });

    // Inject a window error to trigger the global error boundary.
    // We use evaluateHandle so the error fires in the page context.
    await page.evaluate(() => {
      // Dispatch a window error event manually so the error boundary fires.
      // In a real scenario this would be an unhandled throw inside a scene.
      const err = new Error('E2E injected scene error');
      window.dispatchEvent(new ErrorEvent('error', { error: err, message: err.message }));
    });

    // RecoveryScene should appear.  We target the a11y buttons it registers.
    const retryBtn = page.locator('[data-a11y-id="recovery-retry-btn"]');
    const menuBtn = page.locator('[data-a11y-id="recovery-menu-btn"]');

    await expect(retryBtn).toBeAttached({ timeout: RECOVERY_TIMEOUT });
    await expect(menuBtn).toBeAttached({ timeout: RECOVERY_TIMEOUT });
  });

  test('curriculum bundle 500 → curriculum-fail RecoveryScene', async ({ page }) => {
    // Intercept the curriculum bundle request and return a 500 so the loader fails.
    await page.route('**/curriculum/v1.json', (route) => {
      void route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    // Also intercept the bundled-fallback import path by making bundle.json invalid.
    // The loader tries static import as a fallback; we can't intercept ES modules,
    // so we rely on the HTTP-error path triggering the loaderEvents signal.
    // The loader emits 'curriculumLoadFailed' on a non-ok HTTP status.

    await page.goto('/');

    // Boot sentinel
    const bootSentinel = page.locator('[data-testid="boot-scene"]');
    await expect(bootSentinel).toBeVisible({ timeout: BOOT_TIMEOUT });

    // Advance past boot
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    // PreloadScene should detect the curriculum failure and route to RecoveryScene.
    // The curriculum-fail variant shows the "Reload content" CTA.
    const reloadBtn = page.locator('[data-a11y-id="recovery-retry-btn"]');
    await expect(reloadBtn).toBeAttached({ timeout: RECOVERY_TIMEOUT });

    // "Back to menu" CTA should also be present
    const menuBtn = page.locator('[data-a11y-id="recovery-menu-btn"]');
    await expect(menuBtn).toBeAttached({ timeout: RECOVERY_TIMEOUT });
  });
});
