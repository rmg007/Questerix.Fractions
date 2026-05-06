/**
 * Phase 5 — Audio degradation E2E test.
 *
 * Verifies that blocking all audio assets does NOT trigger RecoveryScene —
 * the game must degrade gracefully and continue to boot.
 */
import { test, expect } from '../_fixture';

const BOOT_TIMEOUT = 12_000;

test.describe('Audio degradation', () => {
  test('boots with all audio blocked — no RecoveryScene', async ({ page }) => {
    // Block all common audio formats before navigation
    await page.route('**/*.mp3', (route) => route.abort());
    await page.route('**/*.ogg', (route) => route.abort());
    await page.route('**/*.wav', (route) => route.abort());
    await page.route('**/audio/**', (route) => route.abort());

    await page.goto('/');

    // BootScene sentinel must appear — game booted successfully
    const bootSentinel = page.locator('[data-testid="boot-scene"]');
    await expect(bootSentinel).toBeVisible({ timeout: BOOT_TIMEOUT });

    // RecoveryScene must NOT appear after audio block
    const recoveryCta = page.locator('[data-testid="recovery-retry-btn"]');
    await expect(recoveryCta).not.toBeAttached({ timeout: 3_000 });
  });

  test('recovery-retry-btn never attaches when audio is blocked', async ({ page }) => {
    await page.route('**/*.mp3', (route) => route.abort());
    await page.route('**/*.ogg', (route) => route.abort());
    await page.route('**/*.wav', (route) => route.abort());

    await page.goto('/');

    await page.waitForTimeout(4_000);

    const recoveryCta = page.locator('[data-testid="recovery-retry-btn"]');
    await expect(recoveryCta).not.toBeAttached();
  });
});
