---
title: Level 5 — Make Thirds and Fourths
status: active
owner: solo
last_reviewed: 2026-04-30
applies_to: [mvp]
constraint_refs: [C3, C8, C9]
related:
  [./level-04.md, ./level-03.md, ../scope-and-sequence.md, ../../30-architecture/data-schema.md]
---

# Level 5 — Make Thirds and Fourths

The capstone of the **"Identify and Make"** band (Levels 1–5). Students now actively partition shapes into **thirds** and **fourths**. Both denominator families are covered within this level — the first time the student is asked to switch between denominators **within a session**.

Per C8, Level 5 is the level where **review across halves/thirds/fourths** happens. The scope-and-sequence describes the cluster as "Make thirds and fourths" with ~12 topics. Note that this level still does not present a _comparison_ mechanic (1/3 vs 1/4) — that is Level 6+. Within Level 5, each individual question targets exactly one denominator; the cross-denominator practice happens at the **session** level via question shuffling.

Per the Learning Trajectory, **symbolic notation is still not introduced**. Symbols arrive at Level 6.

This is the final level before the curriculum mechanic shifts from area-model partitioning to comparison/ordering on a number line. After Level 5, the student should have a robust "one of N equal parts" schema across the denominators 2, 3, 4.

---

## 1. Learning Goals

By the end of Level 5, the student can:

- **G5.1** — Drag two partition lines to split a shape into 3 equal parts (region thirding)
- **G5.2** — Drag partition lines to split a shape into 4 equal parts (region fourthing — via two perpendicular folds, or two diagonal folds, or three parallel folds)
- **G5.3** — Discover fourths as **"half of a half"** (compositional production: halve, then halve each half)
- **G5.4** — Halve a length into thirds (mark two points to create three equal segments)
- **G5.5** — Split a set of N objects (N divisible by 3 or 4) into 3 or 4 equal-count groups
- **G5.6** — Switch between halves, thirds, and fourths within a single session without confusion (denominator-switching fluency)
- **G5.7** — Use the words **"one third"**, **"thirds"**, **"one fourth"**, **"one quarter"**, **"fourths"**, **"quarters"** consistently in audio prompts, including the half ↔ fourth synonymy ("a fourth is half of a half")

Per Learning Trajectory Levels 5 and 7 (Fourthing as Half-of-a-Half, Compositional Reasoning), this corresponds to objectives **F5, F6, F7, F11, F12, F13** — production fluency for thirds and fourths plus the compositional insight.

---

## 2. Skills Tracked

Skill IDs continue from Level 4. See `../skills.md` for canonical definitions. (audit §1.1 fix — SK-IDs renumbered to avoid collisions with former L8 definitions)

| Skill ID | Name | BKT priors |
| -------- | ---- | ---------- |
| `KC-PRODUCTION-2` | Complex Partitioning | `pInit=0.08, pTransit=0.18, pSlip=0.12, pGuess=0.10` |

> **MC-MAG-02 detection note:** Misconception MC-MAG-02 ("Whole Disappears When Divided") is detected via `KC-PRODUCTION-2` attempt logs. The two-step `compositional_fourths` activity requires the student to recognize that the original whole persists after partition, operationalizing "two halves make one whole" reasoning. See `../misconceptions.md` §3.3 MC-MAG-02. (audit §1.6 fix)

Production thirds (`SK-15`) is the lowest-prior skill in the entire MVP — there is no compositional shortcut for thirds the way there is for fourths (`SK-16` and `SK-17`). Expect this to be the slowest-mastering skill at this level.

`SK-20` is observed across the **session**, not within any single attempt. Detection: the student successfully completes consecutive attempts with different denominator targets without dropping into a single-denominator pattern.

Mastery of all six skills — `SK-15` through `SK-20` — is required to unlock Level 6.

---

## 3. Standards Crosswalk (informational)

