# interactions/ — Archetype Interaction Pattern

One file per activity archetype. Each implements the `Interaction` interface from `./types.ts`.

## Contract

```ts
import type { Interaction, InteractionContext } from './types';

export class FooInteraction implements Interaction {
  archetype: ArchetypeId = 'foo';
  mount(ctx: InteractionContext): void { /* build Phaser GameObjects under ctx.scene */ }
  unmount(): void { /* destroy everything created in mount */ }
}
```

`InteractionContext` provides:
- `scene` — the parent Phaser scene
- `template` — the current `QuestionTemplate` (typed payload by archetype)
- `centerX/centerY/width/height` — interaction's allotted region
- `onCommit(payload)` — call exactly once when the student submits an answer; payload is fed to the validator
- `pushEvent(event)` — emit progression events (hint requests, partial actions) for telemetry

## Rules

- **No validation logic here.** The validator (in `src/validators/<archetype>.ts`) is the single source of truth for correctness. `mount` collects input, `onCommit` ships it.
- **No direct DB writes.** `LevelScene` is the only writer.
- **Tear down everything in `unmount`** — every tween, every GameObject, every event listener. Leaks here corrupt subsequent questions.
- **Respect `prefers-reduced-motion`** — gate all tweens via `ctx.scene.scene.systems.game.events` reduced-motion check or the helper in `src/lib/motionBudget.ts`.
- **Touch targets ≥ 44×44 px.** Use `setInteractive({ hitArea: ..., useHandCursor: true })` with explicit hit areas on small visuals.
- **A11y mirror:** non-trivial interactions register a DOM mirror via `A11yLayer` in `src/components/A11yLayer.ts` so keyboard/screen-reader users can complete the question.

## Wiring

1. Implement the class.
2. Export from `./index.ts`.
3. Add the `archetype` → factory mapping in `LevelScene.ts` (look for the interaction-factory map).
4. Make sure the matching validator exists in `src/validators/` and is registered in `validators/registry.ts`.

## Utilities

- `utils/BarModel.ts` — bar (rectangle) partition + label rendering
- `utils/NumberLine.ts` — number line with snap-to-tick

Reach for these before drawing rectangles by hand.
