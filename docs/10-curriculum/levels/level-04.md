---
title: Level 4 — Make Halves
status: active
owner: solo
last_reviewed: 2026-04-30
applies_to: [mvp]
constraint_refs: [C3, C8, C9]
related:
  [
    ./level-03.md,
    ./level-05.md,
    ./level-01.md,
    ../scope-and-sequence.md,
    ../../30-architecture/data-schema.md,
  ]
---

# Level 4 — Make Halves

The first level where **active partitioning becomes the primary mechanic**. Levels 1–3 trained the student to **identify** halves, thirds, and fourths. Level 4 returns to halves only and asks the student to **produce** them — by drag, by fold, by tap.

Per C8, Level 4 stays on halves. This is intentional: the student has already met thirds and fourths in Level 3 (identification), but **producing** them is harder, and we want the partitioning skill consolidated on the easiest denominator before extending to thirds and fourths in Level 5.

This level is the bridge between the Discovery and Formalization phases of the salvaged Learning Trajectory. From `02_LEARNING_TRAJECTORY.md` Level 3 (Body Math Halves) and Level 4 (Halving Across Contexts):

> _A concept is not mastered until it transfers. Children who can halve a circle cannot necessarily halve a rectangle, a ribbon, a set of blocks, or a dough ball — each transfer is a learning event._

Per the Learning Trajectory, **symbolic notation is still not introduced**. All prompts use words.

---

## 1. Learning Goals

By the end of Level 4, the student can:

- **G4.1** — Drag a single partition line to split a shape into 2 equal parts (region halving)
- **G4.2** — Halve a shape across multiple shape families: rectangle, square, circle, triangle, irregular blob
- **G4.3** — Halve along non-canonical axes: diagonal halves, off-center wholes, rotated shapes
- **G4.4** — Halve a **length** (a ribbon or strip): drag a marker to the midpoint
- **G4.5** — Recognize when their own attempt is **not yet halved** and self-correct (reversibility)

This level is where the student's **eye and hand calibrate**. Level 1's partition activity introduced the mechanic; Level 4 makes it the dominant interaction.

Per Learning Trajectory Levels 3–4 (Body Math Halves, Halving Across Contexts), this corresponds to objectives **D6, D7, F1, F2, F3, F4** — production fluency across contexts.

---

## 2. Skills Tracked

Skill IDs are consolidated per D-023. See `../skills.md` for canonical definitions.

| Skill ID | Name | BKT priors |
| -------- | ---- | ---------- |
| `KC-PRODUCTION-1` | Region & Length Halving | `pInit=0.15, pTransit=0.20, pSlip=0.10, pGuess=0.15` |

> [!NOTE]
> `KC-PRODUCTION-1` consolidates legacy skills SK-11, SK-12, SK-13, and SK-14. This focuses the BKT engine on the core active production mechanic required for halving before moving to more complex partitions in Level 5.

Mastery of `KC-PRODUCTION-1` is required to unlock Level 5.

---

## 3. Standards Crosswalk (informational)

| Standard                                                                                   | Coverage                                       |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **CCSS.1.G.A.3** (partition into 2 equal shares; describe as halves)                       | Primary — production focus                     |
| **CCSS.2.G.A.3** (recognize equal shares of identical wholes need not have the same shape) | Primary — diagonal halves, irregular shapes    |
| **CCSS.1.MD.A.2** (length as whole-number units)                                           | Light — length-halving connects to measurement |
| **CCSS.K.G.A.2** (orientation invariance)                                                  | Light — partition under rotation               |

This level is the most direct match to **CCSS.1.G.A.3** — it is the active partitioning skill the standard explicitly requires.

---

## 4. Activities at This Level

Three core activities. All three involve active production. A maintenance interleaving rule (§4.4) keeps identification skills warm.

### 4.1 Activity: `make_halves` (mechanic: make / partition)

**Slug:** `make_halves`
**Mechanic:** make
**Title:** "Cut It in Half"
**Levels in app:** L4 primary (continues `partition_halves` from L1 with broader shape pool and no snap)

The student sees a whole shape. They drag a single line across it to split into two equal parts. Validator checks resulting partition areas. This is the core production loop.

#### Difficulty tiers

| Tier   | Shape pool                                                  | Drag affordance                                 | Tolerance | Hint budget |
| ------ | ----------------------------------------------------------- | ----------------------------------------------- | --------- | ----------- |
| Easy   | Rectangle, square (axis-aligned)                            | Soft snap to centerlines (vertical, horizontal) | ±5% area  | 3           |
| Medium | Rectangle, square, circle                                   | No snap                                         | ±5% area  | 2           |
| Hard   | Triangle, irregular blob, rotated rectangle (15°+ off axis) | No snap                                         | ±3% area  | 1           |

#### Question template archetype

