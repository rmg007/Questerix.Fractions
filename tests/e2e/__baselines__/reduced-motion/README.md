# Reduced-Motion Baseline Screenshots

This directory contains visual baselines for the reduced-motion compliance test suite (Phase 6 gate).

## Purpose

These screenshots verify that all tweens are instant (zero motion) when `prefers-reduced-motion: reduce` is active. This ensures WCAG 2.1 Section 2.3.3 compliance for vestibular motion sensitivity.

Each baseline captures the expected visual state with all tweens using `Duration.instant` (0 ms), so:
- Scene transitions appear instant (no fade-in/slide)
- UI elements appear at final scale and opacity (no scale/alpha tweens)
- No animation frames are visible between state changes

## Files

- `boot-start-btn.png` — Boot scene with test button ready to click
- `menu-scene-idle.png` — Menu after transition from Boot (no fade-in animation)
- `level-map-scene.png` — Level Map after transition from Menu (no slide animation)
- `level01-scene.png` — Level 1 after loading (no mascot entry, no UI bounce)
- `feedback-overlay-instant.png` — Feedback overlay after interaction (no scale-up)
- `menu-button-idle.png` — Menu button in idle state
- `menu-button-post-click.png` — Menu button after press (released state, not mid-tween)

## Updating Baselines

### First-time creation (Phase 6 implementation)

```bash
npm run test:e2e -- --grep "reduced-motion" --update-snapshots=only
```

This runs the test suite and creates PNG baselines for each snapshot assertion.

### After layout changes

If the app's layout changes (e.g., UI redesign, screen size adjustment) but reduced-motion behavior is unchanged:

```bash
npm run test:e2e -- --grep "reduced-motion" --update-snapshots=only
git add tests/e2e/__baselines__/reduced-motion/
git commit -m "refactor: update reduced-motion baseline after UI layout change"
```

### Verifying baselines are correct

After updating, review the HTML report to confirm:

1. **No mid-tween states visible** — elements should be at final scale/opacity, not animating
2. **Instant transitions** — scene changes appear in one frame, not faded/slid in
3. **All UI elements present** — nothing should be hidden or partially visible due to in-progress tweens

```bash
npm run test:e2e -- --grep "reduced-motion"
# Review playwright-report/index.html
```

## Regression testing

Every PR runs:

```bash
npm run test:e2e -- --grep "reduced-motion"
```

If a test fails, the diff shows which pixels changed. **Do not update baselines to make a failing test pass** — instead, fix the code that introduced the new tween.

Example failure modes:
- Element is mid-scale (0.98 instead of 1.0) → a `scale` tween is still running
- Element is semi-transparent (alpha 0.7 instead of 1.0) → an `alpha` tween is still running
- Mascot is off-screen → entry tween fired despite `prefers-reduced-motion: reduce`

Each of these indicates a violation of Phase 6 — investigate and fix the underlying tween guard.

## How the test works

The e2e suite injects a `window.matchMedia` override that reports `(prefers-reduced-motion: reduce)` as `true`:

```ts
window.matchMedia = function (query: string) {
  if (query === '(prefers-reduced-motion: reduce)') {
    return { matches: true, media: query };
  }
  return originalMatchMedia(query);
};
```

When the app boots, `checkReduceMotion()` reads this and returns `true`. The `tween()` wrapper in `motion.ts` then enforces:

```ts
const duration = prefersReducedMotion ? Duration.instant : (opts.duration ?? Duration.base);
// Duration.instant === 0, so all tweens complete in 0 ms
```

Result: no visible animation, baselines show elements in final state.

## Troubleshooting

### Baseline looks wrong (element cut off, distorted)

This usually means the viewport size in the test differs from when the baseline was created. Check `tests/e2e/reduced-motion.spec.ts` — the fixture should set a consistent viewport. If the app's responsive breakpoints changed, update baselines.

### Baseline shows mid-tween state (element at 0.98 scale, not 1.0)

This is a real violation — the tween is still running despite `prefers-reduced-motion: reduce`. Check:
1. Is `motion.ts:tween()` being called, or direct `scene.tweens.add()`?
2. Is `scene.registry.get('prefersReducedMotion')` being checked?
3. Did a recent PR add a new tween without the guard?

Run the integration test to catch this earlier:

```bash
npm run test:integration -- reduced-motion
```

### Playwright report shows timeout ("element not visible after 5s")

The reduced-motion test is so fast (0 ms tweens) that the scene may not have finished layout. Add a `page.waitForTimeout(300)` before assertions if needed.

## References

- Plan: `PLANS/2026-05-04-interaction-and-motion-system.md` §Phase 6
- Motion wrapper: `src/scenes/utils/motion.ts`
- Reduced-motion check: `src/lib/preferences.ts:checkReduceMotion()`
- WCAG reference: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html
