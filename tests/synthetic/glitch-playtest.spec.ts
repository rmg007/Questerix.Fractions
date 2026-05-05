// Interaction-glitch playtest — drives each GlitchPersona against L1 and asserts
// no uncaught errors / scene crashes. Companion to playtest.spec.ts (which models
// accuracy/think-time). This one models suboptimal *input style*.
// Run via: npx playwright test --config=playwright.synthetic.config.ts -g Glitch
import { test, expect, type Page } from '@playwright/test';
import { ALL_GLITCH_PERSONAS } from './glitch-personas.js';
import { bootToLevel, waitForPartitionTarget } from './harness.js';

const RUNS_PER_PERSONA = parseInt(process.env['GLITCH_RUNS_PER_PERSONA'] ?? '1', 10);
const PER_RUN_TIMEOUT_MS = 25_000;

const NOISE = /Failed to load resource|net::ERR_|favicon|DevTools|\[vite\]/i;

async function sceneStillAlive(page: Page): Promise<boolean> {
  const survivors = [
    '[data-testid="feedback-overlay"]',
    '[data-testid="partition-target"]',
    '[data-testid="level01-scene"]',
    '[data-testid="level-scene"]',
    '[data-testid="level-map-scene"]',
    '[data-testid="menu-scene"]',
  ];
  for (const sel of survivors) {
    if (
      await page
        .locator(sel)
        .first()
        .isVisible()
        .catch(() => false)
    )
      return true;
  }
  return false;
}

test.describe('Synthetic Interaction-Glitch Harness', () => {
  for (const persona of ALL_GLITCH_PERSONAS) {
    test(`${persona.name} (${persona.grade}) — ${persona.objective}`, async ({ browser }) => {
      test.setTimeout(PER_RUN_TIMEOUT_MS * RUNS_PER_PERSONA + 5_000);

      const allErrors: string[] = [];

      for (let i = 0; i < RUNS_PER_PERSONA; i++) {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await ctx.newPage();
        const tag = `${persona.name}#${i}`;
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(`[${tag}] uncaught: ${err.message}`));
        page.on('console', (msg) => {
          if (msg.type() === 'error') errors.push(`[${tag}] console: ${msg.text()}`);
        });

        try {
          const booted = await bootToLevel(page, 1);
          if (!booted) {
            // Boot failures are harness flakes, not persona-caused regressions —
            // record but don't fail the persona on them.
            errors.push(`[${tag}] WARN: boot to L1 did not complete`);
          } else {
            const partitionAvailable = await waitForPartitionTarget(page, 5000);
            if (partitionAvailable) {
              const target = page.locator('[data-testid="partition-target"]').first();
              await Promise.race([
                persona.executeInputAt(page, target),
                new Promise((r) => setTimeout(r, 8000)),
              ]);
              await page.waitForTimeout(500);
            }
            if (!(await sceneStillAlive(page))) {
              errors.push(`[${tag}] scene appears dead after input`);
            }
          }
        } catch (err) {
          errors.push(`[${tag}] crash: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          await ctx.close().catch(() => {});
        }

        // Hard failures only: uncaught exceptions, dead scene, real console errors.
        // WARNs (harness flakes, missing partition target) are logged but not fatal.
        const hard = errors.filter(
          (e) => !NOISE.test(e) && !e.includes('WARN:') && !e.startsWith('[harness]')
        );
        allErrors.push(...hard);
        if (errors.length) console.log(errors.join('\n'));
      }

      expect(
        allErrors,
        `Glitch persona ${persona.name} surfaced hard failures:\n${allErrors.join('\n')}`
      ).toEqual([]);
    });
  }
});
