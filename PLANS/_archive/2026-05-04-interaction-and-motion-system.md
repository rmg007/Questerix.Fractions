# Plan: Interaction & Motion Design System

**Date:** 2026-05-04
**Branch (when started):** `feat/2026-05-04-interaction-and-motion-system`
**Status:** Draft — not yet implemented
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 1 foundation. Lands **before** plans 1–3 begin remediation so every UI fix uses the same tokens, durations, and gesture grammar.

## Problem

The app's UI quality today is uneven because there is no shared interaction vocabulary:

- Each scene picks its own tween durations and easings (some 200 ms linear, some 400 ms `Cubic.easeOut`, some untweened). Children read inconsistent timing as bugs.
- "Tap" and "drag" semantics are scene-local. There is no standard for: tap-cancel radius, drag-engage threshold, snap-back on miss, double-tap debounce, finger-rest tolerance.
- Feedback is visual-only and inconsistent: some interactions confirm with a flash, some with a scale bump, some with nothing. K–2 children need redundant signal channels (visual + audio + motion).
- Focus, hover, pressed, disabled, success, error states are not defined as a system. Each component re-invents them, badly.
- Reduced-motion compliance is checklist-driven (audit catches violations), not architectural (you have to remember the guard every time you write `tweens.add`).

The result: every "polish" PR re-litigates the same questions. This plan codifies the answers once so plans 1–7 can stop having that conversation.

## Goals

1. A single source of truth for motion tokens (durations, easings, distances) and interaction tokens (thresholds, radii, debounces) under `src/scenes/utils/motion.ts` and `src/scenes/utils/interaction.ts`.
2. A reduced-motion-safe `tween()` wrapper that makes the right thing the easy thing — calling `tweens.add` directly fails lint.
3. A documented gesture grammar: tap, long-press, drag, drag-cancel, snap, undo. Every interaction archetype maps onto this grammar; deviations require a doc-noted justification.
4. A shared state visual language for buttons and draggables: idle / hover / pressed / focused / disabled / loading / success / error — defined once in `src/scenes/utils/states.ts`, consumed everywhere.
5. Audio + visual + motion feedback are routed through one feedback bus so a single trigger fires all enabled channels (paired with the audio pipeline; mute settings respected).
6. Every micro-interaction has a defined cancellation path. Children mis-tap; the app forgives.

## Non-goals

- Re-skinning the app. This is the underlying system, not the visual identity.
- Replacing Phaser tween / input. The tokens wrap them; they do not replace them.
- Adding a UI framework (React / Svelte / etc.) — banned by C4.
- Animating things that don't currently animate. The bar for new motion is "improves comprehension", not "looks lively" (C10).

## Definition of done

- `motion.ts`, `interaction.ts`, `states.ts`, `feedbackBus.ts` exist with full unit coverage.
- ESLint rule blocks direct `this.tweens.add(...)` outside the wrapper; existing call sites migrate or get an `// eslint-disable-next-line` with a one-line justification.
- All 10 archetypes in `src/scenes/interactions/` use the shared gesture grammar; deviations recorded in `docs/30-architecture/interaction-grammar.md`.
- Reduced-motion regression test asserts 0 unguarded tweens in the source tree.
- Visual baseline at 360 px shows identical idle/hover/pressed/disabled/error rendering across MenuScene, LevelScene, SettingsScene, SessionCompleteOverlay.

---

## Phases

### Phase 1 — Motion tokens (gate: tokens committed, lint rule active)

`src/scenes/utils/motion.ts` defines the durations and easings used everywhere. Numbers are calibrated for K–2 perception (older research: pre-readers parse motion at ~30 % slower than adults, but waiting longer than 600 ms breaks the input-feedback link).

```ts
export const Duration = {
  instant: 0,        // reduced-motion mode
  micro: 80,         // press flash, focus ring fade
  short: 160,        // button hover, small scale tweens
  base: 240,         // overlay open, panel slide, snap-to-target
  long: 400,         // scene transitions, mascot enter
  ceremony: 600,     // mastery upgrade, level-complete burst
} as const;

export const Ease = {
  out: 'Cubic.easeOut',          // default for "thing arriving" — most UI events
  in: 'Cubic.easeIn',            // "thing leaving"
  inOut: 'Cubic.easeInOut',      // continuous repositioning, never first-time arrivals
  spring: 'Back.easeOut',        // success confirms, snap-correct (not snap-incorrect)
  bounce: 'Sine.easeInOut',      // gentle attention pulses; never on errors
} as const;

export const Distance = {
  press: 1,                      // px scale offset on press (1.04 → 1.0)
  hover: 2,                      // px lift on hover
  shake: 6,                      // wrong-answer shake amplitude (3 cycles)
} as const;
```

