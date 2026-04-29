/**
 * Quest voice wiring — end-to-end smoke (per ux-elevation §9 T28).
 *
 * Asserts that the level screen actually renders Quest-voiced microcopy
 * — not a strategy-tier fallback — by booting through the real scene
 * chain, pulling a hint, and reading the visible text from the
 * `hint-text` test sentinel that LevelScene mirrors via TestHooks.
 *
 * Why L6 (and not L2/L3)? Only L1, L6, L7 expose level-card test IDs
 * in MenuScene, and L1 routes to its bespoke Level01Scene rather than
 * the generic LevelScene under test. L6 and L7 both route to LevelScene
 * with the `compare` archetype — deterministic by construction since
 * questionTemplateRepo.getByLevel returns templates in seeded primary-
 * key order (see explore notes in PR #28). The first hint click on a
 * fresh question goes through HintLadder.next() which returns tier
 * 'verbal' for the default 'easy' difficulty, so the rendered string is
 * exactly the catalog entry `quest.hint.compare.verbal`.
 *
 * Wrong-answer feedback wiring is not e2e-tested here because the
 * compare interaction's relation buttons are not test-idented — adding
 * those test IDs would expand scope beyond T28. That code path is
 * covered exhaustively at the unit level by:
 *   - tests/unit/scenes/LevelSceneQuestWiring.test.ts
 *     (questFeedbackText cases for both denominator-keyed correct and
 *     wrong.unequal feedback, plus the defensive guard)
 *   - tests/unit/i18n/questCatalog.test.ts (string contract + linter)
 *   - tests/unit/i18n/questWiring.test.ts (parameterized contract)
 */
import { test, expect } from '@playwright/test';

test.describe('Quest voice wiring (T28) — e2e smoke', () => {
  test('first hint in L6 renders the Quest verbal tier line for compare', async ({ page }) => {
    // testHooks=1 enables transparent overlay buttons that drive
    // boot → menu → level navigation in the e2e harness.
    await page.goto('/?testHooks=1');

    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="boot-start-btn"]').click();

    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="level-card-L6"]').click();
    await expect(page.locator('[data-testid="level-scene"]')).toBeVisible({ timeout: 5000 });

    // Pull the first hint via the test-hook hint button.
    // HintLadder.next() returns 'verbal' for tier 0 with default
    // 'easy' difficulty, so the catalog lookup resolves to
    // `quest.hint.compare.verbal` — pinned by questCatalog.test.ts to
    // the exact string asserted below.
    await page.locator('[data-testid="hint-btn"]').click();

    const hint = page.locator('[data-testid="hint-text"]');
    await expect(hint).toHaveText('Which one is bigger? Take a look.', {
      timeout: 3000,
    });
  });
});
