# Visual Overlay Hints — Implementation Plan

> **Status**: Draft, not started
> **Branch**: `claude/expand-curriculum-content-PknRO`
> **Owner**: Tasks #10–#18 (see todo list)
> **Reference implementation**: `PartitionInteraction.showCutLineHint()` at
> `src/scenes/interactions/PartitionInteraction.ts:163`

---

## 1. Goal & Pedagogical Rationale

Tier 2 (`visual_overlay`) of the 3-tier hint ladder currently works for
**partition** questions only — it draws dashed orange/gold cut lines showing
where the shape should be divided. The other 7 archetypes
(`compare`, `equal_or_not`, `order`, `benchmark`, `label`, `make`, `snap_match`)
fall through to text-only verbal hints, which costs the learner a 15-point
penalty without giving them the visual scaffold the tier was designed to provide.

Visual overlays are pedagogically powerful at the K–2 level because:
- **Bar models** make part-whole comparisons visible (Singapore-method legacy)
- **Number lines** anchor abstract fractions to a concrete length
- **Highlight rings** focus attention without giving the answer away

The hint should reveal the *strategy*, not the answer. Following Polya's
"do not solve the problem for the student" principle, every overlay below
shows a partial scaffold the learner still has to read and act on.

---

## 2. Reference Pattern (from PartitionInteraction)

The existing partition cut-line hint defines the conventions for all overlays:

```typescript
// src/scenes/interactions/PartitionInteraction.ts:163
showCutLineHint(targetPartitions: number): void {
  this.cutLineHint?.destroy();                          // idempotent
  this.cutLineHint = this.scene.add.graphics()
    .setDepth(7)
    .setAlpha(0.85);

  const CUT_COLOR = 0xffaa00;                           // orange/gold
  const LINE_WIDTH = 3;
  const DASH_LEN = 12;
  const GAP_LEN  = 7;
  // ...draws dashed lines...
  log.scene('cut_line_hint_shown', { ... });
}
```

**Conventions to inherit verbatim** (do not invent new values):

| Property         | Value          | Rationale                                  |
|------------------|---------------:|--------------------------------------------|
| Hint colour      | `0xffaa00`     | Established gold/amber visual hint colour  |
| Stroke width     | `3` px         | Visible at 800×1280 canvas, not bossy      |
| Alpha            | `0.85`         | Distinct from solid game art               |
| Depth            | `7`            | Above content (depth 5), below UI (10+)    |
| Dash pattern     | `12 / 7`       | Matches existing partition hint            |
| Lifecycle        | persistent     | Stays until `unmount()` or re-trigger      |
| Idempotency      | destroy-first  | `this.hint?.destroy()` before recreate     |
| Telemetry        | `log.scene(...)` | One event per hint shown                 |

> ⚠ **No auto-fade.** Earlier draft proposed a 3-second fade. Rejected:
> kids need time to study a visual aid. The hint persists until the next
> question is loaded (which calls `unmount()`). This matches the partition
> precedent and is one less Phaser tween to maintain.

---

## 3. Architecture

### 3.1 Interface change (1 line)

`src/scenes/interactions/types.ts`

```typescript
export interface Interaction {
  archetype: ArchetypeId;
  mount(ctx: InteractionContext): void;
  unmount(): void;
  /** Optional Tier-2 visual overlay. Persistent until unmount or re-trigger. */
  showHint?(tier: HintTier): void;
}
```

Optional method → no breaking change for existing callers.

### 3.2 Dispatch (LevelScene.showHintForTier, ~6 lines)

`src/scenes/LevelScene.ts:988` currently has:

```typescript
if (tier === 'visual_overlay' && archetype === 'partition') {
  // ...partition-specific dispatch via showCutLineHint...
}
```

Extend with a generic fallback **after** the partition special case:

```typescript
} else if (tier === 'visual_overlay' && this.activeInteraction?.showHint) {
  this.activeInteraction.showHint(tier);
}
```

The partition path is preserved (it passes `targetPartitions`, not `tier`).
All other archetypes route through the new generic path.

### 3.3 Per-archetype field & cleanup (each interaction)

Each of the 7 archetypes needs:

1. A `private scene!: Phaser.Scene` field (currently none store the scene).
2. `this.scene = ctx.scene;` as the first line of `mount()`.
3. A `private hintGraphic: Phaser.GameObjects.Graphics | null = null;` field.
4. `this.hintGraphic?.destroy(); this.hintGraphic = null;` in `unmount()`.
5. The `showHint(tier)` method itself.

---

## 4. Per-archetype overlays