| Standard                                                                                                          | Coverage                                                   |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **CCSS.1.G.A.3** (partition into 2 or 4 equal shares)                                                             | Primary — fourths production                               |
| **CCSS.2.G.A.3** (partition into 2, 3, or 4 equal shares)                                                         | Primary — thirds production, exceeding Grade 1             |
| **CCSS.1.G.A.2** (compose 2D shapes)                                                                              | Light — compositional fourthing                            |
| **CCSS.2.G.A.3** secondary clause: "recognize that equal shares of identical wholes need not have the same shape" | Light — fourths via diagonal folds vs. perpendicular folds |
| **NCTM PSSM PreK-2** Number and Operations: composing/decomposing                                                 | Primary — half-of-a-half framing                           |

This level explicitly addresses **CCSS.1.G.A.3**'s embedded clause: _"decomposing into more equal shares creates smaller shares"_ — which is operationalized in `compositional_fourths` (§4.3) where the student physically sees two thirds vs. two fourths of the same whole.

---

## 4. Activities at This Level

Three core activities. Cross-denominator practice happens at the session level, not within a single question.

### 4.1 Activity: `make_thirds` (mechanic: make / partition)

**Slug:** `make_thirds`
**Mechanic:** make
**Title:** "Cut It in Thirds"
**Levels in app:** L5 only

The student sees a whole shape and drags **two** partition lines to split it into three equal parts. The validator computes the three resulting areas and checks all three are within tolerance of each other.

This is the hardest production activity in the MVP through Level 5. There is no "fold then fold again" affordance — thirds require placing two cuts at roughly 33%/67% of the shape's relevant axis.

#### Difficulty tiers

| Tier   | Shape pool                                  | Drag affordance                                              | Tolerance               | Hint budget |
| ------ | ------------------------------------------- | ------------------------------------------------------------ | ----------------------- | ----------- |
| Easy   | Rectangle (axis-aligned)                    | Soft snap to thirds-grid (vertical lines at 0.333 and 0.667) | ±5% area on all 3 parts | 3           |
| Medium | Rectangle, square, circle                   | No snap; visual ghost of partition guide on first drag       | ±5% area                | 2           |
| Hard   | Triangle, irregular blob, rotated rectangle | No snap, no guide                                            | ±4% area                | 1           |

#### Question template archetype

**Type:** `partition`
**Payload shape:** `{ shapeType, targetPartitions: 3, snapMode: "third"|"free", areaTolerance: number, showGuide: boolean }`
**Correct answer shape:** none
**Validator:** `validator.partition.equalAreas` (generalized — checks N equal areas regardless of N)

#### Sample templates (3 of 12 needed)

```jsonc
// Easy — rectangle with thirds snap
{
  "id": "q:mt:L5:0001",
  "type": "partition",
  "prompt": { "text": "Cut this shape into three equal parts.", "ttsKey": "tts.mt.l5.0001" },
  "payload": {
    "shapeType": "rectangle",
    "targetPartitions": 3,
    "snapMode": "third",
    "areaTolerance": 0.05,
    "showGuide": false
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.equalAreas",
  "skillIds": ["KC-PRODUCTION-2"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

// Medium — circle with no snap; ghost guide on first drag only
{
  "id": "q:mt:L5:0006",
  "type": "partition",
  "prompt": { "text": "Cut this circle into three equal parts.", "ttsKey": "tts.mt.l5.0006" },
  "payload": {
    "shapeType": "circle",
    "targetPartitions": 3,
    "snapMode": "free",
    "areaTolerance": 0.05,
    "showGuide": true
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.equalAreas",
  "skillIds": ["KC-PRODUCTION-2"],
  "misconceptionTraps": ["MC-L5-THIRDS-HALF-01"],
  "difficultyTier": "medium"
}

// Hard — triangle, no scaffolds
{
  "id": "q:mt:L5:0011",
  "type": "partition",
  "prompt": { "text": "Cut this triangle into three equal parts.", "ttsKey": "tts.mt.l5.0011" },
  "payload": {
    "shapeType": "triangle",
    "targetPartitions": 3,
    "snapMode": "free",
    "areaTolerance": 0.04,
    "showGuide": false
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.equalAreas",
  "skillIds": ["KC-PRODUCTION-2"],
  "misconceptionTraps": ["MC-L5-THIRDS-HALF-01"],
  "difficultyTier": "hard"
}
```

