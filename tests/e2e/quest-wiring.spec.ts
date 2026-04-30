/**
 * Quest voice wiring — e2e smoke (ux-elevation §9 T28).
 *
 * Boots through the real scene chain to L6 (compare archetype) and
 * proves wrong-answer feedback round-trips through the catalog:
 *   wrong answer → `quest.feedback.wrong.unequal`
 *
 * Determinism: questionTemplateRepo.getByLevel returns templates in
 * seeded primary-key order, so q:cmp:L6:0001 always loads first. That
 * template is fractionA=1/3, fractionB=2/3 — bottom is bigger ('<').
 * Clicking the 'Top is bigger' (>) button is therefore a deterministic
 * wrong answer regardless of build flags or RNG.
 *
 * Companion to:
 *   - tests/unit/i18n/questWiring.test.ts (catalog string contract)
 *   - tests/unit/scenes/LevelSceneQuestWiring.test.ts (helper behavior)
 *   - tests/unit/i18n/questCatalog.test.ts (lint + persona gates)
 */
import { test, expect } from '@playwright/test';

test.describe('Quest voice wiring (T28) — e2e smoke', () => {
  test('first hint in L6 renders the Quest verbal tier line for compare', async ({ page }) => {
    await page.goto('/?testHooks=1');
    await expect(page.locator('[data-testid="boot-start-btn"]').first()).toBeVisible({ timeout: 5000 });
    // Wait for the curriculum seed to finish before advancing
    await expect(page.locator('[data-testid="seed-complete"]').first()).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]').first()).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="level-card-L6"]').click();
    await expect(page.locator('[data-testid="level-scene"]').first()).toBeVisible({ timeout: 5000 });

    // Pull a hint via the test-hook hint button (mounted upper-right).
    await page.locator('[data-testid="hint-btn"]').click();
    await expect(page.locator('[data-testid="hint-text"]').first()).toHaveText(
      'Which one is bigger? Take a look.',
      { timeout: 3000 }
    );
  });


  test('wrong answer in L6 surfaces the Quest wrong feedback line', async ({ page }) => {
    await page.goto('/?testHooks=1');
    await expect(page.locator('[data-testid="boot-start-btn"]').first()).toBeVisible({ timeout: 5000 });
    // Wait for the curriculum seed to finish before advancing — BootScene mounts
    // `seed-complete` after seedIfEmpty() resolves (or its catch runs). Without
    // this gate the test can reach L6 before compare templates are in the DB,
    // causing LevelScene to fall back to synthetic partition content.
    await expect(page.locator('[data-testid="seed-complete"]').first()).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]').first()).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="level-card-L6"]').click();
    await expect(page.locator('[data-testid="level-scene"]').first()).toBeVisible({ timeout: 5000 });

    // Wait for the compare interaction to mount before clicking.
    // q:cmp:L6:0001: fractionA=1/3, fractionB=2/3 → correct is '<'.
    // 'compare-relation-gt' (>) is the deterministic wrong choice.
    await expect(page.locator('[data-testid="compare-relation-gt"]').first()).toBeVisible({
      timeout: 8000,
    });
    await page.locator('[data-testid="compare-relation-gt"]').click();
    // Assert via the aria-live status region (AccessibilityAnnouncer
    // mirrors Quest feedback text there per LevelScene.maybeAnnounceFeedback,
    // and the announcement text persists until the next announce — unlike
    // the FeedbackOverlay sentinel which auto-dismisses in ~720ms).
    await expect(page.getByRole('status')).toContainText('Try again. The parts are not equal.', {
      timeout: 3000,
    });
  });
});
