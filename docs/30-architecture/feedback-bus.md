# Feedback Bus Architecture

**Date:** 2026-05-05  
**Part of:** [Phase 0 — Interaction & Motion Design System](../../PLANS/2026-05-04-roadmap.md)  
**Source:** `src/scenes/utils/feedbackBus.ts`

The feedback bus routes visual + audio + haptic feedback through a single emission. One call fires three channels in lockstep, ensuring K–2 children get redundant signal channels so they don't miss feedback even if they're distracted.

## Design Principle

**One emission, three channels:**

1. **Visual:** state transition (scale, alpha, shake, spring bounce)
2. **Audio:** cue playback (respects mute setting)
3. **Haptic (substitute):** visual flash or haptic indicator (future: Vibration API)

All three respond to the same feedback kind (`tap`, `snap`, `correct`, `incorrect`, `milestone`).

## API

### `emitFeedback(kind, opts)`

Emit a single feedback event.

**Parameters:**
- `kind`: `'tap' | 'snap' | 'correct' | 'incorrect' | 'milestone'`
- `opts` (optional):
  - `target`: game object to apply visual state to
  - `scene`: Phaser scene (required for audio bus and registry)
  - `loud`: force audio even if muted (default: false)

**Example:**

```ts
import { emitFeedback } from 'src/scenes/utils/feedbackBus';

// User taps a button
emitFeedback('tap', { target: button, scene });

// Correct answer feedback
emitFeedback('correct', { target: shapeDisplay, scene });

// Error feedback (shakes)
emitFeedback('incorrect', { target: shapeDisplay, scene });

// Milestone (celebratory)
emitFeedback('milestone', { target: mascot, scene });
```

### `emitFeedbackSequence(kinds, delayMs, opts)`

Emit multiple feedback kinds in sequence.

**Example:**

```ts
// Snap → correct → milestone chain
emitFeedbackSequence(
  ['snap', 'correct', 'milestone'],
  150, // 150 ms between each
  { target: shape, scene }
);
```

## Feedback Kinds

| Kind | Visual State | Audio Cue | Use Case |
|---|---|---|---|
| `tap` | `pressed` (scale 0.96, darker) | `tap` | Button press, interactive element click |
| `snap` | `success` (scale 1.04, spring) | `snap-correct` | Magnetic snap, drag alignment |
| `correct` | `success` (scale 1.04, spring) | `correct-chime` | Answer validation success |
| `incorrect` | `error` (shake 6px, 3 cycles) | `incorrect-soft` | Answer validation failure |
| `milestone` | `success` (scale 1.04, spring) | `milestone-flourish` | Level complete, mastery reached |

## Mute Behavior

Audio mute is controlled via `scene.registry.get('muted')`:

```ts
// Check mute setting
if (scene.registry.get('muted') === true) {
  // Audio is muted, but visual + haptic still fire
}
```

**Loud flag override:**

```ts
// Force audio even if muted (e.g., critical alert)
emitFeedback('incorrect', { scene, loud: true });
```

## Reduced-Motion Compliance

Visual state transitions respect `scene.registry.get('prefersReducedMotion')`:

- If `true`: motion uses `Duration.instant` (0 ms, via `applyState()`)
- If `false`: motion uses specified duration

Audio is unaffected by reduced-motion (audio cues still play).

## Audio Cue Contract

Audio identifiers are defined in a shared constant so pipeline, audio generation, and game code stay in sync:

| Identifier | Type | Notes |
|---|---|---|
| `tap` | SFX | Quick, percussive, low-volume |
| `snap-correct` | SFX | "Magical" snap sound, confirmatory |
| `correct-chime` | SFX | Bright, celebratory chime |
| `incorrect-soft` | SFX | Gentle buzz, non-punitive |
| `milestone-flourish` | Music/SFX | Orchestral fanfare or musical flourish |

**Defined in:** `src/audio/cues.ts` (created in PLANS/audio.md)

## Integration Points

### With Motion System

`emitFeedback()` calls `applyState()` internally, which uses the motion wrapper (`motion.ts`). Reduced-motion compliance is automatic.

### With Audio System

Audio bus integration is defined in PLANS/audio.md. The feedback bus emits events that the audio system listens to:

```ts
// TODO: Wire up audio bus
scene.events.emit('audio:play', { cue: 'correct-chime' });
```

### With Attempt/Activity Logging

Feedback emission can trigger observability events:

```ts
// TODO: Log feedback to OpenTelemetry
tracer.recordEvent('feedback.emitted', { kind, target });
```

## Future Extensions

- **True haptic feedback:** Vibration API integration (once device support is confirmed)
- **Reduced-audio preference:** Separate from reduced-motion (handle in PLANS/audio.md)
- **Accessibility audio:** Higher-contrast cues for hearing-impaired users

## Testing

- Unit tests: `src/scenes/utils/feedbackBus.test.ts`
- Integration tests: verify visual + audio + haptic fire together
- A11y tests: verify cues are perceivable with reduced-motion/muted

## See Also

- [Motion Tokens](./motion-tokens.md)
- [Visual State Language](./state-language.md)
- [Interaction Grammar](./interaction-grammar.md)
- [PLANS/audio.md](../../PLANS/audio.md) — Audio pipeline (not yet implemented)