Wrapper:

```ts
export function tween(scene, target, props, opts = {}) {
  const reduced = scene.registry.get('prefersReducedMotion') === true;
  return scene.tweens.add({
    targets: target,
    duration: reduced ? Duration.instant : (opts.duration ?? Duration.base),
    ease: opts.ease ?? Ease.out,
    ...props,
  });
}
```

ESLint rule (`.eslintrc` custom): forbid `this.tweens.add(`, `scene.tweens.add(` outside `motion.ts`. Existing call sites either migrate or add a one-line disable with rationale.

### Phase 2 — Gesture grammar (gate: grammar doc + per-archetype mapping)

Define the catalogue of recognised gestures in `src/scenes/utils/interaction.ts`:

```ts
export const Gesture = {
  tapCancelRadiusPx: 8,            // pointer drift before a tap becomes a drag
  tapMaxDurationMs: 250,           // longer than this → long-press, not tap
  longPressMs: 500,                // K-2 friendly — adults use 350, children slower
  dragEngageThresholdPx: 6,        // distance pointer must move before drag begins
  dragCancelRevertMs: 200,         // snap-back animation when drag is released off-target
  doubleTapWindowMs: 300,          // window for accidental double-fires; debounce in
  snapRadiusPx: 28,                // magnetic snap range in PartitionInteraction etc.
  fingerRestTolerancePx: 4,        // ignore micro-movements from finger tremor
} as const;
```

Per-archetype mapping table goes in `docs/30-architecture/interaction-grammar.md`:

| Archetype | Primary gesture | Cancel path | Snap behaviour | Notes |
|---|---|---|---|---|
| `partition` | drag-divide | release outside snap radius → snap to nearest line, no error penalty | magnetic to halves/thirds/fourths grid | K-2 fine motor: snap radius ≥ 28 px |
| `identify` | tap | tap outside any choice → no-op (not "wrong") | n/a | |
| `label` | drag-to-target or tap-then-tap | release outside drop zones → bounce back | per-zone snap | tap path required for screen-reader users |
| `make` | drag-to-build | tap on placed piece to remove (no error) | grid snap | |
| `compare` | tap-tap (two choices) | tap third choice → replaces selection, not error | n/a | |
| `snap_match` | drag-and-drop | release in empty space → bounce back | strong snap to matched pair | |
| `benchmark` | drag-on-line | release → snap to nearest sixteenth | tick snap | |
| `placement` | drag-to-region | release outside any region → bounce back | region-edge snap | |
| `order` | drag-to-reorder | release outside grid → bounce to original | slot snap | |
| `equal_or_not` | tap (binary) | tap other choice → swap, not error | n/a | |
| `explain_your_order` | tap (multi-select) | unselect by re-tap | n/a | |

The non-negotiable across all archetypes: **release outside the valid region is never an error**. Bounce back, no penalty, no attempt counter increment, no hint progression, no audio "wrong" sting. K–2 children abandon apps that punish exploration.

### Phase 3 — Visual state language (gate: state matrix + visual baseline green)

`src/scenes/utils/states.ts` defines every UI state once:

```ts
export const State = {
  idle:     { scale: 1.00, alpha: 1.0, tintShift: 0 },
  hover:    { scale: 1.02, alpha: 1.0, tintShift: -0.04 },
  pressed:  { scale: 0.96, alpha: 1.0, tintShift: -0.08 },
  focused:  { ringWidth: 3, ringColor: tokens.focusRing, ringOffset: 4 },
  disabled: { scale: 1.00, alpha: 0.45, interactive: false },
  loading:  { scale: 1.00, alpha: 0.85, spinner: true },
  success:  { scale: 1.04, alpha: 1.0, tintShift: 0, durationMs: Duration.short, ease: Ease.spring },
  error:    { shake: Distance.shake, cycles: 3, durationMs: Duration.short },
} as const;
```

Helper `applyState(target, state)` does the right thing including reduced-motion fallback. Every interactive component goes through it. The state matrix is captured as a Playwright visual baseline at 360 / 768 / 1024 — this is the regression gate that keeps polish PRs from drifting.

Focus rings are the most-skipped state in current code. The baseline asserts a visible ring on every focusable element when keyboard navigation is active. Plan 6 (screen-reader-keyboard-parity) will reuse this without re-litigating.

