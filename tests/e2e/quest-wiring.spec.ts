/**
 * Quest voice wiring — e2e smoke (ux-elevation §9 T28).
 *
 * Boots through the real scene chain to L6 (compare archetype) and
 * proves both wiring legs round-trip through the catalog:
 *   1. First hint → `quest.hint.compare.verbal`
 *   2. Wrong answer → `quest.feedback.wrong.unequal`
 *
 * Determinism: questionTemplateRepo.getByLevel returns templates in
 * seeded primary-key order, so q:cmp:L6:0001 always loads first. That
 * template is fractionA=1/3, fractionB=2/3 — bottom is bigger ('<').
 * Clicking the 'Top is bigger' (>) button is therefore a deterministic
 * wrong answer regardless of build flags or RNG.
 */
import { test, expect } from '@playwright/test';

test.describe('Quest voice wiring (T28) — e2e smoke', () => {
  test('first hint in L6 renders the Quest verbal tier line for compare', async ({ page }) => {
    await page.goto('/?testHooks=1');
    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="level-card-L6"]').click();
    await expect(page.locator('[data-testid="level-scene"]')).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="hint-btn"]').click();
    await expect(page.locator('[data-testid="hint-text"]')).toHaveText(
      'Which one is bigger? Take a look.',
      { timeout: 3000 }
    );
  });

  test('wrong answer in L6 surfaces the Quest wrong feedback line', async ({ page }) => {
    await page.goto('/?testHooks=1');
    await expect(page.locator('[data-testid="boot-start-btn"]')).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="level-card-L6"]').click();
    await expect(page.locator('[data-testid="level-scene"]')).toBeVisible({ timeout: 5000 });

    // q:cmp:L6:0001: fractionA=1/3, fractionB=2/3 → correct is '<'.
    // 'compare-relation-gt' (>) is the deterministic wrong choice.
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
