---
title: Activity Archetypes
status: draft
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
constraint_refs: [C3, C6, C7, C8, C9]
related: [design-language.md, interaction-model.md, ../10-curriculum/scope-and-sequence.md, ../10-curriculum/levels/level-01.md, ../30-architecture/data-schema.md]
---

# Activity Archetypes

Catalogs every interaction archetype the MVP must implement. One section per mechanic. Each section documents:

1. **Purpose** — what concept this teaches
2. **Levels in scope** — which MVP levels (1–9) use this archetype
3. **Input gestures** — what the student physically does
4. **Validator pseudocode** — the shape of the correctness check (no real implementation)
5. **Feedback animations** — what the student sees on EXACT / CLOSE / WRONG outcomes
6. **Accessibility considerations** — touch-target, motion, audio, alternative input

This is the *contract* between curriculum authors (writing `QuestionTemplate`s in `levels/level-NN.md`) and engine implementers (writing validators and Phaser systems). If a mechanic referenced in a level spec is not in this catalog, the level spec is rejected.

The archetypes are drawn directly from the verbs in `scope-and-sequence.md §3` and the activities listed in `level-01.md §4`.

---

## 1. `partition`

**Purpose.** Student demonstrates understanding of *equal parts* by physically dividing a whole shape into N congruent regions. This is the foundational mechanic for L1 (halves), L4 (halves practice), and L5 (thirds, fourths).

**Levels in scope.** L1, L4, L5.

**Input gestures.**

- **Drag-divider:** Student drags one or more divider lines from the canvas edges across the shape. On Easy tier the divider snaps to axis centerlines; on Medium/Hard the divider is free-drag.
- **Tap-to-place:** Alternative input for circle partitioning — student taps the rim of the circle to place radial cut points.
- **Drag terminates** on `pointerup` outside the shape or after a 700 ms idle inside the shape.

**Validator pseudocode.**

```
validator.partition.equalAreas(payload, studentDrawnLines):
  regions = computeRegionsFromLines(payload.shapeType, studentDrawnLines)
  if regions.length != payload.targetPartitions:
    return { outcome: "WRONG", reason: "wrong_partition_count" }
  areas = regions.map(area)
  maxDelta = max(areas) - min(areas)
  relativeDelta = maxDelta / mean(areas)
  if relativeDelta <= payload.areaTolerance:
    return { outcome: "EXACT", errorMagnitude: relativeDelta }
  if relativeDelta <= payload.areaTolerance * 2:
    return { outcome: "CLOSE", errorMagnitude: relativeDelta }
  return { outcome: "WRONG", errorMagnitude: relativeDelta }
```

**Feedback animations.**

- **EXACT:** Each region briefly fills with the success color (per design-language `success` token), 250 ms ease-out. A short check icon pops above the shape.
- **CLOSE:** Regions pulse once at half opacity. A "nearly!" prompt appears. Student is allowed to nudge the divider.
- **WRONG:** The divider line shakes laterally (±4 px, 180 ms), then ghost-resets to a midline reference. No region fill.

**Accessibility considerations.**

- Divider line stroke ≥ 4 px so it remains visible at 360 px viewport.
- Drag handles are 44×44 (C7, WCAG 2.5.5).
- Reduced-motion: shake replaced with a one-frame red border flash; reset is instant.
- Audio cue on snap to centerline (ENABLED setting) for students who cannot perceive the snap visually.

---

## 2. `identify`

**Purpose.** Student selects, from a set of shape options, the one that matches a verbal/visual description (e.g., "Which one shows one half?"). Tests recognition without requiring production.

**Levels in scope.** L1 (`identify_half`), L2 (`identify_half`), L3 (thirds, fourths variants).

**Input gestures.**

- **Tap-select:** Student taps one of 2–4 option cards. A second tap on the same card confirms; a tap on a different card switches selection. A "Submit" button is shown below once any card is selected.
- **No drag, no multi-select.**

**Validator pseudocode.**

```
validator.identify.exactIndex(payload, studentSelectedIndex):
  if studentSelectedIndex == payload.targetIndex:
    return { outcome: "EXACT" }
  return {
    outcome: "WRONG",
    flaggedMisconceptionIds: lookupMisconceptionForDistractor(
      payload.options[studentSelectedIndex]
    )
  }
```

**Feedback animations.**

- **EXACT:** The chosen card scales to 1.05× and the success color outlines its border (240 ms). A confetti-free "✓" badge slides in.
- **WRONG:** The chosen card briefly tints with the error color, returns to neutral, and after 600 ms the correct card pulses once to draw the eye. No card is locked — student can pick again.

