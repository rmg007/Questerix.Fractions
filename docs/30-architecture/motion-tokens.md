# Motion Tokens Reference

**Date:** 2026-05-05  
**Part of:** [Phase 0 — Interaction & Motion Design System](../../PLANS/2026-05-04-roadmap.md)  
**Source:** `src/scenes/utils/motion.ts`

All motion in the app flows through a single token set. This ensures consistent timing, K–2-friendly pacing, and automatic reduced-motion compliance.

## Duration

Durations are calibrated for K–2 perception (pre-readers parse motion ~30% slower than adults). Maximum safe delay: 600 ms before the input-feedback link breaks.

| Name | Duration | Use | Notes |
|---|---|---|---|
| `instant` | 0 ms | Reduced-motion mode | Used when `prefersReducedMotion` is true |
| `micro` | 80 ms | Press flash, focus ring fade | Very fast, immediate feedback |
| `short` | 160 ms | Button hover, small scale tweens | Quick feedback loop |
| `base` | 240 ms | Overlay open, panel slide, snap-to-target | Default UI motion |
| `long` | 400 ms | Scene transitions, mascot enter | Significant motion |
| `ceremony` | 600 ms | Mastery upgrade, level-complete burst | Celebratory (max safe delay) |

## Easing

All easings map to Phaser's built-in easing names. The choice of easing direction tells the viewer whether the UI element is arriving or leaving.

| Name | Easing | Use |
|---|---|---|
| `out` | `Cubic.easeOut` | Default for "thing arriving" — most UI events |
| `in` | `Cubic.easeIn` | Default for "thing leaving" |
| `inOut` | `Cubic.easeInOut` | Continuous repositioning, never first-time arrivals |
| `spring` | `Back.easeOut` | Success confirms, snap-correct (celebratory bounce) |
| `bounce` | `Sine.easeInOut` | Gentle attention pulses; never on errors |

## Distance

Pixel offsets used for scale tweens, shakes, and other spatial feedback.

| Name | Distance | Use |
|---|---|---|
| `press` | 1 px | Scale offset on press (1.04 → 1.0) |
| `hover` | 2 px | Lift on hover |
| `shake` | 6 px | Wrong-answer shake amplitude (3 cycles) |

## Usage

### Via `tween()` wrapper

Always use the `tween()` wrapper instead of `scene.tweens.add()` directly. This ensures reduced-motion compliance and consistent defaults.

```ts
import { tween, Duration, Ease } from 'src/scenes/utils/motion';

// Default: Duration.base + Ease.out
tween(scene, button, { scale: 1.2 });

// Custom duration and easing
tween(scene, button, { x: 100 }, {
  duration: Duration.long,
  ease: Ease.spring,
});

// Respects reduced-motion automatically
// If prefersReducedMotion=true, duration becomes Duration.instant
```

### ESLint enforcement

Direct calls to `scene.tweens.add()` and `this.tweens.add()` are forbidden by ESLint rule. Use only in `.eslintignore` files or with `// eslint-disable-next-line` + a one-line justification.

## Reduced-Motion Compliance

The `tween()` wrapper reads `scene.registry.get('prefersReducedMotion')` at runtime:

- If `true`: all tweens use `Duration.instant` (0 ms)
- If `false` or unset: uses the specified or default duration

This means **reduced-motion compliance is structural, not vigilance-based**. You don't have to remember to guard tweens; they comply by default.

## Reference

- K–2 motion perception: Guernsey et al., 2007
- [Interaction Grammar](./interaction-grammar.md)
- [Visual State Language](./state-language.md)
- [Feedback Bus Architecture](./feedback-bus.md)
