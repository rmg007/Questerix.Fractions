# components/ — Phaser GameObjects

Reusable UI components built on Phaser. Not pure — they import Phaser — but they must not import from `scenes/` (only scenes import components, not vice versa).

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
- **Every interactive component registers in A11yLayer.** One `addElement()` call per interactive surface — don't skip it for "simple" elements.
- **A11yLayer lifecycle.** Scenes that `pushLayer()` (e.g., modals) MUST `popLayer()` on `scene.events.once('shutdown')` to prevent DOM orphans. Pattern:
  ```ts
  A11yLayer.pushLayer('my-modal', 'Modal Label');
  scene.events.once('shutdown', () => A11yLayer.popLayer());
  ```
- **Destroy in `destroy()` override.** Every tween, every event listener, every DOM element, every particle emitter created in the constructor. Scenes call `destroy()` on their components; don't rely on Phaser's auto-cleanup.
- **Reduced-motion gating.** Use `checkReduceMotion()` before every `scene.tweens.add(...)` call and before playing sound effects.

## Hint ladder pattern

```ts
const hint = new HintLadder('easy'); // fresh per question
const state = hint.request(); // call on wrong attempt
// state.activeTier: 'verbal' | 'visual_overlay' | 'worked_example' | null
// state.exhausted: true once all tiers shown
```

Never share a HintLadder instance across questions.