**Type:** `partition`
**Payload shape:** `{ shapeType, targetPartitions: 2, snapMode: "axis"|"free", areaTolerance: number, rotation?: number }`
**Correct answer shape:** none (validator computes from drawn line)
**Validator:** `validator.partition.equalAreas`

#### Sample templates (3 of 14 needed)

```jsonc
// Easy — axis-aligned rectangle with soft snap to vertical or horizontal centerline
// MC-EOL-01 tag: student with "any two pieces = halves" misconception may accept a
// clearly off-center snap position without noticing the areas are unequal.
{
  "id": "q:mh:L4:0001",
  "type": "partition",
  "prompt": { "text": "Cut this shape into two equal parts.", "ttsKey": "tts.mh.l4.0001" },
  "payload": {
    "shapeType": "rectangle",
    "targetPartitions": 2,
    "snapMode": "axis",
    "areaTolerance": 0.05
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.equalAreas",
  "skillIds": ["KC-PRODUCTION-1"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "easy"
}

// Medium — circle with no snap; student must judge centerline by eye
{
  "id": "q:mh:L4:0007",
  "type": "partition",
  "prompt": { "text": "Cut this circle into two equal parts.", "ttsKey": "tts.mh.l4.0007" },
  "payload": {
    "shapeType": "circle",
    "targetPartitions": 2,
    "snapMode": "free",
    "areaTolerance": 0.05
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.equalAreas",
  "skillIds": ["KC-PRODUCTION-1"],
  "misconceptionTraps": ["MC-L4-CENTER-01"],
  "difficultyTier": "medium"
}

// Hard — irregular blob shape; tighter tolerance; requires careful judgment
{
  "id": "q:mh:L4:0012",
  "type": "partition",
  "prompt": { "text": "Cut this shape into two equal parts.", "ttsKey": "tts.mh.l4.0012" },
  "payload": {
    "shapeType": "irregular_blob_01",
    "targetPartitions": 2,
    "snapMode": "free",
    "areaTolerance": 0.03,
    "rotation": 0
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.equalAreas",
  "skillIds": ["KC-PRODUCTION-1"],
  "misconceptionTraps": ["MC-L4-SYMMETRY-01"],
  "difficultyTier": "hard"
}
```

**Authoring target for this activity:** 14 templates (5 easy, 6 medium, 3 hard). Predefined irregular blob shapes (`irregular_blob_01` through `irregular_blob_06`) live in the visual asset bundle.

---

### 4.2 Activity: `halve_the_length` (mechanic: make)

**Slug:** `halve_the_length`
**Mechanic:** make
**Title:** "Halve the Ribbon"
**Levels in app:** L4 primary

A horizontal ribbon (a long thin rectangle) is shown. The student drags a marker along the ribbon to mark the midpoint. Validator checks distance from true midpoint.

This activity targets a different mental model than region halving. From the Learning Trajectory's F2 objective: _"Halve a length (ribbon, line, string)."_ The salvaged Activity 03 Day 4 Station 3 (Ribbon Halving) is the source.

#### Difficulty tiers

| Tier   | Length & cues                                               | Marker behavior           | Tolerance  | Hint budget |
| ------ | ----------------------------------------------------------- | ------------------------- | ---------- | ----------- |
| Easy   | 200px ribbon, tick marks at every 25%                       | Soft snap to nearest tick | ±5% length | 3           |
| Medium | 300px ribbon, no tick marks                                 | Free drag                 | ±5% length | 2           |
| Hard   | 400px ribbon, no ticks, slight visual distractors (shading) | Free drag                 | ±3% length | 1           |

#### Question template archetype

**Type:** `placement`
**Payload shape:** `{ ribbonLengthPx: number, showTicks: boolean, snapMode: "tick"|"free", lengthTolerance: number }`
**Correct answer shape:** `number` (correct fractional position; always 0.5 for halving)
**Validator:** `validator.placement.midpoint`

#### Sample templates (3 of 10 needed)

