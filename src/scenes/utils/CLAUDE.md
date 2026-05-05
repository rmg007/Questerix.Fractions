# Scene Utils Module Guide

**Location:** `src/scenes/utils/`

This module provides the shared tokens, wrappers, and utilities that all scenes and interactions depend on.

---

## Motion System

**Files:** `motion.ts`, `motion.test.ts`

All tweens must go through the `tween()` wrapper (never `scene.tweens.add()` directly). The wrapper ensures:
- Automatic reduced-motion compliance
- Consistent duration and easing defaults
- Single source of truth for K–2-calibrated timings

**Reference:** `docs/30-architecture/motion-tokens.md`

```ts
import { Duration, Ease, tween } from './motion';

// Default: Duration.base + Ease.out
tween(scene, button, { scale: 1.2 });

// Respects prefers-reduced-motion automatically
```

---

## Interaction Grammar

**Files:** `interaction.ts`, `interaction.test.ts`

Defines all gesture thresholds: tap, drag, snap, long-press, double-tap debounce, etc. Calibrated for K–2 motor skills.

**Key principle:** Release outside a valid region is never an error. Always bounce back, no penalty.

**Reference:** `docs/30-architecture/interaction-grammar.md`

---

## Visual State Language

**Files:** `states.ts`, `states.test.ts`

Defines 8 visual states for buttons and draggables: idle, hover, pressed, focused, disabled, loading, success, error. Use `applyState(target, stateName, scene)` to transition.

**Reference:** `docs/30-architecture/state-language.md`

```ts
import { applyState } from './states';

applyState(button, 'pressed', scene);  // Handles motion + appearance
```

---

## Feedback Bus

**Files:** `feedbackBus.ts`, `feedbackBus.test.ts`

Routes feedback through three channels: motion, audio, and visual. One emission, three outputs.

**Reference:** `docs/30-architecture/feedback-bus.md`

---

## Level Configuration

**Files:** `levelMeta.ts`, `levelRouter.ts`, `levelTheme.ts`

- `levelMeta.ts`: Source of truth for L1–L9 level config (archetypes, options, parameters)
- `levelRouter.ts`: Maps scene keys to level numbers
- `levelTheme.ts`: Per-level color tokens

---

## Misc Utilities

- `colors.ts`, `colors-high-contrast.ts`: Color palette tokens
- `easings.ts`: Phaser easing name constants
- `TestHooks.ts`: Playwright data-testid helpers for E2E tests

---

## Hard Rules

1. **No direct `scene.tweens.add()`** — use `tween()` wrapper (enforced by ESLint)
2. **No state styling outside `applyState()`** — always use the state language
3. **No magic numbers for gesture thresholds** — use `Gesture.*` tokens from `interaction.ts`
4. **All new motion respects `prefersReducedMotion`** — structural, not vigilance-based

---

## Testing

```bash
npm run test:unit -- --grep motion
npm run test:unit -- --grep interaction
npm run test:unit -- --grep states
npm run test:unit -- --grep "reduced-motion"
```

---

## See Also

- `docs/30-architecture/motion-tokens.md`
- `docs/30-architecture/interaction-grammar.md`
- `docs/30-architecture/state-language.md`
- `docs/30-architecture/feedback-bus.md`
