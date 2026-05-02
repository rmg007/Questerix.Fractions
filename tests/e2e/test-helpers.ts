/**
 * Shared Playwright helpers for Questerix Fractions e2e tests.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Navigate from menu through level-card-L1 to either LevelMapScene
 * (if onboarding has been completed before) or Level01Scene
 * (if onboarding skip routes there). Returns the destination sentinel
 * that ended up visible so callers can branch.
 */
async function clickLevel1FromMenu(page: Page): Promise<'map' | 'level01'> {
  await page.locator('[data-testid="level-card-L1"]').click();

  const onboardingSentinel = page.locator('[data-testid="onboarding-scene"]');
  const mapSentinel = page.locator('[data-testid="level-map-scene"]');
  const levelSentinel = page.locator('[data-testid="level01-scene"]');

  // Three possible landings: OnboardingScene (first run), LevelMapScene
  // (already onboarded), or Level01Scene (skipped earlier this session).
  await Promise.race([
    onboardingSentinel.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    mapSentinel.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    levelSentinel.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
  ]);

  if (await onboardingSentinel.isVisible().catch(() => false)) {
    // Onboarding skip routes to Level01Scene per OnboardingScene.completeOnboarding().
    await page.locator('[data-testid="onboarding-skip-btn"]').click();
    await expect(levelSentinel).toBeVisible({ timeout: 15000 });
    return 'level01';
  }
  if (await levelSentinel.isVisible().catch(() => false)) {
    return 'level01';
  }
  await expect(mapSentinel).toBeVisible({ timeout: 15000 });
  return 'map';
}

/**
 * Navigate from root to LevelMapScene via DOM sentinels.
 * Route: boot-start-btn → menu-scene → level-card-L1 → level-map-scene.
 * If the click intercepts OnboardingScene, dismiss it then re-enter via
 * the menu to reach the map.
 */
export async function navigateToLevelMap(page: Page): Promise<void> {
  await page.goto('/?testHooks=1');
  const startBtn = page.locator('[data-testid="boot-start-btn"]');
  await expect(startBtn).toBeVisible({ timeout: 15000 });
  await startBtn.click();
  await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 15000 });

  const landing = await clickLevel1FromMenu(page);
  if (landing === 'map') return;

  // Onboarding completion landed us on Level01Scene. The MenuScene back
  // navigation re-enters through level-card-L1, which now skips onboarding.
  await page.evaluate(() => history.back());
  await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 15000 });
  const second = await clickLevel1FromMenu(page);
  if (second !== 'map') throw new Error('Expected level-map-scene after onboarding completion');
}

/**
 * Navigate from root to Level01Scene via DOM sentinels.
 * Route: boot-start-btn → menu-scene → level-card-L1 → (onboarding skip OR
 *        level-map-scene → map-level-1) → level01-scene.
 */
export async function navigateToLevel01(page: Page): Promise<void> {
  await page.goto('/?testHooks=1');
  const startBtn = page.locator('[data-testid="boot-start-btn"]');
  await expect(startBtn).toBeVisible({ timeout: 15000 });
  await startBtn.click();
  await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 15000 });

  const landing = await clickLevel1FromMenu(page);
  if (landing === 'level01') return;

  // Landed on the map; pick Level 1 to enter the scene.
  await page.locator('[data-testid="map-level-1"]').click();
  await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 15000 });
}

/**
 * Perform one attempt: click partition-target, wait for feedback, dismiss via feedback-next-btn.
 * Returns elapsed ms from click to feedback visible.
 */
export async function doAttempt(page: Page): Promise<number> {
  const partitionTarget = page.locator('[data-testid="partition-target"]');
  const feedbackOverlay = page.locator('[data-testid="feedback-overlay"]');
  const feedbackNext = page.locator('[data-testid="feedback-next-btn"]');

  await expect(partitionTarget).toBeVisible({ timeout: 5000 });
  const t0 = Date.now();
  await partitionTarget.click();
  await expect(feedbackOverlay).toBeVisible({ timeout: 5000 });
  const elapsed = Date.now() - t0;
  await feedbackNext.click({ force: true, timeout: 2000 }).catch(() => {});
  await expect(feedbackOverlay).toBeHidden({ timeout: 5000 });
  return elapsed;
}