```jsonc
// Easy — short ribbon with tick marks and snap
// MC-EOL-01 tag: student who thinks "any mark divides it" may snap to a
// non-midpoint tick and accept it as "the middle" without checking equality.
{
  "id": "q:htl:L4:0001",
  "type": "placement",
  "prompt": { "text": "Mark the middle of the ribbon.", "ttsKey": "tts.htl.l4.0001" },
  "payload": {
    "ribbonLengthPx": 200,
    "showTicks": true,
    "snapMode": "tick",
    "lengthTolerance": 0.05
  },
  "correctAnswer": 0.5,
  "validatorId": "validator.placement.midpoint",
  "skillIds": ["KC-PRODUCTION-1"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "easy"
}

// Medium — no ticks
{
  "id": "q:htl:L4:0005",
  "type": "placement",
  "prompt": { "text": "Mark the middle of the ribbon.", "ttsKey": "tts.htl.l4.0005" },
  "payload": {
    "ribbonLengthPx": 300,
    "showTicks": false,
    "snapMode": "free",
    "lengthTolerance": 0.05
  },
  "correctAnswer": 0.5,
  "validatorId": "validator.placement.midpoint",
  "skillIds": ["KC-PRODUCTION-1"],
  "misconceptionTraps": ["MC-L4-LEFTBIAS-01"],
  "difficultyTier": "medium"
}

// Hard — long ribbon with shading distractor; tighter tolerance
{
  "id": "q:htl:L4:0009",
  "type": "placement",
  "prompt": { "text": "Mark the middle of the ribbon.", "ttsKey": "tts.htl.l4.0009" },
  "payload": {
    "ribbonLengthPx": 400,
    "showTicks": false,
    "snapMode": "free",
    "lengthTolerance": 0.03,
    "visualDistractor": "left_shading"
  },
  "correctAnswer": 0.5,
  "validatorId": "validator.placement.midpoint",
  "skillIds": ["KC-PRODUCTION-1"],
  "misconceptionTraps": ["MC-L4-LEFTBIAS-01"],
  "difficultyTier": "hard"
}
```

**Authoring target for this activity:** 10 templates (3 easy, 4 medium, 3 hard).

---

### 4.3 Activity: `halve_the_set` — **CUT (audit §1.6)**

> **Removed.** `misconceptions.md` §4 (M8) declares set-fraction active-halving out of MVP scope. Set recognition (identification-only) remains in Level 2 via `half_of_a_set` (`KC-SET-MODEL`). This activity and its associated production skill are removed from MVP. See `../skills.md`.

---

### 4.4 Maintenance Interleaving Rule

Because Level 4 returns to halves-only after Level 3 introduced thirds/fourths, the progression engine **interleaves identification questions** from Level 3 every 4–5 attempts. This keeps `KC-UNITS-VIS` warm and prevents premature decay (`SkillMastery.state` dropping to `"DECAYED"`).

Specifically:

- After every 4 successful Level-4 attempts, one Level-3 identify-fourths or identify-thirds question is interleaved
- After every 6 attempts, one Level-3 `name_the_fraction` question is interleaved
- Interleaved questions are scored toward `KC-UNITS-VIS` or `KC-SET-MODEL`, not Level-4 mastery gates

This is consistent with Pedagogical Philosophy §IV (Universal Design for Learning) and Cognitive Load Theory — interleaving prevents skill decay without overwhelming the active learning goal.

---

## 5. Misconceptions Detected at This Level

| MC ID               | Name                                                                                                                              | Detection signal                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `MC-EOL-01`         | "Any two pieces = halves" (carried from L1) — student accepts any partition into two parts as equal halves without checking areas | Wrong or no-retry on `make_halves` / `halve_the_length` Easy templates; `KC-PRODUCTION-1` not advancing despite many attempts |
| `MC-L4-CENTER-01`   | "Off-center halves are halves" — student drops the partition line within 5–15% of center and accepts it without retry             | `outcome === "WRONG"` on `make_halves` Medium with `errorMagnitude` between 0.05 and 0.15, and student does not retry |
| `MC-L4-SYMMETRY-01` | "Visual symmetry alone = equal halves" — for irregular blobs, student picks the visually obvious axis even when areas are unequal | Wrong on `make_halves` Hard with irregular blob and partition along visual axis-of-symmetry                           |
| `MC-L4-LEFTBIAS-01` | "Left-of-center bias" — student systematically places midpoint marker leftward (cultural/reading-direction artifact)              | Average `errorMagnitude` on `halve_the_length` is consistently negative (leftward) across 5+ attempts                 |
| `MC-L4-NORETRY-01`  | "First answer = final answer" — failure to self-check (M3 generalized)                                                            | Low retry rate on `make_halves` after WRONG outcome; `KC-PRODUCTION-1` not advancing                                  |
| `MC-L4-AXIS-01`     | "Halving means vertical-line-down-middle only" (M2 generalized) — student always drags vertical lines even on rotated shapes      | Wrong on `make_halves` Hard with rotated rectangles when student draws the world-vertical (not shape-vertical) axis   |

These map to misconceptions **M3, M7** in `MISCONCEPTIONS_FRAMEWORK.md`, plus the carried `MC-EOL-01` (M3 base form) and three new L4-specific ones (CENTER-01, LEFTBIAS-01, NORETRY-01).

---

## 6. Fraction Pool

Per C8, Level 4 stays on halves only:

```json
[
  {
    "id": "frac:1/2",
    "numerator": 1,
    "denominator": 2,
    "decimalValue": 0.5,
    "benchmark": "half",
    "denominatorFamily": "halves"
  },
  {
    "id": "frac:2/2",
    "numerator": 2,
    "denominator": 2,
    "decimalValue": 1.0,
    "benchmark": "one",
    "denominatorFamily": "halves"
  }
]
```

