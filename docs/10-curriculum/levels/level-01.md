---
title: Level 1 — Halves and Equal Parts
status: active
owner: solo
last_reviewed: 2026-04-30
applies_to: [mvp]
constraint_refs: [C3, C8, C9]
related: [../scope-and-sequence.md, ../../30-architecture/data-schema.md]
---

# Level 1 — Halves and Equal Parts

The student's first encounter with fractions. Goal: build the schema "**equal parts** of a whole."

## 1. Specification

| Field | Value |
|---|---|
| **Mastery objective** | Divides a regular shape into two equal parts (area or count) within 8% tolerance on first try ≥ 70%; recognizes equal-parts language. |
| **Prerequisite skills** | None |
| **Skills introduced** | `KC-HALVES-VIS` (Recognize equal partitioning, Identify halves visually, Use word "half") |
| **Skills reinforced** | None |
| **Misconceptions targeted** | `MC-EOL-01` (Equal-parts blindness), `MC-EOL-02` (Count-only fraction) |
| **Representations used** | Area, Set |
| **Out-of-scope at this level** | Symbolic notation (1/2), denominators > 2 |
| **Evidence-of-mastery threshold** | BKT estimate ≥ 0.85 AND first-try accuracy ≥ 70% on last 8 attempts |

---

## 2. Learning Goals (Detailed)

By the end of Level 1, the student can:

- **G1.1** — Visually distinguish equal parts from unequal parts in a partitioned shape
- **G1.2** — Identify a shape that has been split into exactly 2 equal parts
- **G1.3** — Identify "one half" of a shape (the highlighted equal part)
- **G1.4** — Use the words **"half"** and **"whole"** in context (audio + visual)

Symbolic notation `1/2` is **not introduced at this level**. Symbols arrive at Level 6.

---

## 3. Skills Tracked

See `../skills.md` for canonical definitions.

| Skill ID | Name | BKT priors |
|---|---|---|
| `KC-HALVES-VIS` | Core Halving Recognition | `pInit=0.15, pTransit=0.25, pSlip=0.10, pGuess=0.30` |


---

## 3. Standards Crosswalk (informational)

| Standard                                                                                   | Coverage                     |
| ------------------------------------------------------------------------------------------ | ---------------------------- |
| **CCSS.K.G.A.2** (identify shapes regardless of orientation)                               | Touched (rotated rectangles) |
| **CCSS.1.G.A.3** (partition into 2 or 4 equal shares; describe as halves and fourths)      | Primary                      |
| **CCSS.2.G.A.3** (recognize equal shares of identical wholes need not have the same shape) | Light extension at Tier 3    |

---

## 4. Activities at This Level

Three core activities. A session uses one activity; a full level pass touches all three at least once.

### 4.1 Activity: `equal_or_not` (mechanic: identify-equal)

**Slug:** `equal_or_not`
**Mechanic:** identify
**Title:** "Are These Parts Equal?"
**Levels in app:** L1 only

The student sees a partitioned shape and answers a binary question: _Are the parts equal in size?_ Tap the green check or red X.

#### Difficulty tiers

| Tier   | Scaffolding                    | Visual    | Hint budget |
| ------ | ------------------------------ | --------- | ----------- |
| Easy   | Highlight grid lines           | Always-on | 3           |
| Medium | No grid                        | Always-on | 2           |
| Hard   | No grid, rotated/skewed shapes | Always-on | 1           |

#### Question template archetype

**Type:** `equal_or_not`
**Payload shape:** `{ shapeType: "rectangle"|"circle", partitionLines: number[][], rotation: number }`
**Correct answer shape:** `boolean` (true if all partitions have area within ±2% of each other)
**Validator:** `validator.equal_or_not.areaTolerance`

#### Sample templates (4 of 12 needed)