**Authoring target for this activity:** 12 templates (4 easy, 5 medium, 3 hard).

---

### 4.2 Activity: `make_fourths` (mechanic: make / partition)

**Slug:** `make_fourths`
**Mechanic:** make
**Title:** "Cut It in Fourths"
**Levels in app:** L5 only

The student drags **three** partition lines (or two perpendicular fold lines, depending on the shape) to split the shape into four equal parts. The validator accepts multiple valid configurations:

- Three parallel cuts at 0.25, 0.5, 0.75 (rectangular bar form)
- Two perpendicular cuts at 0.5 each (cross / quadrant form)
- Two diagonal cuts (square only — produces 4 triangles)
- Pie-slice form (circle only — 4 radial cuts at 0°, 90°, 180°, 270°)

The validator checks: are all 4 resulting areas within tolerance? If yes, the answer is accepted regardless of which configuration the student chose.

#### Difficulty tiers

| Tier   | Shape pool                                  | Affordance                                      | Tolerance | Hint budget |
| ------ | ------------------------------------------- | ----------------------------------------------- | --------- | ----------- |
| Easy   | Rectangle, square (axis-aligned)            | Snap to fourths grid (any of three valid grids) | ±5% area  | 3           |
| Medium | Square, circle                              | No snap; multi-config accepted                  | ±5% area  | 2           |
| Hard   | Rotated rectangle, triangle, irregular blob | No snap, single valid config (parallel cuts)    | ±3% area  | 1           |

#### Question template archetype

**Type:** `partition`
**Payload shape:** `{ shapeType, targetPartitions: 4, snapMode: "fourth"|"free", areaTolerance: number, acceptedConfigurations: string[] }`
**Correct answer shape:** none
**Validator:** `validator.partition.equalAreas`

#### Sample templates (3 of 14 needed)

```jsonc
// Easy — rectangle with fourths snap, parallel cuts
{
  "id": "q:mf:L5:0001",
  "type": "partition",
  "prompt": { "text": "Cut this shape into four equal parts.", "ttsKey": "tts.mf.l5.0001" },
  "payload": {
    "shapeType": "rectangle",
    "targetPartitions": 4,
    "snapMode": "fourth",
    "areaTolerance": 0.05,
    "acceptedConfigurations": ["parallel"]
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.equalAreas",
  "skillIds": ["KC-PRODUCTION-2"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

// Medium — square accepts both perpendicular and diagonal configurations
{
  "id": "q:mf:L5:0006",
  "type": "partition",
  "prompt": { "text": "Cut this square into four equal parts.", "ttsKey": "tts.mf.l5.0006" },
  "payload": {
    "shapeType": "rectangle",
    "targetPartitions": 4,
    "snapMode": "free",
    "areaTolerance": 0.05,
    "acceptedConfigurations": ["parallel", "perpendicular", "diagonal"]
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.equalAreas",
  "skillIds": ["KC-PRODUCTION-2"],
  "misconceptionTraps": [],
  "difficultyTier": "medium"
}

// Hard — circle accepts only radial (pie) configuration
{
  "id": "q:mf:L5:0010",
  "type": "partition",
  "prompt": { "text": "Cut this circle into four equal parts.", "ttsKey": "tts.mf.l5.0010" },
  "payload": {
    "shapeType": "circle",
    "targetPartitions": 4,
    "snapMode": "free",
    "areaTolerance": 0.04,
    "acceptedConfigurations": ["radial", "perpendicular"]
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.equalAreas",
  "skillIds": ["KC-PRODUCTION-2"],
  "misconceptionTraps": ["MC-L5-FOURTHS-3CUTS-01"],
  "difficultyTier": "hard"
}
```

**Authoring target for this activity:** 14 templates (5 easy, 6 medium, 3 hard).

---

### 4.3 Activity: `compositional_fourths` (mechanic: make / partition, two-step)

**Slug:** `compositional_fourths`
**Mechanic:** make
**Title:** "Half of a Half"
**Levels in app:** L5 only

A two-step activity that operationalizes the salvaged Learning Trajectory's compositional insight: _"A fourth is half of a half."_

