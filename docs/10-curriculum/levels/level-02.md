---
title: Level 2 — Identify Halves
status: draft
owner: solo
last_reviewed: 2026-04-25
applies_to: [mvp]
constraint_refs: [C3, C8, C9]
related: [./level-01.md, ../scope-and-sequence.md, ../../30-architecture/data-schema.md]
---

# Level 2 — Identify Halves

The student's second encounter with fractions. Goal: deepen the "one of two equal parts" schema established in Level 1 and stretch it across **shape variety**, **orientation**, and **set models**.

Per C8, this level **stays on halves only**. No thirds or fourths appear here. Per the Learning Trajectory, **symbolic notation (`1/2`) is not introduced**; only the words "one half", "halves", and "whole" are used.

This document is the complete spec for Level 2 and is the second instantiation of the level-01.md template.

---

## 1. Learning Goals

By the end of Level 2, the student can:

- **G2.1** — Identify "one half" of a shape regardless of the shape (rectangle, circle, square, triangle, irregular blob)
- **G2.2** — Identify "one half" regardless of orientation (vertical fold, horizontal fold, diagonal fold; rotated shapes)
- **G2.3** — Identify "one half" of a **set** of objects (4 of 8, 3 of 6, etc. — set-model halving)
- **G2.4** — Recognize when a shape **looks like** two parts but the parts are unequal (sharper Level-1 discrimination)
- **G2.5** — Use the words **"one half"**, **"halves"**, and **"the whole"** consistently in audio prompts

Level 2 is fundamentally an **identification and recognition level**. The active partitioning skill from Level 1's `partition_halves` activity is revisited as a maintenance task only — it returns as the primary skill in Level 4.

Per Learning Trajectory: this level corresponds to objectives **D7, F2, F3, F4** (halving across contexts and recognition under perceptual variation).

---

## 2. Skills Tracked

Skill IDs continue from Level 1. See `../skills.md` for canonical definitions.

| Skill ID | Name | BKT priors |
|----------|------|------------|
| `SK-04` | Identify halves across shape families (circle, rectangle, triangle, irregular) | `pInit=0.20, pTransit=0.25, pSlip=0.10, pGuess=0.30` |
| `SK-05` | Identify halves under rotation and orientation variation | `pInit=0.15, pTransit=0.20, pSlip=0.10, pGuess=0.25` |
| `SK-06` | Identify halves of a set (count-based half) | `pInit=0.10, pTransit=0.18, pSlip=0.12, pGuess=0.30` |

Existing skills `SK-01`, `SK-02`, `SK-03` from Level 1 are **revisited and reinforced** but not retaught. Their BKT estimates continue to update.

Mastery of `SK-04`, `SK-05`, and `SK-06` at `state: "MASTERED"` is the gate to unlock Level 3.

---

## 3. Standards Crosswalk (informational)

| Standard | Coverage |
|----------|----------|
| **CCSS.1.G.A.3** (partition into 2 or 4 equal shares; describe as halves) | Primary — halves portion |
| **CCSS.K.G.A.2** (identify shapes regardless of orientation) | Primary — orientation invariance |
| **CCSS.2.G.A.3** (recognize equal shares of identical wholes need not have the same shape) | Primary — set-model halves |
| **CCSS.1.G.A.2** (compose 2D shapes) | Light — recognition includes composed shapes |

Level 2 is also where misconceptions **M2 (whole = circle)**, **M4 (equal means identical)**, and **M7 (position matters)** from `MISCONCEPTIONS_FRAMEWORK.md` are explicitly targeted.

---

## 4. Activities at This Level

Three core activities. A session uses one activity; a full level pass touches all three at least once.

### 4.1 Activity: `identify_half_v2` (mechanic: identify)

