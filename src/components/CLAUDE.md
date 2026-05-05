# components/ — Phaser GameObjects

Reusable UI components built on Phaser. Not pure — they import Phaser — but they must not import from `scenes/` (only scenes import components, not vice versa).

**All interactive components must adopt the visual state language, motion tokens, and feedback bus from the Phase 0 architecture:**

- **Visual states:** `docs/30-architecture/state-language.md`
- **Motion tokens:** `docs/30-architecture/motion-tokens.md`
- **Gesture grammar:** `docs/30-architecture/interaction-grammar.md`
- **Feedback system:** `docs/30-architecture/feedback-bus.md`

## Component inventory

| File                         | What it is                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `HintLadder.ts`              | 3-tier hint state machine (`verbal → visual_overlay → worked_example`). Instantiate fresh per question.                   |
| `ProgressBar.ts`             | Phaser Graphics bar, width animated on update.                                                                            |
| `FractionDisplay.ts`         | Visual fraction bar (partition model) — draws equal slices.                                                               |
| `SymbolicFractionDisplay.ts` | Typeset symbolic notation (numerator/vinculum/denominator) as Phaser Text objects.                                        |
| `Mascot.ts`                  | Animated character. **Use `mascot.setState('idle')` — never `mascot.idle()` directly.** ESLint enforces this.             |
| `A11yLayer.ts`               | DOM mirror of all interactive Phaser elements for keyboard/screen-reader access. Register every interactive element here. |
| `FeedbackOverlay.ts`         | Correct/incorrect flash overlay.                                                                                          |
| `SessionCompleteOverlay.ts`  | End-of-session summary panel.                                                                                             |
| `DragHandle.ts`              | Draggable grip with snap support.                                                                                         |
| `AccessibilityAnnouncer.ts`  | Live ARIA region for screen-reader announcements.                                                                         |
| `LevelCard.ts`               | Level selection card (used in level map).                                                                                 |
| `SkipLink.ts`                | Skip-to-content DOM link, appended outside the canvas.                                                                    |
| `PreferenceToggle.ts`        | High-contrast / reduced-motion toggle, writes to `src/lib/preferences.ts`.                                                |

## Rules

- **No `scenes/` imports.** Components are leaves; scenes are roots.
- **No DB writes.** Components are display-only; persistence is the scene's job.
- **Use `applyState()` for all state changes.** Never style directly. See `docs/30-architecture/state-language.md`.
  ```ts
  import { applyState } from '../scenes/utils/states';
  applyState(button, 'pressed', scene);
  ```
- **Use `tween()` for all motion.** Never call `scene.tweens.add()` directly (enforced by ESLint). See `docs/30-architecture/motion-tokens.md`.
  ```ts
  import { tween, Duration } from '../scenes/utils/motion';
  tween(scene, button, { scale: 1.2 }, { duration: Duration.short });
  ```
- **Emit feedback via `emitFeedback()`.** Routes through motion + audio + visual. See `docs/30-architecture/feedback-bus.md`.
  ```ts
  import { emitFeedback } from '../scenes/utils/feedbackBus';
  emitFeedback('correct', { target: button });
  ```
- **Every interactive component registers in A11yLayer.** One `addElement()` call per interactive surface — don't skip it for "simple" elements.
- **A11yLayer lifecycle.** Scenes that `pushLayer()` (e.g., modals) MUST `popLayer()` on `scene.events.once('shutdown')` to prevent DOM orphans. Pattern:
  ```ts
  A11yLayer.pushLayer('my-modal', 'Modal Label');
  scene.events.once('shutdown', () => A11yLayer.popLayer());
  ```
- **Destroy in `destroy()` override.** Every tween, every event listener, every DOM element, every particle emitter created in the constructor. Scenes call `destroy()` on their components; don't rely on Phaser's auto-cleanup.
- **Reduced-motion compliance is automatic.** The `tween()` wrapper and `applyState()` both respect `prefersReducedMotion` automatically.

## Hint ladder pattern

```ts
const hint = new HintLadder('easy'); // fresh per question
const state = hint.request(); // call on wrong attempt
// state.activeTier: 'verbal' | 'visual_overlay' | 'worked_example' | null
// state.exhausted: true once all tiers shown
```

Never share a HintLadder instance across questions.
