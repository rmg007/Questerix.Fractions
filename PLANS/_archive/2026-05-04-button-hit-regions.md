# Plan: Fix Button Hit-Region Mismatches

**Date:** 2026-05-04
**Branch (when started):** `fix/2026-05-04-button-hit-regions`
**Status:** Completed: 2026-05-05 — all 26 violations fixed across Phases 1–4b; Phase 5 helper skipped (threshold not meaningfully reached for the actual fix patterns); Phase 6 docs done.
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 2 (Touch + perf + reliability). Lands first in Phase 2; gates plan 2 Phase 3 and plan 3 Phases 1–2. Inherits hit-area constants and pressed/focused/disabled visuals from [2026-05-04-interaction-and-motion-system.md](2026-05-04-interaction-and-motion-system.md) (`Gesture.tapCancelRadiusPx`, `State.pressed`, `State.focused`); the helper added in this plan's Phase 5 calls `applyState` rather than rolling its own visual states.

## Dependencies & blockers

| Plan | Relationship | Why |
|---|---|---|
| [interaction-and-motion-system](2026-05-04-interaction-and-motion-system.md) | Hard prerequisite | The Phase 5 helper calls `applyState(target, State.pressed)` for press feedback; `Gesture.tapCancelRadiusPx` and `Gesture.doubleTapWindowMs` come from that plan. |
| [touchscreen-a11y-audit](2026-05-04-touchscreen-a11y-audit.md) | This plan unblocks its Phase 3 | A11y remediation conflicts with hit-area edits; that plan hard-gates on this one's Phase 4. |
| [visual-audit-and-cleanup](2026-05-04-visual-audit-and-cleanup.md) | This plan precedes its Phases 1–2 | Visual baselines must reflect the corrected hit-areas + press feedback. |
| [performance-and-drag-latency](2026-05-04-performance-and-drag-latency.md) | Coordinates | Drag interactions changed here are perf-tested there. |

## Execution order

Run this plan before `2026-05-04-touchscreen-a11y-audit.md` remediation. This plan fixes the input geometry mechanism; the touchscreen audit should then validate global compliance without fighting the same files.

Recommended PR slices:

1. Phase 1 only: inventory + reusable test helpers.
2. Phase 2 + Phase 5 if the helper duplication threshold is reached.
3. Phase 3.
4. Phase 4, 4b, 4c in separate PRs if the verified target list is large.
5. Phase 6 docs.

## Problem

Several buttons across the app have visible/tactile mismatches between their visual extent and their actual interactive hit area. Symptoms:

- Text-only links (e.g. "Skip tutorial", "Privacy Notice →") only fire on the literal glyph bounds — the surrounding padding is dead.
- Secondary/tertiary session-complete buttons skip the shadow offset in their hit rectangle even though the shadow is part of the visual footprint.
- Choice/option buttons in interactions rely on default Phaser bounds (Text or Graphics) instead of explicit padded `Rectangle` hit areas.

The codebase already has the right pattern in `createStationButton`, `createActionButton`, and `createHintPillButton` (Container + explicit `Rectangle` hit area that includes shadow). The fix is to make every button match that pattern, not to invent a new one.

## Goals

1. Every interactive button has a hit rectangle ≥ its visible bounds (including any shadow drop).
2. Touch targets remain ≥ 44×44 CSS px (a11y rule from `CLAUDE.md`).
3. No visual regressions; no new dependencies; no behavior changes beyond hit area.
4. Consolidate the *recurring* helper logic, but don't refactor every scene's button system in one pass.
5. Produce a durable inventory so future button work can be checked mechanically rather than re-audited from scratch.
6. **Visual press feedback ≥ 100 ms on every padded button.** Fixing the hit region only guarantees the tap registers; the child still needs to *feel* it registered. Every button using the helper applies `State.pressed` (scale 0.96, darken 8 %) on `pointerdown` for at least 100 ms even if `pointerup` fires faster.
7. **Anti-double-tap debounce.** K–2 children frequently double-tap. The shared helper rejects any second `pointerdown` within `Gesture.doubleTapWindowMs` (300 ms) on the same hit area.