```jsonc
// Easy — clearly equal halves of a rectangle
{
  "id": "q:eon:L1:0001",
  "type": "equal_or_not",
  "prompt": { "text": "Are these parts equal?", "ttsKey": "tts.eon.l1.0001" },
  "payload": {
    "shapeType": "rectangle",
    "partitionLines": [[[0.5, 0], [0.5, 1]]],
    "rotation": 0
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.areaTolerance",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

// Easy — clearly unequal halves of a rectangle
{
  "id": "q:eon:L1:0002",
  "type": "equal_or_not",
  "prompt": { "text": "Are these parts equal?", "ttsKey": "tts.eon.l1.0002" },
  "payload": {
    "shapeType": "rectangle",
    "partitionLines": [[[0.3, 0], [0.3, 1]]],
    "rotation": 0
  },
  "correctAnswer": false,
  "validatorId": "validator.equal_or_not.areaTolerance",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "easy"
}

// Medium — circle split into 2, slightly off
{
  "id": "q:eon:L1:0005",
  "type": "equal_or_not",
  "prompt": { "text": "Are these parts equal?", "ttsKey": "tts.eon.l1.0005" },
  "payload": {
    "shapeType": "circle",
    "partitionLines": [[[0.5, 0], [0.5, 1]]],
    "rotation": 15
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.areaTolerance",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-EOL-02"],
  "difficultyTier": "medium"
}

// Hard — rectangle split by a curved/skewed line that visually fools you
{
  "id": "q:eon:L1:0010",
  "type": "equal_or_not",
  "prompt": { "text": "Are these parts equal?", "ttsKey": "tts.eon.l1.0010" },
  "payload": {
    "shapeType": "rectangle",
    "partitionLines": [[[0.45, 0], [0.55, 1]]],
    "rotation": 0
  },
  "correctAnswer": false,
  "validatorId": "validator.equal_or_not.areaTolerance",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-EOL-03"],
  "difficultyTier": "hard"
}
```

**Authoring target for this activity:** 12 templates (4 easy, 5 medium, 3 hard).

---

### 4.2 Activity: `identify_half` (mechanic: identify)

**Slug:** `identify_half`
**Mechanic:** identify
**Title:** "Find One Half"
**Levels in app:** L1, L2 (continued practice)

The student sees 3 shapes side by side. One has 1/2 highlighted (correctly: one of two equal parts). The others are distractors. Tap the correct one.

#### Difficulty tiers

| Tier   | Distractor strategy                                                | Hint budget |
| ------ | ------------------------------------------------------------------ | ----------- |
| Easy   | One option is unpartitioned, one is partitioned but not into 2     | 3           |
| Medium | All options partitioned into 2, but only one has equal parts       | 2           |
| Hard   | All options have 2 equal parts but only one has 1 of 2 highlighted | 1           |

#### Question template archetype

**Type:** `identify`
**Payload shape:** `{ options: [{ shapeType, partitionLines, highlightedRegions }, ...3 options], targetIndex: number }`
**Correct answer shape:** `number` (the index of the correct option)
**Validator:** `validator.identify.exactIndex`

#### Sample templates (3 of 12 needed)

```jsonc
{
  "id": "q:idh:L1:0001",
  "type": "identify",
  "prompt": { "text": "Which one shows one half?", "ttsKey": "tts.idh.l1.0001" },
  "payload": {
    "options": [
      { "shapeType": "rectangle", "partitionLines": [], "highlightedRegions": [] },
      {
        "shapeType": "rectangle",
        "partitionLines": [
          [
            [0.5, 0],
            [0.5, 1],
          ],
        ],
        "highlightedRegions": [0],
      },
      {
        "shapeType": "rectangle",
        "partitionLines": [
          [
            [0.33, 0],
            [0.33, 1],
          ],
          [
            [0.66, 0],
            [0.66, 1],
          ],
        ],
        "highlightedRegions": [0],
      },
    ],
    "targetIndex": 1,
  },
  "correctAnswer": 1,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-WHB-01"],
  "difficultyTier": "easy",
}
```

**Authoring target:** 12 templates (4 easy, 5 medium, 3 hard).

---

### 4.3 Activity: `partition_halves` (mechanic: partition)

**Slug:** `partition_halves`
**Mechanic:** make
**Title:** "Cut It in Half"
**Levels in app:** L1, L4 (revisited with more shape variety)

The student sees a whole shape and drags a line across it to split it into 2 equal parts. The validator checks the resulting partition's areas.

#### Difficulty tiers

| Tier   | Shape                                | Drag affordance                                   | Tolerance | Hint budget |
| ------ | ------------------------------------ | ------------------------------------------------- | --------- | ----------- |
| Easy   | Rectangle, axis-aligned              | Drag-to-snap to vertical or horizontal centerline | ±5% area  | 3           |
| Medium | Rectangle, axis-aligned              | Free drag, no snap                                | ±5% area  | 2           |
| Hard   | Circle, rotated rectangle, irregular | Free drag, no snap                                | ±3% area  | 1           |

#### Question template archetype

**Type:** `partition`
**Payload shape:** `{ shapeType, targetPartitions: 2, snapMode: "axis"|"free", areaTolerance: number }`
**Correct answer shape:** none (validator computes from drawn line)
**Validator:** `validator.partition.equalAreas`

#### Sample templates (2 of 12 needed)

