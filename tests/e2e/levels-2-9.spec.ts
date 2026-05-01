/**
 * L2–L9 lightweight smoke tests.
 *
 * Goal: verify each level scene loads without crashing.
 * These tests do NOT exercise full interaction flows — they only confirm the
 * level-scene sentinel is mounted (scene started successfully).
 *
 * Navigation strategy:
 *   - Levels 2–5, 8–9: no level-card sentinel exists in MenuScene yet;
 *     the LevelMapScene provides navigation. Tests use `test.fixme` until
 *     the relevant level-card test hook stubs are wired up.
 *   - Levels 6–7: MenuScene already mounts `level-card-L6` / `level-card-L7`
 *     interactive sentinels, so those levels get a live smoke path.
 *
 * per test-strategy.md §1.3 — sentinels mirror active scene/state.
 */

import { test, expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Boot the app and land on the MenuScene.
 * Re-used by every test that needs to start from the main menu.
 */
async function navigateToMenu(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  const startBtn = page.locator('[data-testid="boot-start-btn"]');
  await expect(startBtn).toBeVisible({ timeout: 8000 });
  await startBtn.click();
  await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 5000 });
}

/**
 * Assert that `level-scene` AND the per-level `levelNN-scene` sentinel appear.
 * LevelScene mounts both on create().
 */
async function expectLevelSceneLoaded(
  page: import('@playwright/test').Page,
  levelNumber: number
): Promise<void> {
  const levelId = `level${String(levelNumber).padStart(2, '0')}-scene`;
  await expect(page.locator('[data-testid="level-scene"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator(`[data-testid="${levelId}"]`)).toBeVisible({ timeout: 3000 });
}

// ── Level 2 ──────────────────────────────────────────────────────────────────

test.describe('Level 02 — smoke', () => {
  test.fixme(
    'navigates to L2 and level-scene sentinel is mounted',
    // fixme: `level-card-L2` interactive stub not yet wired in MenuScene /
    // LevelMapScene. Add the TestHooks.mountInteractive call for L2 and remove fixme.
    async ({ page }) => {
      await navigateToMenu(page);
      await page.locator('[data-testid="level-card-L2"]').click();
      await expectLevelSceneLoaded(page, 2);
    }
  );
});

// ── Level 3 ──────────────────────────────────────────────────────────────────

test.describe('Level 03 — smoke', () => {
  test.fixme(
    'navigates to L3 and level-scene sentinel is mounted',
    // fixme: `level-card-L3` interactive stub not yet wired in MenuScene /
    // LevelMapScene.
    async ({ page }) => {
      await navigateToMenu(page);
      await page.locator('[data-testid="level-card-L3"]').click();
      await expectLevelSceneLoaded(page, 3);
    }
  );
});

// ── Level 4 ──────────────────────────────────────────────────────────────────

test.describe('Level 04 — smoke', () => {
  test.fixme(
    'navigates to L4 and level-scene sentinel is mounted',
    // fixme: `level-card-L4` interactive stub not yet wired in MenuScene /
    // LevelMapScene.
    async ({ page }) => {
      await navigateToMenu(page);
      await page.locator('[data-testid="level-card-L4"]').click();
      await expectLevelSceneLoaded(page, 4);
    }
  );
});

// ── Level 5 ──────────────────────────────────────────────────────────────────

test.describe('Level 05 — smoke', () => {
  test.fixme(
    'navigates to L5 and level-scene sentinel is mounted',
    // fixme: `level-card-L5` interactive stub not yet wired in MenuScene /
    // LevelMapScene.
    async ({ page }) => {
      await navigateToMenu(page);
      await page.locator('[data-testid="level-card-L5"]').click();
      await expectLevelSceneLoaded(page, 5);
    }
  );
});

// ── Level 6 — live (level-card-L6 wired in MenuScene) ────────────────────────

test.describe('Level 06 — smoke', () => {
  test('navigates to L6 via level-card-L6 and level-scene sentinel is mounted', async ({
    page,
  }) => {
    await navigateToMenu(page);
    // MenuScene already mounts an interactive sentinel for L6.
    await page.locator('[data-testid="level-card-L6"]').click();
    await expectLevelSceneLoaded(page, 6);
    // Also verify the progress bar sentinel appears (LevelScene mounts it).
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible({ timeout: 5000 });
  });
});

// ── Level 7 — live (level-card-L7 wired in MenuScene) ────────────────────────

test.describe('Level 07 — smoke', () => {
  test('navigates to L7 via level-card-L7 and level-scene sentinel is mounted', async ({
    page,
  }) => {
    await navigateToMenu(page);
    // MenuScene already mounts an interactive sentinel for L7.
    await page.locator('[data-testid="level-card-L7"]').click();
    await expectLevelSceneLoaded(page, 7);
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible({ timeout: 5000 });
  });
});

// ── Level 8 ──────────────────────────────────────────────────────────────────

test.describe('Level 08 — smoke', () => {
  test.fixme(
    'navigates to L8 and level-scene sentinel is mounted',
    // fixme: `level-card-L8` interactive stub not yet wired in MenuScene /
    // LevelMapScene.
    async ({ page }) => {
      await navigateToMenu(page);
      await page.locator('[data-testid="level-card-L8"]').click();
      await expectLevelSceneLoaded(page, 8);
    }
  );
});

// ── Level 9 ──────────────────────────────────────────────────────────────────

test.describe('Level 09 — smoke', () => {
  test.fixme(
    'navigates to L9 and level-scene sentinel is mounted',
    // fixme: `level-card-L9` interactive stub not yet wired in MenuScene /
    // LevelMapScene.
    async ({ page }) => {
      await navigateToMenu(page);
      await page.locator('[data-testid="level-card-L9"]').click();
      await expectLevelSceneLoaded(page, 9);
    }
  );
});