**Step 1:** The student halves a shape (single-line drag, like Level 4 `make_halves`).
**Step 2:** Once the halves are accepted, the shape redraws with the centerline locked. The student now halves **each half** with a second drag (or two drags, one per half). This produces fourths.

The student sees both steps as a single question; the validator checks the final configuration has 4 equal parts AND the first cut was a valid halving cut.

This activity is pedagogically critical. It is the only place in the MVP where the _relationship between halves and fourths_ is made visible through interaction. From the salvaged Activity 06 (Fourths Festival) Day 4: _"A fourth is HALF of a HALF."_

#### Difficulty tiers

| Tier   | Shape                      | Snap on step 1 | Snap on step 2                   | Hint budget |
| ------ | -------------------------- | -------------- | -------------------------------- | ----------- |
| Easy   | Rectangle (axis-aligned)   | Axis snap      | Snap to half-of-half centerlines | 3           |
| Medium | Square or circle           | Axis snap      | No snap                          | 2           |
| Hard   | Triangle or irregular blob | No snap        | No snap                          | 1           |

#### Question template archetype

**Type:** `partition`
**Payload shape:** `{ shapeType, mode: "compositional", step1Tolerance: number, step2Tolerance: number, snapModeStep1, snapModeStep2 }`
**Correct answer shape:** none
**Validator:** `validator.partition.compositionalFourths`

#### Sample templates (2 of 8 needed)

```jsonc
// Easy — rectangle with snap on both steps; teaches the move
{
  "id": "q:cf:L5:0001",
  "type": "partition",
  "prompt": { "text": "First, cut this shape in half. Then cut each half in half.", "ttsKey": "tts.cf.l5.0001" },
  "payload": {
    "shapeType": "rectangle",
    "mode": "compositional",
    "step1Tolerance": 0.05,
    "step2Tolerance": 0.05,
    "snapModeStep1": "axis",
    "snapModeStep2": "axis"
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.compositionalFourths",
  "skillIds": ["KC-PRODUCTION-2"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

// Hard — irregular blob, no snap
{
  "id": "q:cf:L5:0007",
  "type": "partition",
  "prompt": { "text": "First, cut this shape in half. Then cut each half in half.", "ttsKey": "tts.cf.l5.0007" },
  "payload": {
    "shapeType": "irregular_blob_03",
    "mode": "compositional",
    "step1Tolerance": 0.04,
    "step2Tolerance": 0.04,
    "snapModeStep1": "free",
    "snapModeStep2": "free"
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.compositionalFourths",
  "skillIds": ["KC-PRODUCTION-2", "KC-PRODUCTION-1"],
  "misconceptionTraps": ["MC-L5-COMP-NOREL-01"],
  "difficultyTier": "hard"
}
```

**Authoring target for this activity:** 8 templates (3 easy, 3 medium, 2 hard). Smaller pool because each instance is more involved.

---

### 4.4 Session-Level Cross-Denominator Mixing

A Level-5 session presents questions in this default sequence:

1. One Easy `make_thirds` or `make_fourths` (warm-up)
2. Two Medium attempts, alternating denominator (e.g., one fourths, one thirds)
3. One `compositional_fourths` Easy or Medium
4. One Hard attempt (denominator chosen by progression engine based on weakest skill)
5. One Easy attempt of the strongest skill (cool-down)
6. Optional: maintenance interleave from Level 4 (`make_halves`) every 4 sessions

The progression engine should observe `KC-PRODUCTION-2` (specifically the denominator-switching facet) by checking that consecutive different-denominator attempts both succeed. Repeated success with one denominator and failure on the other suggests switching fluency is not yet developed even if the underlying production skills are.

This mixing is the only place in the MVP through Level 5 where multiple denominators appear in a single session. Per C8 this is allowed because the questions remain single-denominator; we are mixing **across** questions, not **within** a question.

---

## 5. Misconceptions Detected at This Level

