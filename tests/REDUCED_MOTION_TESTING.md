# Reduced-Motion Compliance Testing (Phase 6 Gate)

## Overview

The reduced-motion test suite validates Phase 6 of the Interaction & Motion Design System plan (`PLANS/2026-05-04-interaction-and-motion-system.md`). It ensures zero unguarded tweens in the codebase, making reduced-motion compliance architectural rather than vigilance-based.

## Test Files

### Integration Tests (`tests/integration/reduced-motion.test.ts`)

**Purpose:** Source-code audits that catch violations statically.

**Checks:**

1. **Unguarded tweens** — Find all `tweens.add()` calls outside `src/scenes/utils/motion.ts` and outside test files. These are violations that must be wrapped in the `tween()` function.

2. **Camera methods** — Find all `camera.fade()`, `camera.shake()`, `camera.flash()` calls. These must be guarded by reduced-motion checks or routed through the motion wrapper.

3. **Registry initialization** — Verify that `checkReduceMotion()` function and `motion.ts:tween()` wrapper are properly implemented.

**Run:**
```bash
npm run test:integration -- reduced-motion
```

**Current Status (2026-05-05):**
- ✓ 0 unguarded camera methods
- ✗ 94 unguarded tweens.add() calls (Phase 5 migration in progress)
- ✓ Registry initialization verified

**Expected Status (after Phase 5):**
- ✓ 0 unguarded tweens.add() calls
- ✓ 0 unguarded camera methods
- ✓ Registry initialized at boot time

### E2E Tests (`tests/e2e/reduced-motion.spec.ts`)

**Purpose:** Visual regression tests that verify tweens actually use instant duration in production.

**Checks:**

1. **Boot→Menu→LevelMap→Level01 transitions** — All scene changes should be instant (no fade-in/slide animations).

2. **UI element rendering** — FeedbackOverlay, buttons, menu items should appear at final state (no scale/alpha tweens visible).

3. **No mid-tween states** — Elements should never be captured mid-animation (0.98 scale, semi-transparent, etc.).

**Run:**
```bash
# First-time baseline creation
npm run test:e2e -- --grep "reduced-motion" --update-snapshots=only

# Regression testing (every PR)
npm run test:e2e -- --grep "reduced-motion"
```

**Implementation Details:**

The test injects a media query override that reports `prefers-reduced-motion: reduce` as active:

```ts
window.matchMedia = function (query: string) {
  if (query === '(prefers-reduced-motion: reduce)') {
    return { matches: true, media: query };
  }
  return originalMatchMedia(query);
};
```

When the app boots:
1. `checkReduceMotion()` reads the OS preference (now overridden to `true`)
2. Scene creates tweens via `motion.ts:tween()`
3. The wrapper checks `scene.registry.get('prefersReducedMotion')`
4. All tweens get `duration: Duration.instant` (0 ms)
5. Elements appear at final state with zero animation frames

**Baselines:**

Located in `tests/e2e/__baselines__/reduced-motion/`. These capture the expected visual state when all tweens are instant. Each baseline proves no animation is visible.

## How It Works

### The Motion Wrapper (`src/scenes/utils/motion.ts`)

```ts
export function tween(scene, target, props, opts = {}) {
  const prefersReducedMotion = scene.registry.get('prefersReducedMotion') === true;
  return scene.tweens.add({
    targets: target,
    duration: prefersReducedMotion ? Duration.instant : (opts.duration ?? Duration.base),
    ease: opts.ease ?? Ease.out,
    ...props,
    ...remainingOpts,
  });
}
```

**How it enforces compliance:**
- Direct `scene.tweens.add()` calls bypass the wrapper → **violation**
- Calls via `tween()` get automatic reduced-motion gating → **compliant**
- ESLint rule forbids direct `tweens.add()` (Phase 6 deliverable)

### The Reduced-Motion Check (`src/lib/preferences.ts`)

```ts
export function checkReduceMotion(): boolean {
  const osPrefers = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!cache) return osPrefers;
  return osPrefers || cache.reduceMotion;
}
```

Returns `true` if either:
- OS sets `prefers-reduced-motion: reduce` (browser/OS accessibility settings)
- App sets cache via `updatePreferences()` (Settings UI toggle)

## Compliance Reference

**WCAG 2.1 Section 2.3.3: Animation from Interactions**
> If an animation is caused by an interaction, then the animation can be disabled, or the animation would last 3 seconds or less.

The Questerix app implements the "disable animation" branch:
- When `prefers-reduced-motion: reduce`, all tweens use `Duration.instant` (0 ms)
- No tweens exceed 600 ms (Duration.ceremony), well under 3s limit
- Reduced-motion is the **opt-out**, not opt-in: off by default for all tweens

## Phase 5 Migration Status

As of 2026-05-05, Phase 5 (migrate existing call sites) is in progress.

**Tracked in:** PLANS/2026-05-04-interaction-and-motion-system.md §Phase 5

**Progress:**
- `src/scenes/utils/motion.ts` ✓ (complete)
- `src/scenes/utils/interaction.ts` ✓ (complete)
- `src/scenes/utils/states.ts` ✓ (complete)
- `src/scenes/utils/feedbackBus.ts` ✓ (complete)
- Component tweens: ~94 call sites still using direct `tweens.add()`
  - `src/components/**` — DragHandle, FeedbackAnimations, FeedbackOverlay, etc.
  - `src/scenes/**` — MenuScene, SettingsScene, LevelScene, etc.

**Blocking:** ESLint rule not yet active (Phase 5 allows granular per-component migration with disable comments before full enforcement).