**Accessibility considerations.**

- Each option card ≥ 88×88 with 16 px padding around content (large touch target for K–2 fingers).
- Selection state is conveyed by both border color *and* a small filled dot in the corner (color-blind safe).
- Screen reader: each card has aria-label derived from its `payload.options[i].alt` field.
- Audio replay button on the prompt (per interaction-model §audio-replay).

---

## 3. `label`

**Purpose.** Student attaches a verbal label ("one half", "one third") to a visual region. Bridges visual recognition (mechanic 2) and symbolic representation (Level 6+).

**Levels in scope.** L2, L3.

**Input gestures.**

- **Drag-label-to-target:** Word-tile labels live in a tray at the bottom. Student drags a tile onto a highlighted region of the shape. A magnetic snap occurs within 90 px (per existing engine convention in `src/data/config.ts ENGINE_SETTINGS.snap`).
- **Tap-then-tap fallback:** Student taps a label tile, then taps a region. Equivalent outcome.

**Validator pseudocode.**

```
validator.label.matchTarget(payload, studentMappings):
  // studentMappings: Array<{ labelId, regionId }>
  for each mapping:
    if mapping.labelId != payload.expectedLabelForRegion[mapping.regionId]:
      return { outcome: "WRONG", errorMagnitude: numWrongMappings }
  return { outcome: "EXACT" }
```

**Feedback animations.**

- **EXACT:** The label tile docks into the region with a 220 ms ease-out, the region fills lightly with the label's accent color.
- **WRONG:** The label tile bounces back to the tray (350 ms, matching `ENGINE_SETTINGS.snap.returnDuration`). No color change.

**Accessibility considerations.**

- Label tiles are full-width buttons in vertical layout on viewports < 480 px to avoid tiny drag handles.
- Label text uses the typography sans-serif at 18 px minimum.
- Drag-and-drop has a keyboard alternative: tab to focus a label, space to "pick up", arrow keys to move, space to drop.

---

## 4. `make` / `fold`

**Purpose.** Student *produces* a fraction by partitioning a shape into the requested number of parts and (optionally) shading or selecting one part. Closely related to `partition` but with an explicit *target denominator* spoken in the prompt.

**Levels in scope.** L4 (make halves), L5 (make thirds, fourths).

**Input gestures.**

- **Drag-fold-line:** Student drags a "fold line" handle — visually rendered as a dashed line with grip handles on each end — across the shape. Snap modes per difficulty tier (axis-snap on Easy, free on Medium/Hard).
- **Tap-to-shade:** After folding, student taps regions to shade them. Shaded count must match prompt (e.g. "shade one half" → 1 region).

**Validator pseudocode.**

```
validator.make.foldAndShade(payload, studentFoldLines, studentShadedRegionIds):
  partitionResult = validator.partition.equalAreas(payload, studentFoldLines)
  if partitionResult.outcome != "EXACT":
    return partitionResult  // partition wrong → whole answer wrong
  expectedShadeCount = payload.targetNumerator
  if studentShadedRegionIds.length != expectedShadeCount:
    return { outcome: "WRONG", reason: "wrong_shade_count" }
  return { outcome: "EXACT" }
```

**Feedback animations.**

- **EXACT:** Folded regions briefly outline in dashed lines, then the shaded region(s) fill with success color.
- **WRONG (partition failed):** Same as `partition` WRONG.
- **WRONG (shade count off):** All currently-shaded regions briefly desaturate; the prompt re-highlights the target count.

**Accessibility considerations.**

- Fold-line handles are 44×44 even though the line itself is thinner.
- "Shade" tap targets are the full region area (no minimum tap zone needed if region < 44 px).
- Reduced motion: dashed-line outline animation replaced with a static dashed render.

---

## 5. `compare`

**Purpose.** Student decides whether one fraction is greater than, less than, or equal to another. Foundation for L6 (same denominator) and L7 (same numerator).

**Levels in scope.** L6, L7.

**Input gestures.**

- **Tap-zone:** Three buttons appear under the two fractions: `<`, `=`, `>`. Student taps one. Buttons are sized at minimum 56×56 with 12 px gap between (avoids fat-finger errors at 360 px width).
- **Side-by-side visuals:** Each fraction is shown as both a bar model and (on `medium`+) as the symbolic notation `a/b`.

**Validator pseudocode.**

