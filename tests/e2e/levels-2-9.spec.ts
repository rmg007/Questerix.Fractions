/**
 * Levels 2–9 smoke tests.
 *
 * Verifies that each level scene loads without crashing and renders the
 * `progress-bar` sentinel, which ProgressBar.ts mounts as soon as the scene
 * is active.
 *
 * Navigation strategy:
 *   - L6, L7 — MenuScene exposes off-canvas `level-card-L6` / `level-card-L7`
 *               interactive overlays that bypass the Adventure Map, so these
 *               tests run without unlocking anything in storage.
 *   - L2–L5, L8–L9 — LevelMapScene only mounts interactive `map-level-<N>`
 *               buttons for already-unlocked levels (level 1 is the only one
 *               unlocked by default).  No direct shortcut exists in the current
 *               codebase, so these tests are marked fixme until a test-hook
 *               shortcut or forced-unlock param is added.
 *
 * per test-strategy.md §1.3, TestHooks.ts sentinel conventions.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Navigate to MenuScene (Boot → menu-scene). */
async function navigateToMenu(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 15000 });
  await page.locator('[data-testid="boot-start-btn"]').click();
  await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 15000 });
}

/**
 * Navigate directly to a LevelScene that has a MenuScene shortcut hook.
 * Currently only L6 and L7 expose `level-card-L6` / `level-card-L7`.
 */
async function navigateToLevelViaMenuShortcut(page: Page, level: 6 | 7): Promise<void> {
  await navigateToMenu(page);
  await page.locator(`[data-testid="level-card-L${level}"]`).click();
  // LevelScene mounts the per-level sentinel levelNN-scene
  const levelId = `level${String(level).padStart(2, '0')}-scene`;
  await expect(page.locator(`[data-testid="${levelId}"]`)).toBeAttached({ timeout: 15000 });
}

// ── L6 ────────────────────────────────────────────────────────────────────────

test.describe('Level 6 — smoke', () => {
  test('loads Level 6 scene without crashing', async ({ page }) => {
    await navigateToLevelViaMenuShortcut(page, 6);
  });

  test('Level 6 scene renders progress-bar sentinel', async ({ page }) => {
    await navigateToLevelViaMenuShortcut(page, 6);
    // ProgressBar.ts mounts the progress-bar sentinel in its constructor.
    await expect(page.locator('[data-testid="progress-bar"]')).toBeAttached({ timeout: 10000 });
  });
});

// ── L7 ────────────────────────────────────────────────────────────────────────

test.describe('Level 7 — smoke', () => {
  test('loads Level 7 scene without crashing', async ({ page }) => {
    await navigateToLevelViaMenuShortcut(page, 7);
  });

  test('Level 7 scene renders progress-bar sentinel', async ({ page }) => {
    await navigateToLevelViaMenuShortcut(page, 7);
    await expect(page.locator('[data-testid="progress-bar"]')).toBeAttached({ timeout: 10000 });
  });
});

// ── L2–L5, L8–L9 (fixme — no direct shortcuts yet) ───────────────────────────
//
// LevelMapScene only exposes `map-level-<N>` interactive buttons for levels
// that are already in the student's unlocked set (default: level 1 only).
// Until a `?unlockAll=1` test param or per-level MenuScene shortcut is added,
// these tests cannot navigate past the locked node.
//
// Tracking issue: add `level-card-L{N}` hooks to MenuScene (matching the L6/L7
// pattern) or a forced-unlock URL param so all levels are reachable in test mode.

for (const level of [2, 3, 4, 5, 8, 9] as const) {
  test.describe(`Level ${level} — smoke (fixme: no unlock shortcut)`, () => {
    test.fixme(
      `loads Level ${level} scene without crashing`,
      async ({ page }) => {
        // When a direct shortcut exists, replace this body with:
        //   await navigateToLevelViaMenuShortcut(page, level);
        //   const levelId = `level${String(level).padStart(2, '0')}-scene`;
        //   await expect(page.locator(`[data-testid="${levelId}"]`)).toBeAttached({ timeout: 15000 });
        await navigateToMenu(page);
        // Navigate to Adventure Map and attempt to click the (still-locked) node.
        await page.locator('[data-testid="level-card-L1"]').click();
        await expect(page.locator('[data-testid="level-map-scene"]')).toBeVisible({
          timeout: 15000,
        });
        // map-level-<N> is only present for unlocked levels — this assertion
        // documents the current gap and will start failing (usefully) once
        // unlock shortcuts are wired up.
        await expect(page.locator(`[data-testid="map-level-${level}"]`)).toBeAttached({
          timeout: 3000,
        });
      }
    );

    test.fixme(
      `Level ${level} scene renders progress-bar sentinel`,
      async ({ page }) => {
        // Dependent on the navigation fixme above.
        await navigateToMenu(page);
        const levelId = `level${String(level).padStart(2, '0')}-scene`;
        await expect(page.locator(`[data-testid="${levelId}"]`)).toBeAttached({ timeout: 15000 });
        await expect(page.locator('[data-testid="progress-bar"]')).toBeAttached({ timeout: 10000 });
      }
    );
  });
}
