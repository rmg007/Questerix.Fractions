# Visual State Language

**Date:** 2026-05-05  
**Part of:** [Phase 0 — Interaction & Motion Design System](../../PLANS/2026-05-04-roadmap.md)  
**Source:** `src/scenes/utils/states.ts`

Every button, draggable, and interactive element in the app uses the same visual state language. This is the single source of truth for how buttons look in every situation: idle, hovering, pressed, focused, disabled, loading, success, error.

## State Definitions

All states are defined in `State` object in `src/scenes/utils/states.ts`. Use `applyState(target, stateName, scene)` to transition.

### Idle

**Default state:** resting, ready for interaction.

- **Scale:** 1.0 (100%)
- **Alpha:** 1.0 (100% opaque)
- **Tint:** 0 (no darkening)
- **Interactive:** true

### Hover

**Visual hint that element is interactive.** Applied on pointer-over for mouse, held throughout drag for touch.

- **Scale:** 1.02 (2% larger)
- **Alpha:** 1.0
- **Tint:** -0.04 (slightly darker)
- **Interactive:** true

### Pressed

**Immediate visual feedback on pointer-down.** Must be ≥ 100 ms even if pointer-up fires faster (K–2 perception requirement).

- **Scale:** 0.96 (4% smaller, "pushed in" effect)
- **Alpha:** 1.0
- **Tint:** -0.08 (darker)
- **Interactive:** true
- **Motion:** 160 ms, Cubic.easeOut

### Focused

**Keyboard navigation indicator.** Visible focus ring on every focusable element.

- **Interactive:** true
- **Ring:** 3 px wide, bright blue (token: TBD), 4 px offset from edge

### Disabled

**Element cannot be interacted with.**

- **Scale:** 1.0
- **Alpha:** 0.45 (dimmed)
- **Interactive:** false

### Loading

**Waiting for async operation.** Shows spinner, slightly dimmed.

- **Scale:** 1.0
- **Alpha:** 0.85
- **Spinner:** visible
- **Interactive:** false

### Success

**Correct answer, milestone reached.** Celebratory spring easing.

- **Scale:** 1.04 (4% larger, "pops" effect)
- **Alpha:** 1.0
- **Tint:** 0
- **Interactive:** false
- **Motion:** 160 ms, Back.easeOut (spring)

### Error

**Incorrect answer, validation failure.** Shake animation for attention.

- **Scale:** 1.0
- **Alpha:** 1.0
- **Shake:** 6 px amplitude, 3 cycles
- **Interactive:** false
- **Motion:** 160 ms, Cubic.easeOut

## Transition Matrix

```
idle ↔ hover          (pointer enter/leave, mouse only)
  ↓
pressed               (pointer down)
  ↓
success or error      (feedback)
  ↓
idle                  (reset)

focused (parallel)    (keyboard navigation)
disabled (parallel)   (conditional disabling)
loading  (parallel)   (async operations)
```

## Implementation Pattern

Always use `applyState()`:

```ts
import { applyState } from 'src/scenes/utils/states';

// On pointer down
button.on('pointerdown', () => {
  applyState(button, 'pressed', scene);
});

// On correct answer
applyState(button, 'success', scene);

// On disabled
applyState(button, 'disabled', scene);
```

**Never:**
- `button.setScale()` directly (use `applyState`)
- Hardcode state values (use the State object)
- Manually tween state transitions (state motion is in the State definition)

## Reduced-Motion Compliance

All state transitions respect `scene.registry.get('prefersReducedMotion')`:

- If `true`: motion uses `Duration.instant` (0 ms)
- If `false` or unset: motion uses the specified duration

This is automatic when using `applyState()`.

## Visual Baselines

State appearance is captured in Playwright visual regression tests at these breakpoints:

- 360 px (mobile)
- 768 px (tablet)
- 1024 px (desktop)

Baseline snapshots are committed to `tests/e2e/snapshots/` and serve as the regression gate. Every state change requires baseline re-capture.

## Component Adoption

Every interactive component must adopt this state language:

- **Buttons:** idle, hover, pressed, focused, disabled, loading, success, error
- **Draggables:** idle, hover, pressed, loading, success, error
- **Links:** idle, hover, focused, disabled
- **Form inputs:** idle, focused, error, disabled, loading

## Consistency Rules

1. **Idle is the default:** Always start in idle state
2. **Disabled overrides all:** If an element is disabled, use the disabled state (ignore hover/focus)
3. **One state at a time:** No mixing (not "pressed AND disabled")
4. **Transitions are automatic:** Use `applyState()` to trigger; it handles animation
5. **Accessibility:** Focused state must be visible even in low-light / high-contrast modes

## Testing

- Unit tests: `src/scenes/utils/states.test.ts`
- Visual regression: `tests/e2e/state-baseline.spec.ts` (Playwright screenshot)
- Accessibility: `tests/a11y/wcag.spec.ts` (axe-core) — focus rings, color contrast

## See Also

- [Motion Tokens](./motion-tokens.md)
- [Interaction Grammar](./interaction-grammar.md)
- [Feedback Bus Architecture](./feedback-bus.md)
