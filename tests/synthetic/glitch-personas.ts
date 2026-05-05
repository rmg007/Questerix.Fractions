// Interaction-glitch personas — orthogonal to the cognitive personas in personas.ts.
// These do not model accuracy or think-time; they model *how* a K-2 kid physically
// interacts with the UI. Each persona's executeInputAt() drives Playwright in a way
// designed to provoke a specific class of UI bug (snap-to-grid hit-box, pointer
// debouncing, button re-entrancy, off-shape clamping, lifecycle pause/resume).
//
// Used by glitch-playtest.spec.ts. Add new personas by appending to ALL_GLITCH_PERSONAS.
import type { Locator, Page } from '@playwright/test';

export interface GlitchPersona {
  readonly name: string;
  readonly grade: 'K' | '1' | '2';
  readonly objective: string;
  /** Drive an input event aimed at the given element. Must not throw on unexpected DOM. */
  executeInputAt(page: Page, target: Locator): Promise<void>;
}

async function centerOf(
  target: Locator
): Promise<{ x: number; y: number; w: number; h: number } | null> {
  const box = await target.boundingBox();
  if (!box) return null;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, w: box.width, h: box.height };
}

// ─── Pixel-Hunter (G1) ──────────────────────────────────────────────────────
// Nudges the partition 1px at a time across the full shape width. Surfaces:
//   • per-pointermove validator/snap recomputation cost
//   • snap-to-grid hit-box that is too narrow (only one pixel in N is "valid")
const PixelHunter: GlitchPersona = {
  name: 'Pixel-Hunter',
  grade: '1',
  objective: 'snap hit-box width / per-frame validator cost',
  async executeInputAt(page, target) {
    const c = await centerOf(target);
    if (!c) return;
    await page.mouse.move(c.x - c.w * 0.4, c.y);
    await page.mouse.down();
    for (let dx = 0; dx < c.w * 0.8; dx += 1) {
      await page.mouse.move(c.x - c.w * 0.4 + dx, c.y);
    }
    await page.mouse.up();
  },
};

// ─── Swiper (G2 tablet) ─────────────────────────────────────────────────────
// Fast, broad, imprecise gesture across the shape. Surfaces:
//   • drag handlers that assume a slow pointer
//   • hit regions that miss when the up event lands outside the original target
const Swiper: GlitchPersona = {
  name: 'Swiper',
  grade: '2',
  objective: 'drag-end hit region tolerance under fast gestures',
  async executeInputAt(page, target) {
    const c = await centerOf(target);
    if (!c) return;
    await page.mouse.move(c.x - c.w, c.y - c.h * 0.5);
    await page.mouse.down();
    await page.mouse.move(c.x + c.w, c.y + c.h * 0.5, { steps: 3 });
    await page.mouse.up();
  },
};

// ─── Randomizer (K) ─────────────────────────────────────────────────────────
// Clicks scene chrome in a non-task order before the actual target. Surfaces:
//   • scene state machines that assume a strict click order
//   • A11yLayer focus traversal when the same target is re-mounted
const Randomizer: GlitchPersona = {
  name: 'Randomizer',
  grade: 'K',
  objective: 'out-of-order interaction → state-machine re-entry',
  async executeInputAt(page, target) {
    const distractors = ['hint-btn', 'progress-bar', 'mascot', 'home-btn'];
    for (const id of distractors) {
      const loc = page.locator(`[data-testid="${id}"]`);
      if (
        (await loc.count()) > 0 &&
        (await loc
          .first()
          .isVisible()
          .catch(() => false))
      ) {
        await loc
          .first()
          .click({ trial: false, timeout: 500 })
          .catch(() => {});
      }
    }
    await target.click({ timeout: 1500 }).catch(() => {});
  },
};

// ─── Edge-Case (G1) ─────────────────────────────────────────────────────────
// Drops the partition at the absolute bounds (and just outside). Surfaces:
//   • clamp logic that admits x === 0 or x === width as a "valid" partition
//   • validators that don't reject zero-area regions
const EdgeCase: GlitchPersona = {
  name: 'Edge-Case',
  grade: '1',
  objective: 'partition clamp at / past shape bounds',
  async executeInputAt(page, target) {
    const c = await centerOf(target);
    if (!c) return;
    const targets: Array<[number, number]> = [
      [c.x - c.w / 2 - 4, c.y],
      [c.x - c.w / 2, c.y],
      [c.x + c.w / 2, c.y],
      [c.x + c.w / 2 + 4, c.y],
    ];
    for (const [x, y] of targets) {
      await page.mouse.move(c.x, c.y);
      await page.mouse.down();
      await page.mouse.move(x, y, { steps: 5 });
      await page.mouse.up();
    }
  },
};

// ─── Double-Tapper (K) ──────────────────────────────────────────────────────
// Fires two rapid clicks on every actionable element. Surfaces:
//   • non-idempotent submit → duplicate Dexie attempt rows
//   • Mascot.setState re-entry (we've shipped that bug before — see learnings.md)
const DoubleTapper: GlitchPersona = {
  name: 'Double-Tapper',
  grade: 'K',
  objective: 'idempotency of submit / Mascot state machine re-entry',
  async executeInputAt(_page, target) {
    await target.dblclick({ timeout: 1500, delay: 40 }).catch(() => {});
  },
};

// ─── Re-Engager (G2) ────────────────────────────────────────────────────────
// Backgrounds the tab mid-interaction, returns later. Surfaces:
//   • Phaser pause/resume + Dexie write coalescing
//   • timers that keep firing when the tab is hidden
const ReEngager: GlitchPersona = {
  name: 'Re-Engager',
  grade: '2',
  objective: 'tab-visibility pause/resume correctness',
  async executeInputAt(page, target) {
    const c = await centerOf(target);
    if (!c) return;
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.mouse.up();
    await target.click({ timeout: 1500 }).catch(() => {});
  },
};

export const ALL_GLITCH_PERSONAS: readonly GlitchPersona[] = [
  PixelHunter,
  Swiper,
  Randomizer,
  EdgeCase,
  DoubleTapper,
  ReEngager,
];

export { PixelHunter, Swiper, Randomizer, EdgeCase, DoubleTapper, ReEngager };
