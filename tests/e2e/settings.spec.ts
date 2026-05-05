/**
 * E2E tests for SettingsScene — open Settings, verify Export/Reset presence.
 * per test-strategy.md §1.3 (E2E happy path)
 *
 * Flake in suite mode (Cluster D) fixed in Phase 15 via IndexedDB cleanup in beforeEach.
 */

import { test, expect } from './_fixture';

test.describe('Settings scene', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB state before each test to prevent shared state leaks
    // (Cluster D flake: IndexedDB state was persisting across tests in suite mode)
    // Must navigate to the app origin first — IndexedDB is unavailable on about:blank
    // (SecurityError: Access to the IndexedDB API is denied in this context).
    await page.goto('/');
    await page.evaluate(async () => {
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        const dbs = (await window.indexedDB.databases?.()) || [];
        for (const dbInfo of dbs) {
          if (dbInfo.name === 'questerix-fractions') {
            window.indexedDB.deleteDatabase('questerix-fractions');
          }
        }
      }
    });
  });

  test('navigates Boot → Menu → Settings, renders settings-scene sentinel', async ({ page }) => {
    await page.goto('/');

    // Boot
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 8000 });
    await startBtn.click();

    // Menu
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });

    // Click Settings button overlay
    const settingsBtn = page.locator('[data-testid="settings-btn"]');
    await expect(settingsBtn).toBeVisible({ timeout: 3000 });
    await settingsBtn.click();

    // SettingsScene sentinel
    await expect(page.locator('[data-testid="settings-scene"]')).toBeVisible({ timeout: 5000 });
  });

  test('Settings scene exposes Export and Reset interactive buttons', async ({ page }) => {
    await page.goto('/');

    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 8000 });
    await startBtn.click();

    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 10000 });
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
