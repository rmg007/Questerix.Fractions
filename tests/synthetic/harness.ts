// Shared helpers for the synthetic playtest harnesses (cognitive + glitch).
// Centralizes boot/storage logic so a fix in one place benefits both specs.
import { expect, type Page } from '@playwright/test';

/** Delete the Dexie DB and clear web storage so every session starts clean. */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('questerix-fractions');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* sandbox restrictions; ignore */
    }
  });
}

/** Boot → menu → click LN card → wait for any level scene sentinel. */
export async function bootToLevel(page: Page, level: number): Promise<boolean> {
  try {
    await page.goto('/?testHooks=1', { waitUntil: 'domcontentloaded' });
    await clearStorage(page);
    await page.goto('/?testHooks=1', { waitUntil: 'domcontentloaded' });

    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 8000 });
    await startBtn.click();

    await expect(page.locator('[data-testid="menu-scene"]')).toBeVisible({ timeout: 5000 });

    // L1's level-card opens the Adventure Map (LevelMapScene); other Ln cards
    // either open the map or jump straight in. Click the Ln card, then if the
    // map appears, click the map-level-N affordance to enter the level scene.
    const card = page.locator(`[data-testid="level-card-L${level}"]`);
    await expect(card).toBeVisible({ timeout: 3000 });
    await card.click();

    const map = page.locator('[data-testid="level-map-scene"]');
    if (await map.isVisible({ timeout: 1500 }).catch(() => false)) {
      const node = page.locator(`[data-testid="map-level-${level}"]`);
      if (await node.isVisible({ timeout: 1500 }).catch(() => false)) {
        await node.click();
      }
    }

    const levelSentinels = ['level01-scene', 'level-scene'];
    for (const id of levelSentinels) {
      if (
        await page
          .locator(`[data-testid="${id}"]`)
          .isVisible({ timeout: 4000 })
          .catch(() => false)
      ) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** Cycle through a few activities looking for the first partition target. */
export async function waitForPartitionTarget(page: Page, timeoutMs = 6000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const t = page.locator('[data-testid="partition-target"]').first();
    if (await t.isVisible().catch(() => false)) return true;
    // Try advancing past non-partition activities by tapping anywhere safe
    await page.waitForTimeout(250);
  }
  return false;
}
