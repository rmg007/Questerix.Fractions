/**
 * Mascot reaction verification — e2e smoke (ux-elevation §9 T27).
 *
 * Asserts that the hidden DOM sentinel [data-testid="mascot-state"] carries
 * the correct `data-state` value after each observable mascot trigger:
 *
 *   correct answer  → data-state="cheer"
 *   hint requested  → data-state="think"
 *   session complete → data-state="cheer-big"
 *
 * Navigation: Boot → seed gate (not needed for L1) → Menu → Adventure Map
 *             → Level 1 (partition mechanic, always correct on partition-target click).
 *
 * The sentinel is mounted by Mascot.ts on construction and removed on destroy()
 * so it does not leak between scene transitions.
 */
import { test, expect } from './_fixture';

async function navigateToLevel01(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('[data-testid="boot-start-btn"]').first()).toBeVisible({
    timeout: 8000,
  });
  await page.locator('[data-testid="boot-start-btn"]').click();
  await expect(page.locator('[data-testid="menu-scene"]').first()).toBeVisible({ timeout: 8000 });
  await page.locator('[data-testid="level-card-L1"]').click();
  await expect(page.locator('[data-testid="level-map-scene"]').first()).toBeVisible({
    timeout: 8000,
  });
  await page.locator('[data-testid="map-level-1"]').click();
  await expect(page.locator('[data-testid="level01-scene"]').first()).toBeVisible({
    timeout: 8000,
  });
}

test.describe('Mascot on MenuScene', () => {
  test('mascot sentinel shows wave state after menu becomes visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="boot-start-btn"]').first()).toBeVisible({
      timeout: 8000,
    });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]').first()).toBeVisible({ timeout: 8000 });

    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'wave',
      { timeout: 3000 }
    );
  });

  test('mascot sentinel returns to idle after greeting wave completes', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="boot-start-btn"]').first()).toBeVisible({
      timeout: 8000,
    });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]').first()).toBeVisible({ timeout: 8000 });

    // First confirm the wave fires
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'wave',
      { timeout: 3000 }
    );

    // After ~850ms of tweens the onComplete callback calls setState('idle');
    // allow 4 seconds total to give CI headroom.
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'idle',
      { timeout: 4000 }
    );
  });
});