For each archetype the plan specifies (a) what the learner sees, (b) the
geometry to draw, (c) the payload fields it reads, and (d) the acceptance test.

### 4.1 CompareInteraction (`compare`)

**File**: `src/scenes/interactions/CompareInteraction.ts`
**Payload**: `{ fractionA, fractionB, leftLabel, rightLabel }` (line 28)
**Existing visual**: two `BarModel` instances side-by-side (`this.bars: BarModel[]`)

**Hint geometry**: Draw a horizontal dashed gold reference line spanning **both**
bars at the height of the *larger* fraction's filled region — this lets the
learner directly read off which bar's fill reaches the line.

```
 ┌────────┐    ┌────────┐
 │████│   │    │████████│ ← dashed gold line across both bars
 │   ◄┼───┼────┼───────►│   anchored at the taller fill level
 └────────┘    └────────┘
   1/2            3/4
```

Read the two parsed fractions (`parseFrac`), pick the larger value, and draw
one horizontal dashed line at that y-coordinate spanning both bars'
left edge → right edge.

**Acceptance**: Tier-2 hint on a `1/2 vs 3/4` template draws a dashed line
at the top of the 3/4 bar that visibly extends past the top of the 1/2 bar.

### 4.2 EqualOrNotInteraction (`equal_or_not`)

**File**: `src/scenes/interactions/EqualOrNotInteraction.ts`
**Existing visual**: two equal-or-unequal regions

**Hint geometry**: Draw a dashed gold rectangle outline around the larger
*shaded area* (or both, if equal). Adds a small "=" or "≠" symbol in the
gap between, but leaves the user to commit the answer themselves.

**Acceptance**: For an unequal pair, exactly one shape is ringed; for an equal
pair, both shapes are ringed.

### 4.3 OrderInteraction (`order`)

**File**: `src/scenes/interactions/OrderInteraction.ts`
**Payload** (line 24): `{ fractions: FractionRef[] }`
**Existing visual**: `NumberLine` with the fractions as draggable markers

**Hint geometry**: Snap **one** marker (the smallest fraction) to its correct
position with a dashed gold ring around it. The learner sees one anchor; they
must place the rest themselves.

**Acceptance**: After hint, one marker is visibly displaced toward 0 with a
gold ring; other markers remain at their original (incorrect) positions.

### 4.4 BenchmarkInteraction (`benchmark`)

**File**: `src/scenes/interactions/BenchmarkInteraction.ts`
**Payload** (line 11): `{ fraction, benchmark }`
**Existing visual**: single `NumberLine` with a draggable fraction marker

**Hint geometry**: Draw a tall dashed gold tick on the number line at the
*benchmark* (e.g. 1/2) — labelled ½ underneath. The learner must still drag
their marker; the hint only marks the reference point.

**Acceptance**: A vertical dashed tick is drawn at the benchmark's x-coordinate;
the user's drag marker is *not* moved.

### 4.5 LabelInteraction (`label`)

**File**: `src/scenes/interactions/LabelInteraction.ts`
**Existing visual**: parsed `BarModel` plus label-choice buttons

**Hint geometry**: Draw a dashed gold rectangle around the **shaded** part of
the bar model, plus a thin tick at each segment boundary. This makes the
"how many parts shaded / how many total" reading mechanical.

**Acceptance**: The shaded region is outlined; segment dividers each get a
short gold tick at top and bottom.

### 4.6 MakeInteraction (`make`)

**File**: `src/scenes/interactions/MakeInteraction.ts`
**Payload**: target fraction (e.g. build 3/4)
**Existing visual**: empty bar with N segments + tap-to-fill

**Hint geometry**: Draw a dashed gold outline around the **first k** segments
that need to be filled (k = numerator). Critically, do *not* fill them — the
learner still has to tap.

**Acceptance**: For target 3/4, segments 1–3 of 4 have a gold dashed outline;
segment 4 has no outline.

### 4.7 SnapMatchInteraction (`snap_match`)

**File**: `src/scenes/interactions/SnapMatchInteraction.ts`
**Payload** (line 27): `{ pairs: [...] }`
**Existing visual**: two columns of cards; user drags from left → right

**Hint geometry**: Draw an amber ring around the **first expected pair**
(left card and its correct right partner) plus a dashed connector line
between their centres.

**Acceptance**: Exactly one pair is ringed; the connector arrives at the
correct partner. Other pairs are untouched.

---

## 5. Edge cases & defensive code