```
validator.compare.relation(payload, studentRelation):
  // payload: { leftFracId, rightFracId }
  left = fractionBank.get(payload.leftFracId).decimalValue
  right = fractionBank.get(payload.rightFracId).decimalValue
  trueRelation = left < right ? "<" : left > right ? ">" : "="
  if studentRelation == trueRelation:
    return { outcome: "EXACT" }
  // Detect "more pieces = bigger" misconception
  flagged = []
  if studentRelation suggests denominator-as-magnitude:
    flagged.push("MC-WHB-02")
  return { outcome: "WRONG", flaggedMisconceptionIds: flagged }
```

**Feedback animations.**

- **EXACT:** The chosen relation button scales to 1.1×, the two bar models briefly align horizontally so the student visually confirms. 350 ms total.
- **WRONG:** The wrong button shakes (±3 px, 160 ms). The two bar models extend to align baselines so the student sees the magnitude difference. The relation buttons re-enable for retry.

**Accessibility considerations.**

- The `<` `=` `>` symbols are paired with arrow icons (←, =, →) for students who haven't formally learned the symbols.
- Bar models have a numeric label below each ("3 of 4" / "1 of 4") in addition to the visual.
- Color is *not* the only differentiator — the two fractions use different bar fills *and* labels.

---

## 6. `benchmark` / `benchmark_sort`

**Purpose.** Student categorizes a fraction by proximity to 0, 1/2, or 1. Develops magnitude intuition that supports comparison and ordering.

**Levels in scope.** L8.

**Input gestures.**

- **Drag-to-zone:** Three drop zones span the screen horizontally, labeled "Closer to 0", "Closer to 1/2", "Closer to 1". Student drags fraction cards from a deck into the correct zone.
- **Multiple cards per round:** Typically 3–6 cards per round. Submit button enables when all cards are placed.

**Validator pseudocode.**

```
validator.benchmark.sortToZone(payload, studentPlacements):
  // studentPlacements: Map<fracId, "zero"|"half"|"one">
  errors = 0
  for each (fracId, zone) in studentPlacements:
    expected = fractionBank.get(fracId).benchmark  // see data-schema §2.6
    expected = mapToCoarseBenchmark(expected)  // "almost_zero"→"zero" etc.
    if zone != expected:
      errors += 1
  if errors == 0: return { outcome: "EXACT" }
  if errors / total <= 0.25: return { outcome: "CLOSE" }
  return { outcome: "WRONG", errorMagnitude: errors / total }
```

**Feedback animations.**

- **EXACT (per card):** Card docks into zone with 220 ms ease, zone briefly highlights.
- **WRONG (on submit):** Mis-placed cards shake in their incorrect zones, then float to their correct zones over 500 ms with a slight curved path so the student sees the move.

**Accessibility considerations.**

- Zones are vertical strips on portrait viewports < 600 px wide (avoids cramped horizontal layout).
- Cards announce their fraction value to screen readers as "one third" not "1/3" in K–1 contexts (per `level-01.md §1` symbolic notation rule).

---

## 7. `order`

**Purpose.** Student arranges N fractions in increasing or decreasing magnitude order. The capstone mechanic for L9 — combines all earlier skills.

**Levels in scope.** L9.

**Input gestures.**

- **Drag-to-sequence:** Fraction cards appear in a row at the top. Student drags each card into a numbered slot row at the bottom. Slots highlight when a card is over them.
- **Long-press to reorder:** Once a card is placed, long-press lifts it for re-positioning.

**Validator pseudocode.**

```
validator.order.sequence(payload, studentSequence):
  expected = payload.fractionIds.sortBy(decimalValue, payload.direction)
  if studentSequence == expected: return { outcome: "EXACT" }
  // Kendall tau distance: count swaps needed to reach expected
  swaps = kendallTauDistance(studentSequence, expected)
  if swaps == 1: return { outcome: "CLOSE", errorMagnitude: 1 }
  return { outcome: "WRONG", errorMagnitude: swaps }
```

**Feedback animations.**

- **EXACT:** Cards briefly bounce in sequence left-to-right (40 ms stagger) showing the correct order.
- **WRONG:** Cards in wrong positions tint, then animate to correct positions (curved path, 600 ms total) with the student watching.

**Accessibility considerations.**

- Slot indices are labeled "1st smallest" / "2nd smallest" etc., not just "1, 2, 3" — emphasizes the order semantic.
- Reduced motion: animated reordering replaced by an instant re-arrangement with a 200 ms fade.