### Phase 4 — Feedback bus (gate: unit + integration green)

`src/scenes/utils/feedbackBus.ts`:

```ts
type FeedbackKind = 'tap' | 'snap' | 'correct' | 'incorrect' | 'milestone';

export function emitFeedback(kind: FeedbackKind, opts?: { target?: GameObject; loud?: boolean }) {
  // Routes through:
  //  - motion: applyState(target, kindToState[kind])
  //  - audio:  audioBus.play(kindToCue[kind])  — respects mute / reduced-audio
  //  - haptic-substitute: visual flash on the target boundary (tablets without haptics)
}
```

One emission, three channels. Mute toggles audio without touching motion. Reduced-motion zeros motion without muting audio. The redundant-channel principle (visual + audio + position-substitute-for-haptic) is what makes feedback land for K–2 — children with attention drift miss any single channel.

Coordination with `PLANS/audio.md`: this plan defines the bus and the cue identifier list (`tap`, `snap-correct`, `snap-incorrect-soft`, `correct-chime`, `incorrect-soft`, `milestone-flourish`). The audio plan owns the actual sample files. Both must agree on identifiers — codified by a shared `audioCues.ts` constant.

### Phase 5 — Migrate existing call sites (gate: typecheck + lint + visual baselines green)

Sweep:

1. Replace direct `tweens.add` calls with `tween()` everywhere in `src/scenes/**`, `src/components/**`. Lint enforces.
2. Replace ad-hoc state styling with `applyState`. Most affected: `Mascot.ts`, `HintLadder.ts`, `FeedbackOverlay.ts`, `ProgressBar.ts`, `MenuScene.ts` station buttons.
3. Replace per-archetype magic numbers (snap radius, drag threshold) with `Gesture.*` tokens. Do NOT change behavior — record any pre-existing per-archetype deviations as exemptions in the grammar doc.
4. Wire `emitFeedback` in: button taps (MenuScene, SettingsScene, SessionCompleteOverlay), correct/incorrect submit (LevelScene + Level01Scene), drag snap (Partition, SnapMatch, Make, Order, Placement, Benchmark).
5. Migrate per archetype, one PR each, behind the existing gameplay regression suite.

### Phase 6 — Reduced-motion architectural test (gate: 0 unguarded tweens)

Add `tests/integration/reduced-motion.spec.ts` that:

- Walks the source tree for any `tweens.add(` outside `motion.ts` and asserts zero matches.
- Walks for any `cameras.main.fade*`, `cameras.main.flash*`, `cameras.main.shake*` and asserts each call is wrapped in a reduced-motion guard or routed through `motion.ts`.
- Loads the app with `prefers-reduced-motion: reduce` and screenshots scene transitions to confirm the instant path is taken.

This makes reduced-motion compliance structural rather than vigilance-based.

### Phase 7 — Documentation (gate: PR merged)

- `docs/30-architecture/motion-tokens.md` — durations / easings / distances reference.
- `docs/30-architecture/interaction-grammar.md` — gesture per archetype, written-out deviations.
- `docs/30-architecture/state-language.md` — visual states for buttons and draggables.
- Update `src/scenes/utils/CLAUDE.md` and `src/components/CLAUDE.md` to point at these.
- Append to `.claude/learnings.md`: "Direct `tweens.add` is forbidden — use `motion.ts:tween()` for reduced-motion compliance by default. Same for state styling: `applyState` is the only sanctioned path."
- Run `npm run sync:claude-md`.

---

## Risk / rollback

- **Risk:** Migrating every call site in one branch is high-blast-radius. Mitigate via Phase 5's per-component PRs, each defended by an existing gameplay test.
- **Risk:** Tokens calibrated for K–2 don't match adult tester intuition during dev review. Document the calibration source so reviewers do not push back from adult ergonomics.
- **Risk:** `feedbackBus` becomes a god-object. Keep it dumb: it is a switch statement that fans out to three channels. Adding a fourth channel is a new plan, not a feature creep.
- **Rollback:** Each phase is independently revertable. Phase 5 is sliced per component so a regression in one does not block others.

## Out-of-scope follow-ups

- True haptic feedback on supported tablets (Vibration API). Non-trivial and inconsistent across devices — defer until pilot data justifies.
- Reduced-audio preference (separate from reduced-motion) — handled in `PLANS/audio.md`.
- Theming system / dark mode — defer beyond MVP.