| Case                                     | Handling                                              |
|------------------------------------------|-------------------------------------------------------|
| Hint button tapped twice                 | `this.hintGraphic?.destroy()` makes it idempotent     |
| Scene shuts down mid-hint                | `unmount()` destroys hint; Phaser cleans graphics     |
| Payload missing/malformed                | Wrap in `try/catch`; on failure, log and no-op        |
| `scene` field unset (mount not called)   | Optional chain `this.scene?.add` — silent no-op       |
| `prefers-reduced-motion`                 | Static draw; no tweens involved → no special case     |
| Hint requested on archetype without impl | Optional method on interface → caller checks presence |

---

## 6. Telemetry

Each `showHint()` invocation logs **once** via existing logger:

```typescript
log.scene('visual_hint_shown', {
  archetype: this.archetype,
  templateId: this.template.id,
});
```

Hint **events** are already recorded by `LevelScene.showHintForTier()` via
`hintEventRepo.record({ tier, pointCostApplied: 15, ... })` (line 1006). Do
not duplicate this recording inside the interaction.

---

## 7. Rollout — three batches

Each batch is independently shippable; later batches do not depend on earlier
ones once Phase 1 (interface + dispatch) lands.

### Phase 0 — Foundation (must merge first)
- [ ] Add `showHint?(tier)` to `Interaction` interface
- [ ] Add generic dispatch in `LevelScene.showHintForTier`
- [ ] No behavioural change yet (no implementations exist)

### Batch 1 — Bar-model archetypes (4 files)
- [ ] `CompareInteraction`
- [ ] `EqualOrNotInteraction`
- [ ] `LabelInteraction`
- [ ] `MakeInteraction`

These share the `BarModel` utility; implement together to amortise the
"how do I draw on a BarModel?" learning cost.

### Batch 2 — Number-line archetypes (2 files)
- [ ] `OrderInteraction`
- [ ] `BenchmarkInteraction`

These share `NumberLine`. Snap-to-position arithmetic is the only new logic.

### Batch 3 — Match archetype (1 file)
- [ ] `SnapMatchInteraction`

Uses raw card coordinates — no shared utility. Smallest, simplest batch.

---

## 8. Testing

### 8.1 Unit tests — none required

The existing 363-test suite must continue to pass. Visual overlays are draw
calls — Phaser's `Graphics` API is not unit-testable without a renderer. Trust
the integration smoke tests + manual verification.

### 8.2 Integration smoke (Playwright, optional)

For each archetype:
1. Open a level whose first question matches the archetype.
2. Click hint button twice (verbal + visual_overlay).
3. Assert: a `Phaser.GameObjects.Graphics` exists at depth 7 with non-empty
   bounds (via existing test hooks if available, else skip).

If we don't add Playwright assertions, list a manual test plan in the PR
description: open each archetype, tap hint twice, screenshot.

### 8.3 Regression checklist
- [ ] Partition cut-line hint still works (Phase 0 must not regress it).
- [ ] Hint tier-3 (`worked_example`) still falls through to text-only.
- [ ] `hintEventRepo` records exactly one event per hint click.
- [ ] Score penalty of 15 points still applied per visual_overlay click.

---

## 9. Out of scope

- **Animations.** No fades, no tweens. Static draws only.
- **Localised hint copy changes.** Verbal text comes from `quest.hint.*`
  catalog keys; this work does not touch copy.
- **Partition refactor.** `showCutLineHint(targetPartitions)` keeps its
  existing signature; we do not unify it under the generic `showHint(tier)`
  shape in this work. (Could be a follow-up task.)
- **Tier-3 worked-example overlays.** A separate, larger design problem.

---

## 10. Risks & mitigations

| Risk                                                     | Mitigation                                              |
|----------------------------------------------------------|---------------------------------------------------------|
| Drawing on top of existing UI elements                   | Use depth 7 (matches partition); UI lives at depth 10+  |
| BarModel internals change → hints break                  | Read public bounds via `bar.x/y/width/height`, not internals |
| Inconsistent hint geometry confuses kids                 | Single shared colour/dash pattern across all 7          |
| Memory leaks from un-destroyed graphics                  | Centralise in `unmount()`; one graphic per interaction  |
| Partition special-case ordering breaks if refactored     | Add comment at the dispatch site explaining the ordering |

---

## 11. Acceptance criteria (whole feature)

- [ ] All 9 levels: tapping hint twice on any non-partition question reveals a
      visible gold/amber overlay anchored to existing visuals.
- [ ] Overlays persist until question changes; `unmount()` cleans them up.
- [ ] `npm test` — all 363 tests pass.
- [ ] No regressions in partition cut-line hints.
- [ ] No new lint or type-check errors.
- [ ] Score penalty (15 pt) still applied; no double-charging.
- [ ] Manual screenshot of each of 7 archetypes attached to PR.