---

## 8. `snap_match`

**Purpose.** Student pairs related items (fraction-to-bar, fraction-to-word, fraction-to-equivalent). Generic matching mechanic.

**Levels in scope.** L2 (word-to-shape), L3 (word-to-shape with thirds/fourths).

**Input gestures.**

- **Drag-pair:** Two columns of items. Student drags from left column onto a right-column target. Successful match removes both items and they re-appear together below as a paired set.

**Validator pseudocode.**

```
validator.snap_match.allPairs(payload, studentPairs):
  if studentPairs.length != payload.expectedPairs.length:
    return { outcome: "WRONG", reason: "incomplete" }
  for pair in studentPairs:
    if not payload.expectedPairs.contains(pair):
      return { outcome: "WRONG" }
  return { outcome: "EXACT" }
```

**Feedback animations.**

- **EXACT (per pair):** Both items glow lightly and dock together with a 200 ms slide.
- **WRONG (per attempted pair):** Dragged item bounces back; a brief "X" ghost appears at the drop site for 300 ms.

**Accessibility considerations.**

- Magnetic snap range matches existing `ENGINE_SETTINGS.snap.snapDistance` (90 px) to avoid asking the student to be pixel-perfect.
- Each item carries a high-contrast text label, not just a visual shape.

---

## 9. `equal_or_not`

**Purpose.** Binary judgment: is this partition into equal parts, or not? Targets the very first conceptual hurdle of fractions (per `level-01.md §1 G1.1`).

**Levels in scope.** L1.

**Input gestures.**

- **Tap-zone:** Two large buttons — green ✓ and red ✗ — fill the bottom third of the screen. Single tap submits.
- **No drag.** Decision is binary; complexity is in the visual judgment, not the input.

**Validator pseudocode.**

```
validator.equal_or_not.areaTolerance(payload, studentAnswer):
  // payload: { partitionLines, shapeType }, correctAnswer: boolean
  if studentAnswer == payload.correctAnswer:
    return { outcome: "EXACT" }
  return { outcome: "WRONG" }
```

(The tolerance lives upstream: `correctAnswer` is precomputed at content-authoring time using the ±2% area rule from `level-01.md §4.1`. The runtime validator just compares booleans.)

**Feedback animations.**

- **EXACT:** Chosen button fills with success color, the shape's partitions briefly outline in matching color.
- **WRONG:** Chosen button shakes once; the shape's regions overlay translucent area-fill bars showing actual proportions, so the student *sees* the error.

**Accessibility considerations.**

- Buttons are paired with text labels ("Equal" / "Not equal") below the icons.
- Icon size is 48×48 inside a 88×88 tap area.
- Reduced motion: area-fill overlay appears instantly rather than animating.

---

## 10. `placement`

**Purpose.** Student drags a fraction card onto a number line and drops it at the correct position. Bridges symbolic and magnitude reasoning. Critical for L8 (benchmark via number line) and exists in the prototype today.

**Levels in scope.** L8 (primary), L9 (secondary, used as ordering scaffold).

**Input gestures.**

- **Drag-to-position:** Student picks up a fraction card from the tray and drags onto a horizontal number line marked 0 → 1. Snap behavior is *off* — the student must place freely. The X position determines the answer.
- **Tick marks** are visible at benchmark positions (0, 1/2, 1) to give visual anchors.

**Validator pseudocode.**

```
validator.placement.tolerance(payload, studentPlacedDecimal):
  expected = fractionBank.get(payload.targetFracId).decimalValue
  errorMagnitude = abs(studentPlacedDecimal - expected)
  if errorMagnitude <= payload.exactTolerance:    // typically 0.05
    return { outcome: "EXACT", errorMagnitude }
  if errorMagnitude <= payload.closeTolerance:    // typically 0.15
    return { outcome: "CLOSE", errorMagnitude }
  return { outcome: "WRONG", errorMagnitude }
```

**Feedback animations.**

- **EXACT:** Card "snaps" to the precise position with a gentle 180 ms ease and a short success pulse on the number line beneath it.
- **CLOSE:** Card stays where dropped; a small ghost arrow points to the true position for 800 ms.
- **WRONG:** Card returns to tray (350 ms ease, per existing `ENGINE_SETTINGS.snap.returnDuration`). The number line briefly shows where the answer should have been.

**Accessibility considerations.**