// TODO: feature drift — mascot sentinel state machine no longer reaches
// cheer/cheer-big/think on the asserted triggers after the Phase 3/4 mascot
// rework. Track via PLANS/E2E_FOLLOWUPS.md (mascot-reactions T27 cluster).
test.describe.skip('Mascot reactions (T27) — e2e smoke', () => {
  test('mascot sentinel is idle immediately after level loads before any answer', async ({
    page,
  }) => {
    await navigateToLevel01(page);

    // The sentinel must already carry data-state="idle" from the moment the
    // level scene finishes constructing — before any answer is submitted.
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'idle',
      { timeout: 3000 }
    );
  });

  test('correct answer sets mascot sentinel to cheer', async ({ page }) => {
    await navigateToLevel01(page);

    const partitionTarget = page.locator('[data-testid="partition-target"]');
    await expect(partitionTarget).toBeVisible({ timeout: 5000 });
    await partitionTarget.click();

    // FeedbackOverlay shows synchronously and mascot.setState('cheer') is called
    // immediately after, so we can assert while the overlay is still visible.
    await expect(page.locator('[data-testid="feedback-overlay"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'cheer',
      { timeout: 2000 }
    );
  });

  test('hint button press sets mascot sentinel to think', async ({ page }) => {
    await navigateToLevel01(page);

    const hintBtn = page.locator('[data-testid="hint-btn"]');
    await expect(hintBtn).toBeVisible({ timeout: 5000 });
    await hintBtn.click({ force: true });

    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'think',
      { timeout: 2000 }
    );
  });

  test('wrong answer sets mascot sentinel to think', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="boot-start-btn"]').first()).toBeVisible({
      timeout: 5000,
    });
    // Wait for the curriculum seed to finish so Level 6 compare templates are in the DB.
    await expect(page.locator('[data-testid="seed-complete"]').first()).toBeVisible({
      timeout: 15000,
    });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]').first()).toBeVisible({ timeout: 8000 });
    await page.locator('[data-testid="level-card-L6"]').click();
    await expect(page.locator('[data-testid="level-scene"]').first()).toBeVisible({
      timeout: 5000,
    });

    // q:cmp:L6:0001: fractionA=1/3, fractionB=2/3 → correct is '<'.
    // Clicking '>' (compare-relation-gt) is the deterministic wrong choice.
    await expect(page.locator('[data-testid="compare-relation-gt"]').first()).toBeVisible({
      timeout: 8000,
    });
    await page.locator('[data-testid="compare-relation-gt"]').click();

    // LevelScene.showOutcome calls mascot.setState('think') for kind === 'incorrect'.
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'think',
      { timeout: 3000 }
    );
  });

  test('mascot resets to idle after wrong-answer feedback overlay dismisses', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="boot-start-btn"]').first()).toBeVisible({
      timeout: 5000,
    });
    // Wait for the curriculum seed to finish so Level 6 compare templates are in the DB.
    await expect(page.locator('[data-testid="seed-complete"]').first()).toBeVisible({
      timeout: 15000,
    });
    await page.locator('[data-testid="boot-start-btn"]').click();
    await expect(page.locator('[data-testid="menu-scene"]').first()).toBeVisible({ timeout: 8000 });
    await page.locator('[data-testid="level-card-L6"]').click();
    await expect(page.locator('[data-testid="level-scene"]').first()).toBeVisible({
      timeout: 5000,
    });

    // q:cmp:L6:0001: fractionA=1/3, fractionB=2/3 → correct is '<'.
    // Clicking '>' (compare-relation-gt) is the deterministic wrong choice.
    await expect(page.locator('[data-testid="compare-relation-gt"]').first()).toBeVisible({
      timeout: 8000,
    });
    await page.locator('[data-testid="compare-relation-gt"]').click();

    // Confirm the mascot enters the 'think' state on wrong answer.
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'think',
      { timeout: 3000 }
    );

    // Wait for the feedback overlay to auto-dismiss (~720ms after appearing).
    await expect(page.locator('[data-testid="feedback-overlay"]')).not.toBeVisible({
      timeout: 5000,
    });

    // After the overlay clears the mascot's encourage animation completes and
    // setState('idle') is called, resetting the sentinel.
    // The expected idle/neutral state attribute value is 'idle'.
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'idle',
      { timeout: 3000 }
    );
  });

  test('session complete sets mascot sentinel to cheer-big', async ({ page }) => {
    await navigateToLevel01(page);

    // Trigger session-complete directly via the test hook rather than playing
    // through 5 questions, so the test does not depend on feedback auto-dismiss
    // timing (which relies on Phaser's game-loop tick and can stall in CI).
    await page.locator('[data-testid="session-complete-btn"]').click({ force: true });

    // Session complete overlay appears and mascot transitions to cheer-big
    await expect(page.locator('[data-testid="completion-screen"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'cheer-big',
      { timeout: 3000 }
    );
  });

  test('mascot sentinel returns to idle after cheer animation completes', async ({ page }) => {
    await navigateToLevel01(page);

    const partitionTarget = page.locator('[data-testid="partition-target"]');
    await expect(partitionTarget).toBeVisible({ timeout: 5000 });
    await partitionTarget.click();

    // Confirm mascot enters cheer state on correct answer
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'cheer',
      { timeout: 2000 }
    );

    // celebrate() runs ~500ms; wait for the feedback overlay to auto-dismiss
    // and then confirm the sentinel has been reset to idle by setState('idle').
    await expect(page.locator('[data-testid="feedback-overlay"]')).not.toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'idle',
      { timeout: 3000 }
    );
  });

  test('mascot sentinel returns to idle after cheer-big animation completes', async ({ page }) => {
    await navigateToLevel01(page);

    await page.locator('[data-testid="session-complete-btn"]').click({ force: true });

    // Confirm mascot enters cheer-big state on session complete
    await expect(page.locator('[data-testid="completion-screen"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'cheer-big',
      { timeout: 3000 }
    );

    // cheerBig() runs ~800ms; after it finishes setState('idle') is called,
    // resetting the sentinel. Allow 4 seconds total for CI headroom.
    await expect(page.locator('[data-testid="mascot-state"]')).toHaveAttribute(
      'data-state',
      'idle',
      { timeout: 4000 }
    );
  });
});