**Slug:** `identify_half_v2`
**Mechanic:** identify
**Title:** "Find the Half"
**Levels in app:** L2 only (extends L1's `identify_half` with broader shape pool)

The student sees 3 or 4 shapes side-by-side. Exactly one has 1 of 2 equal parts highlighted (correctly). Others are distractors. Tap the correct one. Distractors deliberately surface misconceptions.

#### Difficulty tiers

| Tier | Distractor strategy | Hint budget |
|------|--------------------|-------------|
| Easy | One option is unpartitioned; one is partitioned but unequal; one is correct | 3 |
| Medium | All options have 2 parts but only one is equal; mix of rectangles and circles | 2 |
| Hard | Mix of shapes (triangle, irregular blob, rotated rectangle); all 2-part; only one equal | 1 |

#### Question template archetype

**Type:** `identify`
**Payload shape:** `{ options: [{ shapeType, partitionLines, highlightedRegions, rotation }, ...3-4 options], targetIndex: number }`
**Correct answer shape:** `number` (index of the correct option)
**Validator:** `validator.identify.exactIndex`

#### Sample templates (3 of 12 needed)

```jsonc
// Easy — half of a rectangle alongside an unpartitioned shape and an unequal split
{
  "id": "q:idhv2:L2:0001",
  "type": "identify",
  "prompt": { "text": "Which one shows one half?", "ttsKey": "tts.idhv2.l2.0001" },
  "payload": {
    "options": [
      { "shapeType": "rectangle", "partitionLines": [], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0.3,0],[0.3,1]]], "highlightedRegions": [0], "rotation": 0 }
    ],
    "targetIndex": 1
  },
  "correctAnswer": 1,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["SK-04"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "easy"
}

// Medium — same fraction (one half) shown across different shape families
{
  "id": "q:idhv2:L2:0006",
  "type": "identify",
  "prompt": { "text": "Which one shows one half?", "ttsKey": "tts.idhv2.l2.0006" },
  "payload": {
    "options": [
      { "shapeType": "circle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "circle", "partitionLines": [[[0.4,0],[0.6,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "triangle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 0 }
    ],
    "targetIndex": 0
  },
  "correctAnswer": 0,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["SK-04"],
  "misconceptionTraps": ["MC-WHB-01"],
  "difficultyTier": "medium"
}

// Hard — same fraction across rotations; misconception trap M7
{
  "id": "q:idhv2:L2:0011",
  "type": "identify",
  "prompt": { "text": "Which one shows one half?", "ttsKey": "tts.idhv2.l2.0011" },
  "payload": {
    "options": [
      { "shapeType": "rectangle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0,0.5],[1,0.5]]], "highlightedRegions": [0], "rotation": 45 },
      { "shapeType": "rectangle", "partitionLines": [[[0.4,0],[0.6,1]]], "highlightedRegions": [0], "rotation": 30 }
    ],
    "targetIndex": 1
  },
  "correctAnswer": 1,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["SK-04", "SK-05"],
  "misconceptionTraps": ["MC-L2-ROT-01"],
  "difficultyTier": "hard"
}
```

**Authoring target for this activity:** 12 templates (4 easy, 5 medium, 3 hard).

---

### 4.2 Activity: `rotated_half` (mechanic: identify)

**Slug:** `rotated_half`
**Mechanic:** identify
**Title:** "Is This Still One Half?"
**Levels in app:** L2 only

A single shape is shown in two orientations (or with two different valid fold directions). The student answers a binary question: **does this still show one half?** Tap green check or red X.

This activity directly targets misconception **M7 (position/orientation matters for fraction identity)** from the misconceptions framework. From the Learning Trajectory: *"They see different-looking halves and conclude they are different fractions. This is a profound misconception requiring explicit attention."*

#### Difficulty tiers

| Tier | Variation | Hint budget |
|------|-----------|-------------|
| Easy | One axis-aligned half + one obviously different orientation, but both valid | 3 |
| Medium | Diagonal vs. vertical halves, both valid | 2 |
| Hard | Mixed valid + invalid orientations; some are unequal | 1 |

#### Question template archetype

**Type:** `equal_or_not`
**Payload shape:** `{ shapeType, partitionLines, rotation, highlightedRegions, comparisonShape: { shapeType, partitionLines, rotation, highlightedRegions } }`
**Correct answer shape:** `boolean` (true = both still show one half)
**Validator:** `validator.equal_or_not.bothShowSameFraction`

#### Sample templates (3 of 10 needed)

```jsonc
// Easy — vertical half compared to horizontal half (both true halves)
{
  "id": "q:rh:L2:0001",
  "type": "equal_or_not",
  "prompt": { "text": "Do BOTH shapes show one half?", "ttsKey": "tts.rh.l2.0001" },
  "payload": {
    "shapeType": "rectangle",
    "partitionLines": [[[0.5,0],[0.5,1]]],
    "rotation": 0,
    "highlightedRegions": [0],
    "comparisonShape": {
      "shapeType": "rectangle",
      "partitionLines": [[[0,0.5],[1,0.5]]],
      "rotation": 0,
      "highlightedRegions": [0]
    }
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["SK-05"],
  "misconceptionTraps": ["MC-L2-ROT-01"],
  "difficultyTier": "easy"
}

// Medium — diagonal half of a square compared to vertical half of a square
{
  "id": "q:rh:L2:0005",
  "type": "equal_or_not",
  "prompt": { "text": "Do BOTH shapes show one half?", "ttsKey": "tts.rh.l2.0005" },
  "payload": {
    "shapeType": "rectangle",
    "partitionLines": [[[0,0],[1,1]]],
    "rotation": 0,
    "highlightedRegions": [0],
    "comparisonShape": {
      "shapeType": "rectangle",
      "partitionLines": [[[0.5,0],[0.5,1]]],
      "rotation": 0,
      "highlightedRegions": [0]
    }
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["SK-05"],
  "misconceptionTraps": ["MC-L2-ROT-01"],
  "difficultyTier": "medium"
}

// Hard — visually similar shapes but second one is unequal (off-center)
{
  "id": "q:rh:L2:0009",
  "type": "equal_or_not",
  "prompt": { "text": "Do BOTH shapes show one half?", "ttsKey": "tts.rh.l2.0009" },
  "payload": {
    "shapeType": "circle",
    "partitionLines": [[[0.5,0],[0.5,1]]],
    "rotation": 30,
    "highlightedRegions": [0],
    "comparisonShape": {
      "shapeType": "circle",
      "partitionLines": [[[0.45,0],[0.55,1]]],
      "rotation": 30,
      "highlightedRegions": [0]
    }
  },
  "correctAnswer": false,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["SK-04", "SK-05"],
  "misconceptionTraps": ["MC-EOL-03"],
  "difficultyTier": "hard"
}
```

**Authoring target for this activity:** 10 templates (3 easy, 4 medium, 3 hard).

---

### 4.3 Activity: `half_of_a_set` (mechanic: identify)

**Slug:** `half_of_a_set`
**Mechanic:** identify
**Title:** "Half of the Group"
**Levels in app:** L2 only

The student sees a set of identical objects (apples, blocks, dots). Some are highlighted (e.g., colored differently). The student answers: **is the highlighted group one half of the whole group?**

This introduces the **set model** of fractions in addition to the area model used in Level 1. From the Pedagogical Philosophy: this is critical because "halves" in real life are often counts, not regions.

Even-count sets only at this level. Odd-count sets (where halving requires fractional objects) are deferred to misconception M8 work in later levels.

#### Difficulty tiers

| Tier | Set size | Distractor strategy | Hint budget |
|------|----------|--------------------|-------------|
| Easy | 4 or 6 objects | Half is highlighted vs. less than half | 3 |
| Medium | 6 or 8 objects | Half vs. more than half (e.g., 5 of 8 highlighted) | 2 |
| Hard | 8, 10, or 12 objects; mixed grouping | Half vs. close-but-wrong (e.g., 5 of 12 highlighted) | 1 |

#### Question template archetype

**Type:** `equal_or_not`
**Payload shape:** `{ setSize: number, highlightedCount: number, layout: "row"|"grid"|"scatter" }`
**Correct answer shape:** `boolean` (true if `highlightedCount === setSize / 2`)
**Validator:** `validator.equal_or_not.setHalf`

#### Sample templates (4 of 10 needed)

```jsonc
// Easy — 4 apples, 2 highlighted: yes, that is half
{
  "id": "q:hos:L2:0001",
  "type": "equal_or_not",
  "prompt": { "text": "Is the red group one half of all the apples?", "ttsKey": "tts.hos.l2.0001" },
  "payload": { "setSize": 4, "highlightedCount": 2, "layout": "row" },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["SK-06"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

// Easy — 6 blocks, 4 highlighted: not half
{
  "id": "q:hos:L2:0002",
  "type": "equal_or_not",
  "prompt": { "text": "Is the red group one half of all the blocks?", "ttsKey": "tts.hos.l2.0002" },
  "payload": { "setSize": 6, "highlightedCount": 4, "layout": "row" },
  "correctAnswer": false,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["SK-06"],
  "misconceptionTraps": ["MC-L2-WNB-01"],
  "difficultyTier": "easy"
}

// Medium — 8 dots in a 2x4 grid, 4 highlighted across both rows
{
  "id": "q:hos:L2:0005",
  "type": "equal_or_not",
  "prompt": { "text": "Is the red group one half of all the dots?", "ttsKey": "tts.hos.l2.0005" },
  "payload": { "setSize": 8, "highlightedCount": 4, "layout": "grid" },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["SK-06"],
  "misconceptionTraps": [],
  "difficultyTier": "medium"
}

// Hard — 10 scattered objects, 5 highlighted; layout makes count harder
{
  "id": "q:hos:L2:0008",
  "type": "equal_or_not",
  "prompt": { "text": "Is the red group one half of all the stars?", "ttsKey": "tts.hos.l2.0008" },
  "payload": { "setSize": 10, "highlightedCount": 5, "layout": "scatter" },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["SK-06"],
  "misconceptionTraps": [],
  "difficultyTier": "hard"
}
```

**Authoring target for this activity:** 10 templates (3 easy, 4 medium, 3 hard).

---

## 5. Misconceptions Detected at This Level

| MC ID | Name | Detection signal |
|-------|------|------------------|
| `MC-L2-ROT-01` | "Rotated halves are not halves" — student rejects valid halves shown at unfamiliar orientations | Wrong answer on `rotated_half` Tier 1-2 with two valid halves at different orientations |
| `MC-L2-SHAPE-01` | "Halves only happen in circles" (M2 from framework) — student picks circle option even when wrong | Pattern of always-circle picks on `identify_half_v2` Medium with mixed shapes |
| `MC-L2-IDENT-01` | "Equal means identical" (M4) — student rejects two pieces that look different in shape but are equal in area | Wrong "no" on `rotated_half` for diagonal-vs-axis halves |
| `MC-L2-WNB-01` | "Whole-number bias on sets" — student picks higher count as "more half" | Wrong "yes" on `half_of_a_set` when `highlightedCount > setSize/2` |
| `MC-EOL-01`, `MC-EOL-03`, `MC-WHB-01` | (re-detected from Level 1) | As described in `level-01.md` §5 |

Detail and intervention activities live in `../misconceptions.md` (TBD; salvage from `RoadMap/02_Level_03_05/misconceptions/MISCONCEPTIONS_FRAMEWORK.md`).

---

## 6. Fraction Pool

Per C8, Level 2 uses **only halves**:

```json
[
  { "id": "frac:1/2", "numerator": 1, "denominator": 2, "decimalValue": 0.5, "benchmark": "half", "denominatorFamily": "halves", "visualAssets": { "barUrl": "...", "circleUrl": "...", "setUrl": "..." } },
  { "id": "frac:2/2", "numerator": 2, "denominator": 2, "decimalValue": 1.0, "benchmark": "one", "denominatorFamily": "halves", "visualAssets": { "barUrl": "...", "circleUrl": "...", "setUrl": "..." } }
]
```

`frac:2/2` is included so the student can encounter "two halves make the whole" framing at Tier 3 hint level. No symbolic `2/2` notation is shown.

Denominators 3+ do not appear at this level (per C8).

---

## 7. Advancement Criteria (Mastery Gate to Level 3)

A student unlocks Level 3 when **all** are true:

- `SkillMastery.state === "MASTERED"` for `SK-04`, `SK-05`, **and** `SK-06`
- `SK-01`, `SK-02`, `SK-03` from Level 1 remain at `"MASTERED"` or `"APPROACHING"` (no decay below)
- At least 18 attempts across at least 2 different activities at Level 2
- Tier 3 (Hard) accuracy ≥ 70% across the last 5 hard attempts (no scaffolding)
- No active `MisconceptionFlag` for `MC-L2-ROT-01` or `MC-L2-IDENT-01` (must be resolved or fewer than 3 observations in last 10 attempts)

The progression engine runs after each session and may recommend `"advance"`, `"stay"`, or `"regress"`. A student showing the rotation misconception is held at Level 2 and routed back to `rotated_half` Easy tier on next session.

---

## 8. Estimated Session Time

Per C9:

- **Single session:** 10–13 minutes (5 problems with hints + 2 unscaffolded check problems)
- **Full level mastery:** 3–5 sessions across 2–3 days

Most students spend 4 sessions at Level 2 — the rotation/orientation work tends to need a second pass even for confident L1 graduates.

---

## 9. Authoring Status

| Item | Required | Authored | Notes |
|------|----------|----------|-------|
| `identify_half_v2` templates | 12 | 3 examples shown | Need 9 more |
| `rotated_half` templates | 10 | 3 examples shown | Need 7 more |
| `half_of_a_set` templates | 10 | 4 examples shown | Need 6 more |
| TTS audio scripts | 32 | 0 | Generate via SpeechSynthesis API at runtime |
| Hint definitions | ~96 (3 per template) | 0 | TBD |
| Validator function specs | 3 (one new: `bothShowSameFraction`, `setHalf`) | High-level only | Need detailed pseudocode in `../../20-mechanic/activity-archetypes.md` |

---

## 10. Open Questions for Level 2

1. **Set-model rendering.** Should highlighted set members differ by **color**, **outline**, or **transparency**? Color is most readable but may bias colorblind students. Recommended: thick outline + color, dual-channel.
2. **Scatter layout for sets.** A scattered (non-grid) layout makes set-counting harder and tests the magnitude concept rather than spatial counting. Should scatter be limited to Tier 3 only, or appear earlier? Recommended: scatter starts Tier 2 with set sizes ≤ 8.
3. **How "obviously different" must rotation distractors be?** A 5° rotation is too subtle to register as orientation variation. Recommended: minimum 30° rotation between compared shapes in `rotated_half`.
4. **Misconception persistence threshold.** Level 1 set the gate at "no active flag." Level 2 has 3 misconception detectors and routing each one to remediation may create session-pacing problems. Recommended: only `MC-L2-ROT-01` and `MC-L2-IDENT-01` block advancement; the others are tracked but non-blocking at this level.