- Number line is at minimum 280 px wide on the smallest viewport (360 px) — wide enough for benchmark differentiation.
- Tick labels (0, 1/2, 1) use the typography sans-serif at 16 px.
- Audio cue when card crosses each benchmark tick during drag (TTS: "half"). Toggleable.
- Reduced motion: card teleports to dropped position; ghost arrow becomes a static marker.

---

## 11. Validator Registry (audit §2.2 fix)

Every `QuestionTemplate.validatorId` must appear in this table. The content pipeline verifies against this list at build time (see `content-pipeline.md §4`). Validators are pure TypeScript functions living in `src/validators/`.

| validatorId | Signature | Returned outcome semantics | Used by archetype |
|-------------|-----------|---------------------------|-------------------|
| `validator.partition.equalAreas` | `(payload: PartitionPayload, studentDrawnLines: Line[]) => Outcome` | Returns `EXACT` if relative area delta ≤ `areaTolerance`; `CLOSE` if ≤ `areaTolerance × 2`; else `WRONG`. | `partition`, `make` |
| `validator.identify.exactIndex` | `(payload: IdentifyPayload, studentSelectedIndex: number) => Outcome` | Returns `EXACT` if `studentSelectedIndex === payload.targetIndex`; else `WRONG` with any flagged misconceptionIds. | `identify` |
| `validator.label.matchTarget` | `(payload: LabelPayload, studentMappings: Array<{labelId, regionId}>) => Outcome` | Returns `EXACT` if all label→region mappings match `payload.expectedLabelForRegion`; else `WRONG` with error count as `errorMagnitude`. | `label` |
| `validator.make.foldAndShade` | `(payload: MakePayload, studentFoldLines: Line[], studentShadedRegionIds: string[]) => Outcome` | Delegates partition check to `validator.partition.equalAreas`; then validates shaded region count. | `make` |
| `validator.compare.relation` | `(payload: ComparePayload, studentRelation: "<"\|"="\|">") => Outcome` | Returns `EXACT` if student relation matches computed decimal comparison; else `WRONG` with optional misconception flags. | `compare` |
| `validator.benchmark.sortToZone` | `(payload: BenchmarkPayload, studentPlacements: Map<string,"zero"\|"half"\|"one">) => Outcome` | Returns `EXACT` if 0 errors; `CLOSE` if ≤ 25% misplaced; else `WRONG` with `errorMagnitude = errors/total`. | `benchmark` |
| `validator.order.sequence` | `(payload: OrderPayload, studentSequence: string[]) => Outcome` | Returns `EXACT` if sequence matches sorted order; `CLOSE` if 1 swap off (Kendall tau distance = 1); else `WRONG`. | `order` |
| `validator.snap_match.allPairs` | `(payload: SnapMatchPayload, studentPairs: Array<[string,string]>) => Outcome` | Returns `EXACT` if all pairs match `payload.expectedPairs`; else `WRONG`. | `snap_match` |
| `validator.equal_or_not.areaTolerance` | `(payload: EqualOrNotPayload, studentAnswer: boolean) => Outcome` | Returns `EXACT` if `studentAnswer === payload.correctAnswer`; else `WRONG`. (`correctAnswer` is pre-computed at authoring time using a ±2% area rule.) | `equal_or_not` |
| `validator.placement.snapTolerance` | `(payload: PlacementPayload, studentPlacedDecimal: number) => Outcome` | Returns `EXACT` if `errorMagnitude ≤ payload.exactTolerance` (typically 0.05); `CLOSE` if ≤ `payload.closeTolerance` (typically 0.15); else `WRONG`. | `placement` |
| `validator.placement.snap8` | `(payload: PlacementPayload, studentPlacedDecimal: number) => Outcome` | Variant of `snapTolerance` calibrated for eighths-denominator pools (exactTolerance = 0.0625). | `placement` |

---

## 12. Cross-Archetype Notes

- **All archetypes** must record an `Attempt` row per `data-schema §3.3`. The `studentAnswerRaw` field's shape is dictated by the archetype (e.g. `{ placedDecimal, snapPositionX }` for `placement`, `studentSelectedIndex` for `identify`).
- **All archetypes** must respect the hint budget defined per difficulty tier in the level spec. See `interaction-model.md §hint-escalation`.
- **All archetypes** participate in the `Misconception` detection pipeline. Wrong answers are inspected against `payload.misconceptionTraps`; matches generate a `MisconceptionFlag` row.
- **No archetype uses ambient glow** (per C6). Snap, fill, and pulse are allowed; persistent particle systems are not.