`frac:2/2` is shown only in scaffolding hints ("two halves make the whole"). It is never a question target.

The Level 3 fractions (`frac:1/3`, `frac:1/4`, etc.) appear only in interleaved maintenance questions (§4.4), not in primary Level 4 questions.

---

## 7. Advancement Criteria (Mastery Gate to Level 5)

A student unlocks Level 5 when **all** are true:

- `SkillMastery.state === "MASTERED"` for `KC-PRODUCTION-1` (see `../skills.md`)
- All Level 1–3 skills (`KC-HALVES-VIS`, `KC-UNITS-VIS`, and `KC-SET-MODEL`) remain at `"MASTERED"` or `"APPROACHING"` (no `"DECAYED"`)
- At least 20 attempts across both remaining production activities (`make_halves`, `halve_the_length`), 10 minimum each (audit §1.6: `halve_the_set` activity cut)
- Tier 3 (Hard) accuracy ≥ 65% across the last 6 hard attempts
- **Self-correction rate** (a derived metric: retries-after-WRONG / total-WRONG) ≥ 50% on `make_halves` — ensures `KC-PRODUCTION-1` is genuine, not just lucky guesses
- No active `MisconceptionFlag` for `MC-L4-NORETRY-01` (the metacognitive gate)

The self-correction criterion is unique to Level 4 and reflects the central pedagogical move: **producing halves requires noticing when your half is wrong**.

---

## 8. Estimated Session Time

Per C9:

- **Single session:** 12–15 minutes (5 production attempts with hints + interleaved maintenance + 2 unscaffolded check problems)
- **Full level mastery:** 5–8 sessions across 3–5 days

Level 4 sessions tend to run slightly longer than identification levels because each production attempt has a longer think-and-act loop (drag, judge, possibly retry).

---

## 9. Authoring Status

| Item                             | Required                                               | Authored                             | Notes                                                                           |
| -------------------------------- | ------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------- |
| `make_halves` templates          | 14                                                     | 3 doc examples                       | ≥30 floor met in bundle. Per-activity aspirational target: 14.                  |
| `halve_the_length` templates     | 10                                                     | 3 doc examples                       | Per-activity aspirational target: 10. Increase when sub-activity tagging added. |
| **Bundle total (live)**          | ≥30                                                    | **30 ✓** (all `make` archetype)      | `public/curriculum/v1.json` — floor met as of 2026-04-30 (+11 added this sprint; easy:9, medium:11, hard:10). |
| Irregular blob asset definitions | 6                                                      | 0                                    | Need to author and store as static SVG paths                                    |
| TTS audio scripts                | 30                                                     | 0                                    | Generate via SpeechSynthesis API at runtime                                     |
| Hint definitions                 | ~90 (3 per 30)                                         | 0                                    | Should include "drag to the center" and "two halves should match" overlay hints |
| Validator function specs         | 3 (one new: `placement.midpoint`, `halving.evenSplit`) | High-level only                      | Need detailed pseudocode in `../../20-mechanic/activity-archetypes.md`          |

---

## 10. Open Questions for Level 4

1. **Snap behavior on Tier 1.** Level 1's `partition_halves` Tier 1 had axis snap. Level 4 keeps this for continuity. But should the snap radius be **smaller** here (encouraging finer judgment) or the **same** (preserving easy success)? Recommended: same radius as L1 to honor the easy entry point; remove snap entirely at Tier 2.
2. **Self-correction detection.** `KC-PRODUCTION-1` (self-check facet) is observable only through retry behavior. If a student **never** answers wrong, we can't measure their self-check skill. Should we deliberately seed Tier 1 with a soft-fail edge case (e.g., line at 0.45 area split is a near-miss) to give students a chance to self-correct? Recommended: yes, but only after they've succeeded at least 3 times to avoid frustration.
3. **Set halving with odd N.** Misconception M8 (Whole halved into whole objects) is critical. Should we **deliberately introduce** a single odd-count set at Tier 3 to surface the "you can't halve 5 cookies cleanly" insight, with scaffolded hint? Recommended: defer to Level 5 or 8 — at Level 4 it derails the production confidence we're building.
4. **Length halving at portrait viewport.** Per C7, the app supports 360–1024px. A 400px ribbon plus marker UI plus prompt must fit at 360px width. The current template assumes landscape layout for ribbons; portrait may force vertical ribbons. Recommended: support both and choose orientation based on viewport aspect ratio at runtime.
5. **Reverting from Level 4 to Level 3.** If the progression engine recommends `"regress"` from Level 4, where does the student land — Level 3 entry (identifying), or somewhere mid-Level-3? Recommended: regress to the lowest Level-3 skill not at MASTERED, not always entry. Requires the progression engine to be skill-aware, not just level-aware.