| MC ID                    | Name                                                                                                                                          | Detection signal                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `MC-L5-THIRDS-HALF-01`   | "Thirds via halving" — student tries to halve as the first cut on a thirds question, producing 1/2 + 1/4 + 1/4                                | `make_thirds` Medium/Hard with first cut at 0.5 ± 0.05 followed by attempts to subdivide one half                                  |
| `MC-L5-FOURTHS-3CUTS-01` | "Fourths means three cuts" — student fixates on the count of cuts (3 cuts → 4 parts) and applies it incorrectly to circles                    | Wrong on `make_fourths` Hard with circle; student attempts three radial cuts at uneven angles                                      |
| `MC-L5-COMP-NOREL-01`    | "Compositional move not internalized" (M6 generalized) — student treats step 1 and step 2 as unrelated; redraws step 1 cut after step 2 fails | High retry rate on `compositional_fourths` step 1 after step 2 fails                                                               |
| `MC-L5-DENSWITCH-01`     | "Sticky denominator" — student treats current question's denominator as the same as previous question even when prompt changes                | Wrong on a thirds question immediately after a successful fourths question, with cuts at 0.25/0.5/0.75 (i.e., still doing fourths) |
| `MC-L5-EQUAL-LAX-01`     | "Three is enough, never mind equal" (M3 generalized) — student lays down the right number of cuts but ignores equality                        | `make_thirds` or `make_fourths` Tier 2-3 with `errorMagnitude` > tolerance and no retry                                            |

Maps primarily to misconceptions **M3, M5, M6** in `MISCONCEPTIONS_FRAMEWORK.md`, plus L5-specific ones around denominator switching and compositional reasoning.

---

## 6. Fraction Pool