## Test Interpretation

### Integration Test Results

**When `npm run test:integration -- reduced-motion` passes:**
- 0 unguarded tweens found
- 0 unguarded camera methods found
- Registry initialization verified
- Phase 6 gate satisfied

**When integration test fails:**

Example failure output:
```
Found 94 unguarded tweens.add() calls in production code
First violations:
  src/components/DragHandle.ts:42
  src/components/FeedbackAnimations.ts:88
  src/components/FeedbackOverlay.ts:115
  ...
```

**Action:** For each violation, either:
1. Replace `tweens.add()` with `tween()` from motion.ts
2. Or add a one-line disable comment with rationale (Phase 5 interim)

### E2E Test Results

**When `npm run test:e2e -- --grep "reduced-motion"` passes:**
- All scene transitions are instant
- All UI elements appear at final state
- No mid-tween states captured
- Visual regression baseline matches

**When E2E test fails:**

Playwright generates an HTML report showing pixel-by-pixel diff.

Example: Element is at 0.98 scale instead of 1.0
```
Expected: element at scale 1.0 (idle/final state)
Got: element at scale 0.98 (mid-tween, pressed state)
```

**Action:** A tween is still running despite `prefersReducedMotion: reduce`. Investigate:
1. Is the component using `tween()` from motion.ts?
2. Is it calling direct `tweens.add()`?
3. Is `scene.registry.set('prefersReducedMotion', ...)` being called at boot?

## Baseline Management

Baselines live in `tests/e2e/__baselines__/reduced-motion/`. They are committed to git so every PR can regression-test against them.

### Creating baselines (Phase 6 kick-off)

```bash
npm run test:e2e -- --grep "reduced-motion" --update-snapshots=only
git add tests/e2e/__baselines__/reduced-motion/
git commit -m "test(e2e): add reduced-motion baseline screenshots for Phase 6"
```

### Updating baselines (after safe layout changes)

If the app's UI layout changes but reduced-motion behavior is unchanged:

```bash
npm run test:e2e -- --grep "reduced-motion" --update-snapshots=only

# Review the diff
git diff tests/e2e/__baselines__/reduced-motion/

# If differences are layout-only (no motion-related changes):
git add tests/e2e/__baselines__/reduced-motion/
git commit -m "refactor: update reduced-motion baseline after [specific change]"
```

### Preventing accidental baseline updates

Never update a baseline to make a failing test pass. If the test fails:

1. **Is the diff a real tween violation?** (element mid-animation, at wrong scale/opacity)
   - Yes → Fix the code, not the baseline
   - No → Check if it's a layout change that's unrelated to motion

2. **Review the Playwright report** (`playwright-report/index.html`)
   - Visual side-by-side diff shows exactly what changed
   - Hover over diffs to see pixel-level changes

3. **If it's a layout change unrelated to motion:**
   ```bash
   npm run test:e2e -- --grep "reduced-motion" --update-snapshots=only
   git diff tests/e2e/__baselines__/reduced-motion/  # review again
   git add tests/e2e/__baselines__/reduced-motion/
   git commit -m "refactor: update reduced-motion baseline"
   ```

## Running Tests Locally

### Full reduced-motion audit

```bash
# Integration (source-code static analysis)
npm run test:integration -- reduced-motion

# E2E (visual regression)
npm run test:e2e -- --grep "reduced-motion"

# Both
npm run test:integration -- reduced-motion && npm run test:e2e -- --grep "reduced-motion"
```

### Updating baselines after development

```bash
# When UI layout changes but motion behavior is unchanged:
npm run test:e2e -- --grep "reduced-motion" --update-snapshots=only

# Review and commit:
git diff tests/e2e/__baselines__/reduced-motion/
git add tests/e2e/__baselines__/reduced-motion/
git commit -m "test: update reduced-motion baseline"
```

### Debugging a failing E2E test

```bash
# Run with verbose output
npm run test:e2e -- --grep "reduced-motion" --reporter=verbose

# Open the HTML report
open playwright-report/index.html

# The report shows side-by-side diffs of expected vs actual screenshots
```

## CI Integration

The project CI (`.github/workflows/`) includes:

1. **Integration test gate** — Must pass before PR merge
   ```
   npm run test:integration -- reduced-motion
   ```

2. **E2E test gate** — Must pass before PR merge
   ```
   npm run test:e2e -- --grep "reduced-motion"
   ```

Both must pass to unblock Phase 6 gate closure.

## Documentation References

- **Motion tokens:** `src/scenes/utils/motion.ts`
- **Reduced-motion check:** `src/lib/preferences.ts:checkReduceMotion()`
- **Motion design plan:** `PLANS/2026-05-04-interaction-and-motion-system.md`
- **Interaction grammar:** `docs/30-architecture/interaction-grammar.md` (Phase 2 deliverable)
- **State language:** `docs/30-architecture/state-language.md` (Phase 3 deliverable)
- **WCAG reference:** https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html

## Next Steps (After Phase 6)

1. **Enforce ESLint rule** — Add `.eslintrc` rule that forbids direct `tweens.add()` outside motion.ts. Requires Phase 5 migration to complete.

2. **Documentation audit** — Ensure `docs/30-architecture/motion-tokens.md` documents all Duration, Ease, and Distance tokens.

3. **Integrate with CI** — Add reduced-motion gate to `.github/workflows/` so every PR must pass both integration and E2E checks.

4. **Baseline regression monitoring** — Set up dashboard to track baseline changes over time (future infrastructure feature).