## Non-goals

- Redesigning button visuals.
- Building a unified Button component used everywhere (defer — too invasive for this fix).
- A11yLayer changes (already correctly registered per the audit).
- Solving typography/readability findings; those belong in `2026-05-04-touchscreen-a11y-audit.md`.

## Definition of done

- Inventory lists every `setInteractive` and `draggable: true` call that was reviewed, with status `compliant`, `fixed`, `deferred`, or `not-a-button`.
- All fixed controls have explicit hit geometry documented by unit tests or Playwright edge-click tests.
- `npm run typecheck`, targeted Vitest, and targeted Playwright specs pass.
- No hit rectangle overlaps a neighboring control in a way that changes which action fires.

## Phases

### Phase 1 — Audit + baseline (gate: report committed)

- Walk the audit list below and confirm each call site in current code (line numbers may have drifted).
- Use source search patterns: `setInteractive`, `draggable: true`, `input.hitArea`, `new Phaser.Geom.Rectangle`, and any scene-local button factory names discovered during the pass.
- **Two-layer test strategy** (Phaser `input.hitArea` is not exposed to the DOM, so Playwright cannot measure the rectangle directly):
  - **Unit (Vitest):** `expectHitAreaCoversVisual(container)` — construct the button container in-process, read `input.hitArea.width/height` off the interactive child, and assert it ≥ visual bounds (including shadow drop). This is the geometry gate.
  - **Playwright:** assert *clickability* by clicking at the edge of the visual bounds (±4 px) and verifying the handler fires. This is the user-facing gate.
- No production source changes yet. Commit only test helpers + an inventory file at the explicit path `docs/30-architecture/button-hit-region-inventory.md`. This is the same file referenced by Phase 4b (drag thresholds) and Phase 6.
- Inventory format — one Markdown table, fill every row, no abbreviations:

  | file | line | symbol | visualBounds | currentHitArea | minTarget | status | phase | testCoverage |
  |---|---|---|---|---|---|---|---|---|
  | `src/scenes/OnboardingScene.ts` | 142 | "Skip tutorial" link | 64×18 | text bounds (≈ same) | 44×44 | violation | 2 | none yet |
  | `src/scenes/MenuScene.ts` | 88 | station button | 80×80 | 80×80 | 44×44 | compliant | — | unit + e2e |
  | … | | | | | | | | |

  `status` ∈ `compliant | fixed | violation | deferred | not-a-button`. `phase` is which later phase will fix it (2, 3, 4, 4b). The auditor never edits `status: fixed` until the corresponding phase PR is merged.

### Phase 1b — Multi-touch input config (gate: typecheck + manual touch test)

**Promoted from Phase 4c.** This is a one-line config change in [src/main.ts](src/main.ts) that unblocks every subsequent manual touch test. Land it before Phase 2 begins — without it, every drag test on a real tablet is corrupted by the resting-finger problem.

Phaser's input manager defaults to `input.activePointers = 1`. K–2 students on tablets routinely rest a non-dominant hand on the screen while dragging — that resting finger consumes the single active pointer slot, killing the drag.

- Inspect [src/main.ts](src/main.ts) Phaser config; if `input.activePointers` is not set to ≥ 2, raise it to 3 and verify multi-touch is enabled.
- Add a regression unit test that asserts the runtime Phaser game config has `input.activePointers >= 2`.
- Manually verify on a touch device that resting one finger does not block another finger's drag. (Cannot be automated in CI; document as a one-time manual gate.)

### Phase 2 — Fix all text-only & link buttons (gate: targeted E2E green)

**System-wide targets:**
All buttons where `setInteractive()` is called on a bare `Text`, `Graphics`, or unpadded `Rectangle` without explicit hit-area padding.

