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
import { test, expect } from './_fixture';

// Compare archetype now uses 'quest.feedback.wrong.compare' line:
// "Try again. Look at both again." (was unequal fallback).
async function navigateToLevel6(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('[data-testid="boot-start-btn"]').first()).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('[data-testid="seed-complete"]').first()).toBeVisible({
    timeout: 15000,
  });
  await page.locator('[data-testid="boot-start-btn"]').click();
  await expect(page.locator('[data-testid="menu-scene"]').first()).toBeVisible({
    timeout: 15000,
  });
  await page.locator('[data-testid="level-card-L6"]').click();
  await expect(page.locator('[data-testid="level-scene"]').first()).toBeVisible({
    timeout: 15000,
  });
}

test.describe('Quest voice wiring (T28) — e2e smoke', () => {
  test('first hint in L6 renders the Quest verbal tier line for compare', async ({ page }) => {
    await navigateToLevel6(page);

    // Pull a hint via the test-hook hint button (mounted upper-right).
    // Use force:true because the hint-btn overlay sits outside the default viewport.
    await page.locator('[data-testid="hint-btn"]').click({ force: true });
    await expect(page.locator('[data-testid="hint-text"]').first()).toHaveText(
      'Which one is bigger? Take a look.',
      { timeout: 5000 }
    );
  });

  test('wrong answer in L6 surfaces the Quest wrong feedback line', async ({ page }) => {
    await navigateToLevel6(page);

    // Wait for the compare interaction to mount before clicking.
    // q:cp:L6:0001: fractionA=1/2, fractionB=1/4 → correct is '>'.
    // 'compare-relation-lt' (<) is the deterministic wrong choice.
    await expect(page.locator('[data-testid="compare-relation-lt"]').first()).toBeVisible({
      timeout: 8000,
    });
    await page.locator('[data-testid="compare-relation-lt"]').click();
    // Wait for feedback overlay to appear so we know the wrong-answer flow ran.
    await expect(page.locator('[data-testid="feedback-overlay"]')).toBeVisible({ timeout: 8000 });
    // Assert via the aria-live status region.
    await expect(page.getByRole('status')).toContainText('Try again. Look at both again.', {
      timeout: 5000,
    });
  });
});
