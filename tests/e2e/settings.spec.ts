/**
 * E2E tests for SettingsScene — open Settings, verify Export/Reset presence.
 * per test-strategy.md §1.3 (E2E happy path)
 */

import { test, expect } from './_fixture';

// TODO: settings.spec flakes in suite mode under CI conditions —
// boot timing / IndexedDB state shared across tests pushes both assertions
// past their 8s/3s sentinel timeouts. Track via PLANS/E2E_FOLLOWUPS.md
// (Cluster D — shared state flake).
test.describe.skip('Settings scene', () => {
  test('navigates Boot → Menu → Settings, renders settings-scene sentinel', async ({ page }) => {
    await page.goto('/');

    // Boot
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 8000 });
    await startBtn.click();

    // Menu
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 5000 });

    // Click Settings button overlay
    const settingsBtn = page.locator('[data-testid="settings-btn"]');
    await expect(settingsBtn).toBeVisible({ timeout: 3000 });
    await settingsBtn.click();

    // SettingsScene sentinel
    await expect(page.locator('[data-testid="settings-scene"]')).toBeVisible({ timeout: 5000 });
  });

  // TODO: passes in isolation but flakes in suite — same shared-IndexedDB
  // pattern as Cluster D in PLANS/E2E_FOLLOWUPS.md.
  test.skip('Settings scene exposes Export and Reset interactive buttons', async ({ page }) => {
    await page.goto('/');

    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 8000 });
    await startBtn.click();

    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 5000 });
    const settingsBtn = page.locator('[data-testid="settings-btn"]');
    await expect(settingsBtn).toBeVisible({ timeout: 3000 });
    await settingsBtn.click();

    await expect(page.locator('[data-testid="settings-scene"]')).toBeVisible({ timeout: 5000 });

    // Export and Reset overlays must be present
    await expect(page.locator('[data-testid="settings-export-btn"]')).toBeVisible({
      timeout: 3000,
    });
    await expect(page.locator('[data-testid="settings-reset-btn"]')).toBeVisible({ timeout: 3000 });

    // Back button present
    await expect(page.locator('[data-testid="settings-back-btn"]')).toBeVisible({ timeout: 3000 });
  });
});