Call sites include:
- `src/scenes/OnboardingScene.ts` "Skip tutorial" link — wrap text in a transparent padded `Rectangle`
- `src/scenes/SettingsScene.ts` "Privacy Notice →" link (≈ line 295) — same pattern
- `src/scenes/SettingsScene.ts` back button (≈ line 339) — verify dims include visual padding
- `src/scenes/MenuScene.ts` all buttons (station buttons, title, etc.) — audit for consistency
- `src/scenes/LevelMapScene.ts` all buttons (level cards, nav, etc.)
- Any standalone Text/Graphics buttons in `src/components/` (ProgressBar, Mascot, FractionDisplay, etc.)

Pattern to apply (matches `createStationButton`):
```ts
const hit = scene.add.rectangle(0, 0, w + PAD * 2, h + PAD * 2, 0, 0)
  .setOrigin(0.5)
  .setInteractive({ useHandCursor: true });
container.add([hit, label]);
```

Add a Playwright spec that exercises buttons by clicking at the edge of their visual bounds (±4 px) to verify hit area extends properly.

### Phase 3 — Fix all shadow-aware hit rectangles (gate: unit + E2E green)

**System-wide targets:**
All button factories that draw a shadow drop but don't include it in the hit area.

Call sites:
- `src/components/sessionComplete/buttons.ts` (`createButton`): hit rectangle uses `W × (H + SHADOW)` but SHADOW=0 for secondary/tertiary. Change so `HIT_PAD` constant is always ≥ visual shadow, even when shadow is not drawn.
- `src/components/PostSessionOverlay.ts` button factory (≈ line 228): same issue.
- `src/scenes/utils/levelTheme.ts` all button helpers (action, hint pill, etc.) — audit for shadow consistency.
- Any other button factory in `src/scenes/*/` that draws visual shadow.

Add a unit test that constructs each button variant and asserts `input.hitArea.height >= visualHeight`.

### Phase 4 — Sweep all interaction-archetype option buttons (gate: archetype E2E green)

**System-wide targets:**
Every file under `src/scenes/interactions/` (all 10 archetypes) that calls `setInteractive()` on a `Text` or `Graphics` object without an explicit `Rectangle` hit area.

> **Verify before listing.** The original draft listed `ExplainYourOrderInteraction.ts` as a target; that file already passes `hitArea: new Phaser.Geom.Rectangle(...)` in its options object and is **compliant**. Phase 1's audit must re-walk each call site and **only carry forward the actual violations** — do not "fix" code that already follows the pattern. Maintain a verified-targets list in the audit inventory committed at Phase 1.

For each option/choice button found to be a real violation:
- Wrap the visual in a Container with a transparent padded Rectangle as the interactive surface
- Apply consistent `HIT_PAD = 8 px` (or scene-specific padding token)
- Re-run all existing archetype Playwright suites to verify no regressions
- If a visual element is intentionally smaller than 44×44, keep the visual size but make the invisible hit area meet the target unless doing so would overlap another control.

### Phase 4b — Drag interaction hit-area audit (gate: drag E2E green on touch)

Tap targets are not the whole story. [src/scenes/interactions/SnapMatchInteraction.ts](src/scenes/interactions/SnapMatchInteraction.ts), [LabelInteraction.ts](src/scenes/interactions/LabelInteraction.ts), and [MakeInteraction.ts](src/scenes/interactions/MakeInteraction.ts) all call `.setInteractive({ draggable: true })` **without explicit geometry**. For drag targets on touch the hit region matters more than for tap targets — a child's finger obscures the object during the drag, so they cannot self-correct visually.

- Audit every `draggable: true` call across `src/scenes/interactions/` and `src/components/`.
- Replace bare-bounds drag targets with a Container + padded transparent `Rectangle` hit area (≥48 px on the smaller axis to give finger-rest tolerance).
- Add a Playwright touch-emulation spec that initiates `pointerdown` at the visual edge ±6 px and confirms the drag begins.
- Verify drag-distance thresholds (if any) are not so small that a child's tremor cancels the gesture, and not so large that a deliberate short drag is ignored. Record the chosen threshold per archetype in the inventory file at `docs/30-architecture/button-hit-region-inventory.md` — add a "drag thresholds" section at the bottom with `archetype | engageThresholdPx | cancelRevertMs | rationale`.