```jsonc
{
  "id": "q:ph:L1:0001",
  "type": "partition",
  "prompt": { "text": "Cut this shape into two equal parts.", "ttsKey": "tts.ph.l1.0001" },
  "payload": {
    "shapeType": "rectangle",
    "targetPartitions": 2,
    "snapMode": "axis",
    "areaTolerance": 0.05
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.equalAreas",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

{
  "id": "q:ph:L1:0008",
  "type": "partition",
  "prompt": { "text": "Cut this circle into two equal parts.", "ttsKey": "tts.ph.l1.0008" },
  "payload": {
    "shapeType": "circle",
    "targetPartitions": 2,
    "snapMode": "free",
    "areaTolerance": 0.03
  },
  "correctAnswer": null,
  "validatorId": "validator.partition.equalAreas",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": [],
  "difficultyTier": "hard"
}
```

**Authoring target:** 12 templates (4 easy, 5 medium, 3 hard).

---

## 5. Misconceptions Detected at This Level

| MC ID       | Name                                                                                          | Detection signal                                                       |
| ----------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `MC-EOL-01` | "More pieces = bigger" — student says unequal partition is equal because there are more lines | Wrong "yes" on `equal_or_not` Tier 1 cases with skewed partition       |
| `MC-EOL-02` | "Rotated halves are unequal" — student says rotated 50/50 is unequal                          | Wrong "no" on `equal_or_not` Tier 2 with non-zero rotation             |
| `MC-EOL-03` | "Visual symmetry = equality" — student misjudges curved partitions                            | Wrong on Tier 3 curved/skewed cases                                    |
| `MC-WHB-01` | "Whole-number bias" — student picks shape with most highlighted regions, ignoring count       | Wrong on `identify_half` distractors with multiple highlighted regions |

Detail and intervention activities live in `../misconceptions.md` (TBD; salvage from `RoadMap/02_Level_03_05/misconceptions/MISCONCEPTIONS_FRAMEWORK.md`).

---

## 6. Fraction Pool

Level 1 uses only one fraction record:

```json
{
  "id": "frac:1/2",
  "numerator": 1,
  "denominator": 2,
  "decimalValue": 0.5,
  "benchmark": "half",
  "denominatorFamily": "halves",
  "visualAssets": { "barUrl": "...", "circleUrl": "...", "setUrl": "..." }
}
```

Per C8, denominators 3+ do not appear at this level.

---

## 7. Advancement Criteria (Mastery Gate to Level 2)

A student unlocks Level 2 when **all** are true:

- `SkillMastery.state === "MASTERED"` for `KC-HALVES-VIS`
- At least 12 attempts across at least 2 different activities
- Tier 3 (Hard) accuracy ≥ 70% across the last 5 hard attempts (no scaffolding)

The progression engine runs after each session and may recommend `"advance"`, `"stay"`, or `"regress"`. The student is auto-promoted on `"advance"` and prompted to repeat on `"stay"`. Regression to Level 0 (orientation) is rare and only triggered after sustained struggle.

---

## 8. Estimated Session Time

Per C9:

- **Single session:** 10–13 minutes (5 problems with hints + 2 unscaffolded check problems)
- **Full level mastery:** 3–5 sessions across 2–3 days

---

## 9. Authoring Status

| Item                         | Required              | Authored         | Notes                                                                                    |
| ---------------------------- | --------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `equal_or_not` templates     | 12                    | 4 examples shown | Need 8 more                                                                              |
| `identify_half` templates    | 12                    | 1 example shown  | Need 11 more                                                                             |
| `partition_halves` templates | 12                    | 2 examples shown | Need 10 more                                                                             |
| TTS audio scripts            | 36                    | 0                | Generate from prompt.text via SpeechSynthesis API at runtime (per scope-and-sequence §7) |
| Hint definitions             | ~108 (3 per template) | 0                | TBD                                                                                      |
| Validator function specs     | 3                     | High-level only  | Need detailed pseudocode in `../../20-mechanic/activity-archetypes.md`                   |

---

## 10. Open Questions for Level 1

1. **Visual partition rendering.** Should partition lines render with a small "joint dot" at intersections (Montessori convention) or as plain lines? Affects 0 mechanics but changes the aesthetic significantly.
2. **Audio replay.** Should the prompt audio be replayable on tap of a speaker icon, or auto-replay if no answer in 10s? Recommended: tappable replay only, no auto-replay (avoid interrupting child's thinking).
3. **First-launch onboarding.** Does Level 1 itself include a 30-second tutorial of the drag-and-tap mechanic, or do we ship a pre-Level-1 mini-onboarding scene? Recommended: pre-Level-1 scene, kept under 60 seconds, skippable on second launch.
4. **Adult helper UI.** Some 5-year-olds will sit with a parent. Do we surface anything for the parent (e.g., a "today's progress" mini-summary at session end)? Per C2 we don't build a parent surface, but a single in-session screen the parent can see incidentally is not "a teacher feature."
