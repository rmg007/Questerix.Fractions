/**
 * iOS viewport-100vh regression spec.
 *
 * Validates that when the iOS browser toolbar collapses (simulated by shrinking
 * viewport height by 56 px — typical iOS address-bar height), no scene element
 * jumps more than 4 px from its original position.
 *
 * Runs under the `webkit` Playwright project (C7: iOS Safari support).
 * Not tagged @advisory — this is a blocking regression guard.
 */
import { test, expect } from '../_fixture';

test.describe('iOS — viewport 100vh toolbar collapse', () => {
  test('no scene element jumps > 4px when iOS toolbar collapses', async ({ page }) => {
    // Boot the app and wait for the boot scene sentinel.
    await page.goto('/');
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 8000 });

    // Capture initial bounding rects for a stable set of data-testid sentinels.
    // We sample the boot-start-btn which is always present at this point.
    const initialBounds = await startBtn.boundingBox();
    expect(initialBounds).not.toBeNull();

    // Simulate iOS toolbar collapse: reduce viewport height by 56 px.
    // This mimics the Safari dynamic toolbar animating out of view.
    const currentViewport = page.viewportSize();
    expect(currentViewport).not.toBeNull();
    const toolbarHeight = 56;
    await page.setViewportSize({
      width: currentViewport!.width,
      height: currentViewport!.height - toolbarHeight,
    });

    // Give the scene one animation frame to re-layout.
    await page.waitForTimeout(100);

    // Re-measure the element after the resize.
    const postResizeBounds = await startBtn.boundingBox();
    expect(postResizeBounds).not.toBeNull();

    // The element must not jump more than 4 px in either axis.
    // A jump > 4 px indicates the scene is re-anchoring against the new viewport
    // floor rather than remaining stable — a common iOS 100vh regression.
    const deltaY = Math.abs(postResizeBounds!.y - initialBounds!.y);
    const deltaX = Math.abs(postResizeBounds!.x - initialBounds!.x);

    expect(deltaX).toBeLessThanOrEqual(4);
    expect(deltaY).toBeLessThanOrEqual(4);
  });

  test('menu scene elements remain stable under toolbar collapse', async ({ page }) => {
    await page.goto('/');

    // Navigate to menu scene.
    const startBtn = page.locator('[data-testid="boot-start-btn"]');
    await expect(startBtn).toBeVisible({ timeout: 8000 });
    await startBtn.click();

    const menuScene = page.locator('[data-testid="menu-scene"]');
    await expect(menuScene).toBeVisible({ timeout: 8000 });

    // Capture initial bounds of menu scene container.
    const initialMenuBounds = await menuScene.boundingBox();
    expect(initialMenuBounds).not.toBeNull();

    // Simulate toolbar collapse.
    const currentViewport = page.viewportSize();
    expect(currentViewport).not.toBeNull();
    await page.setViewportSize({
      width: currentViewport!.width,
      height: currentViewport!.height - 56,
    });

    await page.waitForTimeout(100);

    const postResizeMenuBounds = await menuScene.boundingBox();
    expect(postResizeMenuBounds).not.toBeNull();

    // Menu scene x-position must be stable (no horizontal reflow).
    const deltaX = Math.abs(postResizeMenuBounds!.x - initialMenuBounds!.x);
    expect(deltaX).toBeLessThanOrEqual(4);

    // Menu scene may grow downward to fill the space (acceptable), but must
    // not jump upward by more than 4 px (indicating re-anchor to new top).
    const deltaY = postResizeMenuBounds!.y - initialMenuBounds!.y;
    expect(deltaY).toBeGreaterThanOrEqual(-4);
  });
});