Per C8, Level 5 uses halves, thirds, and fourths:

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
  },
  {
    "id": "frac:1/3",
    "numerator": 1,
    "denominator": 3,
    "decimalValue": 0.333,
    "benchmark": "almost_half",
    "denominatorFamily": "thirds"
  },
  {
    "id": "frac:2/3",
    "numerator": 2,
    "denominator": 3,
    "decimalValue": 0.667,
    "benchmark": "almost_one",
    "denominatorFamily": "thirds"
  },
  {
    "id": "frac:3/3",
    "numerator": 3,
    "denominator": 3,
    "decimalValue": 1.0,
    "benchmark": "one",
    "denominatorFamily": "thirds"
  },
  {
    "id": "frac:1/4",
    "numerator": 1,
    "denominator": 4,
    "decimalValue": 0.25,
    "benchmark": "almost_zero",
    "denominatorFamily": "fourths"
  },
  {
    "id": "frac:2/4",
    "numerator": 2,
    "denominator": 4,
    "decimalValue": 0.5,
    "benchmark": "half",
    "denominatorFamily": "fourths"
  },
  {
    "id": "frac:3/4",
    "numerator": 3,
    "denominator": 4,
    "decimalValue": 0.75,
    "benchmark": "almost_one",
    "denominatorFamily": "fourths"
  },
  {
    "id": "frac:4/4",
    "numerator": 4,
    "denominator": 4,
    "decimalValue": 1.0,
    "benchmark": "one",
    "denominatorFamily": "fourths"
  }
]
```

The full Level 5 pool. Sixths and eighths still do not appear (per C8) — those arrive at Level 8.

---

## 7. Advancement Criteria (Mastery Gate to Level 6)

A student unlocks Level 6 (the comparison band) when **all** are true:

- `SkillMastery.state === "MASTERED"` for `KC-PRODUCTION-2` (see `../skills.md`)
- All Level 1–4 skills (`KC-HALVES-VIS`, `KC-SET-MODEL`, `KC-UNITS-VIS`, `KC-PRODUCTION-1`) remain at `"MASTERED"` or `"APPROACHING"`
- At least 36 attempts across all 3 production activities (12 minimum each)
- Tier 3 (Hard) accuracy ≥ 60% across the last 8 hard attempts (looser than earlier levels because production thirds is genuinely hard)
- **Denominator-switching success rate** ≥ 70%: of the consecutive-different-denominator attempt pairs in the last 3 sessions, at least 70% had both attempts correct
- No active `MisconceptionFlag` for `MC-L5-DENSWITCH-01` or `MC-L5-COMP-NOREL-01`

**Note:** `KC-PRODUCTION-2` consolidates the former production and switching skills. See `../skills.md` for the complete mapping. (audit §1.1 fix)

The denominator-switching criterion is unique to Level 5 and gates the transition to Level 6, where the student must reason about fractions across denominators (comparison). A student who cannot fluently switch within Level 5 will struggle catastrophically at Level 6.

---

## 8. Estimated Session Time

Per C9:

- **Single session:** 13–15 minutes (5–6 production attempts including one 2-step compositional, plus interleaved maintenance and 2 unscaffolded checks)
- **Full level mastery:** 6–10 sessions across 4–7 days

This is the longest level in the MVP through Level 5. Compositional fourths attempts take longer than single-step partitions; thirds production has the steepest learning curve in the entire MVP.

---

## 9. Authoring Status

| Item                              | Required                                      | Authored         | Notes                                                                                       |
| --------------------------------- | --------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `make_thirds` templates           | 12                                            | 3 examples shown | Need 9 more                                                                                 |
| `make_fourths` templates          | 14                                            | 3 examples shown | Need 11 more                                                                                |
| `compositional_fourths` templates | 8                                             | 2 examples shown | Need 6 more                                                                                 |
| TTS audio scripts                 | 34                                            | 0                | Generate via SpeechSynthesis API at runtime                                                 |
| Hint definitions                  | ~102 (3 per template)                         | 0                | Compositional hints should physically demonstrate "halve, then halve each half"             |
| Validator function specs          | 2 (one new: `partition.compositionalFourths`) | High-level only  | Need detailed pseudocode                                                                    |
| Multi-config validator behavior   | 1                                             | High-level only  | `equalAreas` must accept any config that produces N equal areas regardless of cut placement |

---

## 10. Open Questions for Level 5

1. **Thirds without a snap = frustration?** Production thirds is genuinely hard for 6–7-year-olds. The Tier 1 snap to a thirds-grid is essential. But should we provide a **persistent ghost guide** (faint vertical lines at 0.333 and 0.667) that fades as accuracy improves? Recommended: yes, for Tier 2 only; remove at Tier 3.
2. **Compositional vs. atomic fourths.** Some students will produce fourths via two perpendicular cuts (atomic) without engaging the half-of-a-half framing. Both are correct visually, but only the compositional version explicitly targets the compositional facet of `KC-PRODUCTION-2`. Should `make_fourths` and `compositional_fourths` be entirely separate question pools, or should `make_fourths` accept compositional answers and credit both? Recommended: separate pools.
3. **Set thirds and set fourths.** Unlike Level 4's even-only set halving, set-thirds requires multiples of 3 and set-fourths requires multiples of 4. Should we add a third activity `share_in_thirds_or_fourths` to `level-05.md`? Recommended: yes for content completeness, but it can be deferred past the MVP. The current 3-activity scope is sufficient for validation. **Open for review.**
4. **Hint design for compositional_fourths step 2.** When step 2 fails, should the hint show the correct second-cut location, or should it animate the half-of-a-half move? Recommended: the animated demonstration; static visual hints often fail to convey the procedural insight.
5. **Validator complexity for `equalAreas` with multi-config.** The validator currently described as "checks N equal areas regardless of N" must handle: parallel cuts, perpendicular cuts, diagonal cuts, radial cuts, and arbitrary irregular cuts. Each shape type has different valid configurations. Should the validator be shape-aware (one validator per shape) or shape-agnostic (compute polygon areas from cut lines, check tolerance)? Recommended: shape-agnostic for cleaner code; document the polygon-area algorithm in `../../20-mechanic/activity-archetypes.md`.
6. **Is Level 5 too long?** Per C9 (10–15 minute sessions), 6–10 sessions to mastery is on the high end of the MVP envelope. The session structure is heavily packed. Should we split Level 5 into Level 5a (thirds) and Level 5b (fourths)? **Implication:** this would push the MVP from 9 levels to 10. Recommended: keep as one level for MVP scope (C3), but flag as a candidate split for post-validation refinement.

