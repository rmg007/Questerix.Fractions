// Adventure Map smoke test: all 9 nodes present, locked nodes non-interactive,
// clicking node 1 starts Level01Scene.
// per test-strategy.md §1.3 (E2E happy path)
import { test, expect } from './_fixture';
import { navigateToLevelMap } from './test-helpers';

const TOTAL_NODES = 9;

test.describe('Adventure Map — node presence and navigation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToLevelMap(page);
  });

  test('LevelMapScene is visible and contains all 9 node sentinels', async ({ page }) => {
    await expect(page.locator('[data-testid="level-map-scene"]')).toBeVisible();

    // Every level (locked or unlocked) must have a map-node-<N> sentinel in the DOM.
    for (let n = 1; n <= TOTAL_NODES; n++) {
      await expect(page.locator(`[data-testid="map-node-${n}"]`)).toBeAttached();
    }

    // Confirm the count via a single locator query for robustness.
    const allNodes = page.locator('[data-testid^="map-node-"]');
    await expect(allNodes).toHaveCount(TOTAL_NODES);
  });

  test('locked nodes (2–9) have no interactive map-level-<N> overlay', async ({ page }) => {
    // Only level 1 is unlocked by default; levels 2–9 must NOT expose a
    // clickable map-level-<N> button in the DOM.
    for (let n = 2; n <= TOTAL_NODES; n++) {
      await expect(page.locator(`[data-testid="map-level-${n}"]`)).not.toBeAttached();
    }
  });

  test('clicking map-level-1 starts Level01Scene', async ({ page }) => {
    await page.locator('[data-testid="map-level-1"]').click();
    await expect(page.locator('[data-testid="level01-scene"]')).toBeVisible({ timeout: 8000 });
  });
});