### Phase 4c — (Promoted to Phase 1b — see above)

This phase is intentionally empty. The multi-touch input config landed in Phase 1b so manual tablet testing is unblocked from the start. Kept as a numbered placeholder so historical references resolve.

### Phase 5 — Extract shared helper (gate: typecheck + lint + all tests green)

The padded-rectangle pattern already appears in 4 sites within Phase 2 alone. Promote at the **3+ duplicate threshold** to avoid drift — do not wait for Phase 4 to finish. If Phase 2 lands first and triples the duplication, run this phase **between 2 and 3** rather than after 4.

Helper home: `src/scenes/utils/buttonHitArea.ts`:

```ts
// Single canonical entry point. Always returns the interactive Rectangle so the
// caller composes it as it sees fit. The earlier two-function draft (one returning
// a Rectangle, one mutating a Container) didn't compose — collapsed into one.
export function attachPaddedHitArea(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  visualWidth: number,
  visualHeight: number,
  opts?: {
    padding?: number;            // default 8
    shadowExtraPx?: number;      // default 0; add the visual shadow drop here
    debounceMs?: number;         // default Gesture.doubleTapWindowMs (300) per Goal #7
    pressFeedback?: boolean;     // default true; applies State.pressed for ≥ 100 ms per Goal #6
  },
): Phaser.GameObjects.Rectangle;
```

Behavior in one place:

- Computes `Phaser.Geom.Rectangle(0, 0, visualWidth + padding*2, visualHeight + padding*2 + shadowExtraPx)`, clamped so the resulting hit area is never less than 44×44.
- Adds the rectangle to the container as the first child (so it sits behind the visual but in front for input purposes — this matches `createStationButton`'s existing structure).
- Wires `pointerdown` to a debounce that ignores a second event within `debounceMs` on the same hit area.
- If `pressFeedback` is true, calls `applyState(container, State.pressed)` on `pointerdown` and reverts to `State.idle` on `pointerup` or `pointerout` — but never reverts faster than 100 ms after `pointerdown`, so a fast tap still flashes.
- Returns the Rectangle so the caller can attach archetype-specific listeners (`on('pointertap', ...)` etc.).

Helper constraints:
- Do not import scene-specific themes into the helper. Tokens come from `motion.ts` / `interaction.ts` / `states.ts`.
- Keep Phaser geometry creation deterministic and side-effect free where possible.
- Unit-test: min-size clamping (44×44 floor), padding, shadow-inclusive dimensions, debounce window, press-state minimum-duration guarantee.

Rewrite the call sites from Phases 2–4 to use this single helper. No behavior change beyond the new pressed/debounce defaults — this phase is pure dedup + polish.

### Phase 6 — Phase-close docs (gate: PR merged)

- Append a learning to `.claude/learnings.md` (one-liner: the Phaser default-bounds gotcha for `Text`/`Graphics` `setInteractive`).
- If the helper API survives review, document it in `docs/30-architecture/` (new short note, not a full doc).
- Run `npm run sync:claude-md` if any agent/command frontmatter changed (none expected).

## Risk / rollback

- Risk: an oversized hit rectangle on a small button overlaps a neighbor and steals clicks. Mitigate by capping padding at `min(8 px, gap-to-neighbor / 2)` and adding a regression Playwright that clicks each neighbor in turn.
- Rollback: each phase is one PR; revert the offending phase if E2E regresses.

## Out-of-scope follow-ups (do not include in this branch)

- Unifying button visuals across MenuScene / Settings / SessionComplete.
- Persistence/C5 work. This plan is input geometry only; run `/c5-check` if any implementation unexpectedly touches persistence.
