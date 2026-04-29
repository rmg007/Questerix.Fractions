/**
 * Quest voice wiring — end-to-end smoke (per ux-elevation §9 T28).
 *
 * Asserts that the level screen actually renders Quest-voiced microcopy
 * — not the legacy strategy-tier fallback — by booting through the real
 * scene chain, pulling a hint, and reading the visible text from the
 * `hint-text` test sentinel that LevelScene mirrors via TestHooks.
 *
 * Why L6? It routes through the generic LevelScene (not Level01Scene),
 * so the wiring under test is exercised. L6's first question is
 * archetype `equal_or_not` whose hint is tier-agnostic and denominator-
 * driven (split2/3/4) — the hint string is therefore deterministic from
 * the catalog regardless of which template loads.
 *
 * Companion to:
 *   - tests/unit/i18n/questWiring.test.ts (catalog string contract)
 *   - tests/unit/scenes/LevelSceneQuestWiring.test.ts (helper behavior)
 *   - tests/unit/i18n/questCatalog.test.ts (lint + persona gates)
 */
import { test, expect } from '@playwright/test';

test.describe('Quest voice wiring (T28) — e2e smoke', () => {
  test('hint pulled in L6 renders the partition-shaped Quest line', async ({ page }) => {
    // testHooks=1 enables the invisible interactive overlays that drive
    // boot → menu → level navigation in the e2e harness.
    await page.goto('/?testHooks=1');

    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="boot-start-btn"]').click();

    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 3000 });
    // L6 is wired by MenuScene.create() at top:50% / left:10% as a
    // transparent test affordance — it routes to the generic LevelScene.
    await page.locator('[data-testid="level-card-L6"]').click();
    await expect(page.locator('[data-testid="level-scene"]')).toBeVisible({ timeout: 5000 });

    // Pull a hint via the test-hook hint button (mounted upper-right).
    await page.locator('[data-testid="hint-btn"]').click();

    // The hint-text sentinel mirrors whatever LevelScene wrote.
    // For partition / equal_or_not the catalog returns one of three
    // denominator-shaped Quest lines verbatim.
    const hint = page.locator('[data-testid="hint-text"]');
    await expect(hint).toHaveText(/^Hmm\. I can split this in (two|three|four)\.$/, {
      timeout: 3000,
    });
  });

  test('feedback overlay surfaces the Quest wrong line on an incorrect answer', async ({
    page,
  }) => {
    await page.goto('/?testHooks=1');
    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="level-card-L6"]').click();
    await expect(page.locator('[data-testid="level-scene"]')).toBeVisible({ timeout: 5000 });

    // L6 is equal_or_not — the validator's correct answer flips per
    // template, so click both buttons in sequence: at least one is wrong.
    // After a wrong answer, FeedbackOverlay mirrors its visible label
    // text into the `feedback-overlay` sentinel; we assert the Quest
    // wrong line appears on the screen at any point during the attempt.
    const yes = page.locator('[data-testid="equal-or-not-yes"]');
    const no = page.locator('[data-testid="equal-or-not-no"]');
    await expect(yes.or(no)).toBeVisible({ timeout: 5000 });

    // Click No first; if it was correct, click Yes next attempt.
    await no.click();
    const overlay = page.locator('[data-testid="feedback-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 1500 });
    const labelAfterFirst = (await overlay.textContent()) ?? '';
    if (!labelAfterFirst.includes('Try again. The parts are not equal.')) {
      // First answer was correct; the overlay auto-dismisses, so wait
      // for the next question and try the other button.
      await expect(overlay).toBeHidden({ timeout: 2000 });
      await yes.click();
      await expect(overlay).toBeVisible({ timeout: 1500 });
    }
    await expect(overlay).toContainText('Try again. The parts are not equal.', {
      timeout: 1500,
    });
  });
});
