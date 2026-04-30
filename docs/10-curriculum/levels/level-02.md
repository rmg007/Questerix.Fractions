---
title: Level 2 — Identify Halves
status: active
owner: solo
last_reviewed: 2026-04-30
applies_to: [mvp]
constraint_refs: [C3, C8, C9]
related: [../scope-and-sequence.md, ../skills.md]
---

# Level 2 — Identify Halves

The student's second encounter with fractions. Goal: deepen the "one of two equal parts" schema established in Level 1 and stretch it across **shape variety**, **orientation**, and **set models**.

## 1. Specification

| Field | Value |
|---|---|
| **Mastery objective** | Identifies a half from a set of 4 options including unequal-divided and non-half distractors at ≥ 80% accuracy. |
| **Prerequisite skills** | `KC-HALVES-VIS` (Core halving recognition) |
| **Skills introduced** | `KC-SET-MODEL` (Discrete set models) |
| **Skills reinforced** | `KC-HALVES-VIS` (Broadened to complex shapes and rotations) |
| **Misconceptions targeted** | `MC-EOL-01` (Equal-parts blindness), `MC-EOL-02` (Count-only fraction), `MC-WHB-01` (Whole-number bias) |
| **Representations used** | Area, Set |
| **Out-of-scope at this level** | Symbolic notation (1/2), denominators > 2 |
| **Evidence-of-mastery threshold** | BKT estimate ≥ 0.85 AND first-try accuracy ≥ 70% on last 8 attempts |

---

## 2. Learning Goals (Detailed)

By the end of Level 2, the student can:

- **G2.1** — Identify "one half" of a shape regardless of the shape family (rectangle, circle, square, triangle, irregular blob)
- **G2.2** — Identify "one half" regardless of orientation (vertical fold, horizontal fold, diagonal fold; rotated shapes)
- **G2.3** — Identify "one half" of a **set** of objects (4 of 8, 3 of 6, etc. — set-model halving)
- **G2.4** — Recognize when a shape **looks like** two parts but the parts are unequal (sharper Level-1 discrimination)
- **G2.5** — Use the words **"one half"**, **"halves"**, and **"the whole"** consistently in audio prompts

Per Learning Trajectory: this level corresponds to objectives **D7, F2, F3, F4** (halving across contexts and recognition under perceptual variation).

---

## 3. Skills Tracked

See `../skills.md` for canonical definitions.

| Skill ID | Name | BKT priors |
|---|---|---|
| `KC-HALVES-VIS` | Core Halving Recognition | `pInit=0.20, pTransit=0.25, pSlip=0.10, pGuess=0.30` |
| `KC-SET-MODEL` | Discrete Set Models | `pInit=0.10, pTransit=0.18, pSlip=0.12, pGuess=0.30` |

---

## 4. Standards Crosswalk (informational)

| Standard | Coverage |
|---|---|
| **CCSS.1.G.A.3** (partition into 2 or 4 equal shares; describe as halves) | Primary — halves portion |
| **CCSS.K.G.A.2** (identify shapes regardless of orientation) | Primary — orientation invariance |
| **CCSS.2.G.A.3** (recognize equal shares of identical wholes need not have the same shape) | Primary — set-model halves |
| **CCSS.1.G.A.2** (compose 2D shapes) | Light — recognition includes composed shapes |

---

## 5. Activities at This Level

Three core activities. A session uses one activity; a full level pass touches all three at least once.

### 5.1 Activity: `identify_half_v2` (mechanic: identify)

**Slug:** `identify_half_v2`
**Mechanic:** identify
**Title:** "Find the Half"
**Levels in app:** L2 only (extends L1's `identify_half` with broader shape pool)

The student sees 3 or 4 shapes side-by-side. Exactly one has 1 of 2 equal parts highlighted (correctly). Others are distractors. Tap the correct one. Distractors deliberately surface misconceptions.

#### Difficulty tiers

| Tier | Distractor strategy | Hint budget |
|---|---|---|
| Easy | One option is unpartitioned; one is partitioned but unequal; one is correct | 3 |
| Medium | All options have 2 parts but only one is equal; mix of rectangles and circles | 2 |
| Hard | Mix of shapes (triangle, irregular blob, rotated rectangle); all 2-part; only one equal | 1 |

#### Sample templates (12 of 12 authored)

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
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "easy"
}

// Easy — half of a circle
{
  "id": "q:idhv2:L2:0002",
  "type": "identify",
  "prompt": { "text": "Can you find one half?", "ttsKey": "tts.idhv2.l2.0002" },
  "payload": {
    "options": [
      { "shapeType": "circle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "circle", "partitionLines": [], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "circle", "partitionLines": [[[0.7,0],[0.7,1]]], "highlightedRegions": [0], "rotation": 0 }
    ],
    "targetIndex": 0
  },
  "correctAnswer": 0,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "easy"
}

// Easy — half of a square
{
  "id": "q:idhv2:L2:0003",
  "type": "identify",
  "prompt": { "text": "Which square shows one half?", "ttsKey": "tts.idhv2.l2.0003" },
  "payload": {
    "options": [
      { "shapeType": "square", "partitionLines": [[[0,0],[1,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "square", "partitionLines": [[[0.2,0],[0.2,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "square", "partitionLines": [], "highlightedRegions": [], "rotation": 0 }
    ],
    "targetIndex": 0
  },
  "correctAnswer": 0,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "easy"
}

// Medium — triangle halves (vertical vs unequal)
{
  "id": "q:idhv2:L2:0004",
  "type": "identify",
  "prompt": { "text": "Which triangle is split into halves?", "ttsKey": "tts.idhv2.l2.0004" },
  "payload": {
    "options": [
      { "shapeType": "triangle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "triangle", "partitionLines": [[[0,0.5],[1,0.5]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "triangle", "partitionLines": [[[0.7,0.3],[0.3,0.7]]], "highlightedRegions": [0], "rotation": 0 }
    ],
    "targetIndex": 0
  },
  "correctAnswer": 0,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "medium"
}

// Medium — Mixed shapes, all partitioned
{
  "id": "q:idhv2:L2:0005",
  "type": "identify",
  "prompt": { "text": "Which one shows one half?", "ttsKey": "tts.idhv2.l2.0005" },
  "payload": {
    "options": [
      { "shapeType": "rectangle", "partitionLines": [[[0.3,0],[0.3,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "circle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "square", "partitionLines": [[[0.2,0.8],[0.8,0.2]]], "highlightedRegions": [0], "rotation": 0 }
    ],
    "targetIndex": 1
  },
  "correctAnswer": 1,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "medium"
}

// Medium — same fraction (one half) shown across different shape families
{
  "id": "q:idhv2:L2:0006",
  "type": "identify",
  "prompt": { "text": "Which one shows one half?", "ttsKey": "tts.idhv2.l2.0006" },
  "payload": {
    "options": [
      { "shapeType": "circle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "circle", "partitionLines": [[[0.4,0.1],[0.6,0.9]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "triangle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 0 }
    ],
    "targetIndex": 0
  },
  "correctAnswer": 0,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-WHB-01"],
  "difficultyTier": "medium"
}

// Medium — diagonal half of a rectangle
{
  "id": "q:idhv2:L2:0007",
  "type": "identify",
  "prompt": { "text": "Find the shape that shows one half.", "ttsKey": "tts.idhv2.l2.0007" },
  "payload": {
    "options": [
      { "shapeType": "rectangle", "partitionLines": [[[0,0],[1,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0,0.4],[1,0.6]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0.2,0],[0.8,1]]], "highlightedRegions": [0], "rotation": 0 }
    ],
    "targetIndex": 0
  },
  "correctAnswer": 0,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-IDENT-01"],
  "difficultyTier": "medium"
}

// Medium — irregular blob (curriculum variety stretch)
{
  "id": "q:idhv2:L2:0008",
  "type": "identify",
  "prompt": { "text": "Which one shows one half?", "ttsKey": "tts.idhv2.l2.0008" },
  "payload": {
    "options": [
      { "shapeType": "irregular_blob_1", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "irregular_blob_1", "partitionLines": [[[0.2,0],[0.2,1]]], "highlightedRegions": [0], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0.4,0],[0.4,1]]], "highlightedRegions": [0], "rotation": 0 }
    ],
    "targetIndex": 0
  },
  "correctAnswer": 0,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "medium"
}

// Hard — rotated triangle
{
  "id": "q:idhv2:L2:0009",
  "type": "identify",
  "prompt": { "text": "Which triangle shows one half?", "ttsKey": "tts.idhv2.l2.0009" },
  "payload": {
    "options": [
      { "shapeType": "triangle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 45 },
      { "shapeType": "triangle", "partitionLines": [[[0,0.5],[1,0.5]]], "highlightedRegions": [0], "rotation": 45 },
      { "shapeType": "triangle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 0 }
    ],
    "targetIndex": 0
  },
  "correctAnswer": 0,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-ROT-01"],
  "difficultyTier": "hard"
}

// Hard — rotated rectangle with diagonal vs vertical bait
{
  "id": "q:idhv2:L2:0010",
  "type": "identify",
  "prompt": { "text": "Find the half.", "ttsKey": "tts.idhv2.l2.0010" },
  "payload": {
    "options": [
      { "shapeType": "rectangle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 90 },
      { "shapeType": "rectangle", "partitionLines": [[[0,0],[1,1]]], "highlightedRegions": [0], "rotation": 30 },
      { "shapeType": "rectangle", "partitionLines": [[[0.4,0],[0.6,1]]], "highlightedRegions": [0], "rotation": 30 }
    ],
    "targetIndex": 1
  },
  "correctAnswer": 1,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-ROT-01", "MC-L2-IDENT-01"],
  "difficultyTier": "hard"
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
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-ROT-01"],
  "difficultyTier": "hard"
}

// Hard — Mixed shapes, high rotation
{
  "id": "q:idhv2:L2:0012",
  "type": "identify",
  "prompt": { "text": "Which one shows one half?", "ttsKey": "tts.idhv2.l2.0012" },
  "payload": {
    "options": [
      { "shapeType": "circle", "partitionLines": [[[0,0.5],[1,0.5]]], "highlightedRegions": [0], "rotation": 60 },
      { "shapeType": "triangle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 120 },
      { "shapeType": "rectangle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [0], "rotation": 200 }
    ],
    "targetIndex": 2
  },
  "correctAnswer": 2,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-ROT-01"],
  "difficultyTier": "hard"
}
```

---

### 5.2 Activity: `rotated_half` (mechanic: identify)

**Slug:** `rotated_half`
**Mechanic:** identify
**Title:** "Is This Still One Half?"
**Levels in app:** L2 only

A single shape is shown in two orientations (or with two different valid fold directions). The student answers a binary question: **does this still show one half?** Tap green check or red X.

#### Difficulty tiers

| Tier | Variation | Hint budget |
|---|---|---|
| Easy | One axis-aligned half + one obviously different orientation, but both valid | 3 |
| Medium | Diagonal vs. vertical halves, both valid | 2 |
| Hard | Mixed valid + invalid orientations; some are unequal | 1 |

#### Sample templates (10 of 10 authored)

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
    },
    "correctAnswer": true
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-ROT-01"],
  "difficultyTier": "easy"
}

// Easy — Circle halves, different orientations
{
  "id": "q:rh:L2:0002",
  "type": "equal_or_not",
  "prompt": { "text": "Do both show one half?", "ttsKey": "tts.rh.l2.0002" },
  "payload": {
    "shapeType": "circle",
    "partitionLines": [[[0.5,0],[0.5,1]]],
    "rotation": 0,
    "highlightedRegions": [0],
    "comparisonShape": {
      "shapeType": "circle",
      "partitionLines": [[[0,0.5],[1,0.5]]],
      "rotation": 30,
      "highlightedRegions": [0]
    },
    "correctAnswer": true
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-ROT-01"],
  "difficultyTier": "easy"
}

// Medium — Diagonal vs horizontal rectangle
{
  "id": "q:rh:L2:0003",
  "type": "equal_or_not",
  "prompt": { "text": "Are these both halves?", "ttsKey": "tts.rh.l2.0003" },
  "payload": {
    "shapeType": "rectangle",
    "partitionLines": [[[0,0],[1,1]]],
    "rotation": 0,
    "highlightedRegions": [0],
    "comparisonShape": {
      "shapeType": "rectangle",
      "partitionLines": [[[0,0.5],[1,0.5]]],
      "rotation": 0,
      "highlightedRegions": [0]
    },
    "correctAnswer": true
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-IDENT-01"],
  "difficultyTier": "medium"
}

// Medium — Triangle halves, one rotated
{
  "id": "q:rh:L2:0004",
  "type": "equal_or_not",
  "prompt": { "text": "Are these both one half?", "ttsKey": "tts.rh.l2.0004" },
  "payload": {
    "shapeType": "triangle",
    "partitionLines": [[[0.5,0],[0.5,1]]],
    "rotation": 0,
    "highlightedRegions": [0],
    "comparisonShape": {
      "shapeType": "triangle",
      "partitionLines": [[[0.5,0],[0.5,1]]],
      "rotation": 90,
      "highlightedRegions": [0]
    },
    "correctAnswer": true
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-ROT-01"],
  "difficultyTier": "medium"
}

// Medium — One half vs unequal split
{
  "id": "q:rh:L2:0005",
  "type": "equal_or_not",
  "prompt": { "text": "Do both show one half?", "ttsKey": "tts.rh.l2.0005" },
  "payload": {
    "shapeType": "rectangle",
    "partitionLines": [[[0.5,0],[0.5,1]]],
    "rotation": 0,
    "highlightedRegions": [0],
    "comparisonShape": {
      "shapeType": "rectangle",
      "partitionLines": [[[0.3,0],[0.3,1]]],
      "rotation": 0,
      "highlightedRegions": [0]
    },
    "correctAnswer": false
  },
  "correctAnswer": false,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "medium"
}

// Hard — Rotated valid half vs non-rotated invalid half
{
  "id": "q:rh:L2:0006",
  "type": "equal_or_not",
  "prompt": { "text": "Are these both halves?", "ttsKey": "tts.rh.l2.0006" },
  "payload": {
    "shapeType": "circle",
    "partitionLines": [[[0.5,0],[0.5,1]]],
    "rotation": 135,
    "highlightedRegions": [0],
    "comparisonShape": {
      "shapeType": "circle",
      "partitionLines": [[[0.7,0.3],[0.3,0.7]]],
      "rotation": 0,
      "highlightedRegions": [0]
    },
    "correctAnswer": false
  },
  "correctAnswer": false,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-ROT-01", "MC-EOL-01"],
  "difficultyTier": "hard"
}

// Hard — Diagonal rectangle vs vertical rectangle, different rotations
{
  "id": "q:rh:L2:0007",
  "type": "equal_or_not",
  "prompt": { "text": "Do both show one half?", "ttsKey": "tts.rh.l2.0007" },
  "payload": {
    "shapeType": "rectangle",
    "partitionLines": [[[0,0],[1,1]]],
    "rotation": 45,
    "highlightedRegions": [0],
    "comparisonShape": {
      "shapeType": "rectangle",
      "partitionLines": [[[0.5,0],[0.5,1]]],
      "rotation": -45,
      "highlightedRegions": [0]
    },
    "correctAnswer": true
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-IDENT-01"],
  "difficultyTier": "hard"
}

// Hard — irregular blob rotation invariance
{
  "id": "q:rh:L2:0008",
  "type": "equal_or_not",
  "prompt": { "text": "Are these both one half?", "ttsKey": "tts.rh.l2.0008" },
  "payload": {
    "shapeType": "irregular_blob_2",
    "partitionLines": [[[0.5,0],[0.5,1]]],
    "rotation": 0,
    "highlightedRegions": [0],
    "comparisonShape": {
      "shapeType": "irregular_blob_2",
      "partitionLines": [[[0.5,0],[0.5,1]]],
      "rotation": 180,
      "highlightedRegions": [0]
    },
    "correctAnswer": true
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-ROT-01"],
  "difficultyTier": "hard"
}

// Hard — triangle diagonal split bait
{
  "id": "q:rh:L2:0009",
  "type": "equal_or_not",
  "prompt": { "text": "Are these both halves?", "ttsKey": "tts.rh.l2.0009" },
  "payload": {
    "shapeType": "triangle",
    "partitionLines": [[[0.5,0],[0.5,1]]],
    "rotation": 0,
    "highlightedRegions": [0],
    "comparisonShape": {
      "shapeType": "triangle",
      "partitionLines": [[[0,0.5],[1,0.5]]],
      "rotation": 0,
      "highlightedRegions": [0]
    },
    "correctAnswer": false
  },
  "correctAnswer": false,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "hard"
}

// Hard — high rotation rectangle match
{
  "id": "q:rh:L2:0010",
  "type": "equal_or_not",
  "prompt": { "text": "Do both show one half?", "ttsKey": "tts.rh.l2.0010" },
  "payload": {
    "shapeType": "rectangle",
    "partitionLines": [[[0.5,0],[0.5,1]]],
    "rotation": 15,
    "highlightedRegions": [0],
    "comparisonShape": {
      "shapeType": "rectangle",
      "partitionLines": [[[0,0.5],[1,0.5]]],
      "rotation": 105,
      "highlightedRegions": [0]
    },
    "correctAnswer": true
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.bothShowSameFraction",
  "skillIds": ["KC-HALVES-VIS"],
  "misconceptionTraps": ["MC-L2-ROT-01"],
  "difficultyTier": "hard"
}
```

---

### 5.3 Activity: `half_of_a_set` (mechanic: identify)

**Slug:** `half_of_a_set`
**Mechanic:** identify
**Title:** "Half of the Group"
**Levels in app:** L2 only

The student sees a set of identical objects (apples, blocks, dots). Some are highlighted (e.g., colored differently). The student answers: **is the highlighted group one half of the whole group?**

#### Sample templates (10 of 10 authored)

```jsonc
// Easy — 2 of 4 (half)
{
  "id": "q:hos:L2:0001",
  "type": "equal_or_not",
  "prompt": { "text": "Is half of the group highlighted?", "ttsKey": "tts.hos.l2.0001" },
  "payload": {
    "setSize": 4,
    "highlightedCount": 2,
    "objectType": "apple",
    "layout": "grid"
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["KC-SET-MODEL"],
  "misconceptionTraps": ["MC-L2-WNB-01"],
  "difficultyTier": "easy"
}

// Easy — 1 of 4 (not half)
{
  "id": "q:hos:L2:0002",
  "type": "equal_or_not",
  "prompt": { "text": "Is half of the group colored?", "ttsKey": "tts.hos.l2.0002" },
  "payload": {
    "setSize": 4,
    "highlightedCount": 1,
    "objectType": "star",
    "layout": "grid"
  },
  "correctAnswer": false,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["KC-SET-MODEL"],
  "misconceptionTraps": ["MC-L2-WNB-01"],
  "difficultyTier": "easy"
}

// Medium — 3 of 6 (half)
{
  "id": "q:hos:L2:0003",
  "type": "equal_or_not",
  "prompt": { "text": "Is half of the group highlighted?", "ttsKey": "tts.hos.l2.0003" },
  "payload": {
    "setSize": 6,
    "highlightedCount": 3,
    "objectType": "bear",
    "layout": "scatter"
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["KC-SET-MODEL"],
  "misconceptionTraps": ["MC-L2-WNB-01"],
  "difficultyTier": "medium"
}

// Medium — 4 of 6 (not half)
{
  "id": "q:hos:L2:0004",
  "type": "equal_or_not",
  "prompt": { "text": "Is half of the group colored?", "ttsKey": "tts.hos.l2.0004" },
  "payload": {
    "setSize": 6,
    "highlightedCount": 4,
    "objectType": "bear",
    "layout": "grid"
  },
  "correctAnswer": false,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["KC-SET-MODEL"],
  "misconceptionTraps": ["MC-L2-WNB-01"],
  "difficultyTier": "medium"
}

// Medium — 4 of 8 (half)
{
  "id": "q:hos:L2:0005",
  "type": "equal_or_not",
  "prompt": { "text": "Is half highlighted?", "ttsKey": "tts.hos.l2.0005" },
  "payload": {
    "setSize": 8,
    "highlightedCount": 4,
    "objectType": "block",
    "layout": "scatter"
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["KC-SET-MODEL"],
  "misconceptionTraps": ["MC-L2-WNB-01"],
  "difficultyTier": "medium"
}

// Hard — 5 of 8 (not half)
{
  "id": "q:hos:L2:0006",
  "type": "equal_or_not",
  "prompt": { "text": "Is this half?", "ttsKey": "tts.hos.l2.0006" },
  "payload": {
    "setSize": 8,
    "highlightedCount": 5,
    "objectType": "fish",
    "layout": "scatter"
  },
  "correctAnswer": false,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["KC-SET-MODEL"],
  "misconceptionTraps": ["MC-L2-WNB-01"],
  "difficultyTier": "hard"
}

// Hard — 5 of 10 (half)
{
  "id": "q:hos:L2:0007",
  "type": "equal_or_not",
  "prompt": { "text": "Is half of the fish group colored?", "ttsKey": "tts.hos.l2.0007" },
  "payload": {
    "setSize": 10,
    "highlightedCount": 5,
    "objectType": "fish",
    "layout": "scatter"
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["KC-SET-MODEL"],
  "misconceptionTraps": ["MC-L2-WNB-01"],
  "difficultyTier": "hard"
}

// Hard — 6 of 10 (not half)
{
  "id": "q:hos:L2:0008",
  "type": "equal_or_not",
  "prompt": { "text": "Is this one half?", "ttsKey": "tts.hos.l2.0008" },
  "payload": {
    "setSize": 10,
    "highlightedCount": 6,
    "objectType": "block",
    "layout": "scatter"
  },
  "correctAnswer": false,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["KC-SET-MODEL"],
  "misconceptionTraps": ["MC-L2-WNB-01"],
  "difficultyTier": "hard"
}

// Hard — 6 of 12 (half)
{
  "id": "q:hos:L2:0009",
  "type": "equal_or_not",
  "prompt": { "text": "Is half of the group highlighted?", "ttsKey": "tts.hos.l2.0009" },
  "payload": {
    "setSize": 12,
    "highlightedCount": 6,
    "objectType": "apple",
    "layout": "scatter"
  },
  "correctAnswer": true,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["KC-SET-MODEL"],
  "misconceptionTraps": ["MC-L2-WNB-01"],
  "difficultyTier": "hard"
}

// Hard — 5 of 12 (close bait)
{
  "id": "q:hos:L2:0010",
  "type": "equal_or_not",
  "prompt": { "text": "Is this one half?", "ttsKey": "tts.hos.l2.0010" },
  "payload": {
    "setSize": 12,
    "highlightedCount": 5,
    "objectType": "star",
    "layout": "scatter"
  },
  "correctAnswer": false,
  "validatorId": "validator.equal_or_not.setHalf",
  "skillIds": ["KC-SET-MODEL"],
  "misconceptionTraps": ["MC-L2-WNB-01"],
  "difficultyTier": "hard"
}
```

---

## 6. Misconceptions Detected at This Level

| MC ID | Name | Detection signal |
|---|---|---|
| `MC-L2-ROT-01` | "Rotated halves are not halves" | Wrong answer on `rotated_half` Tier 1-2 with two valid halves |
| `MC-L2-SHAPE-01` | "Halves only happen in circles" | Pattern of always-circle picks on `identify_half_v2` Medium |
| `MC-L2-IDENT-01` | "Equal means identical" | Wrong "no" on `rotated_half` for diagonal-vs-axis halves |
| `MC-L2-WNB-01` | "Whole-number bias on sets" | Wrong "yes" on `half_of_a_set` when `highlightedCount > setSize/2` |

---

## 7. Fraction Pool

Level 2 uses **only halves**: `frac:1/2` and `frac:2/2` (for "whole" concepts).

---

## 8. Advancement Criteria (Mastery Gate to Level 3)

A student unlocks Level 3 when **all** are true:

- `SkillMastery.state === "MASTERED"` for `KC-HALVES-VIS` and `KC-SET-MODEL`
- At least 18 attempts across at least 2 different activities
- Tier 3 (Hard) accuracy ≥ 70% across the last 5 hard attempts
- No active `MisconceptionFlag` for `MC-L2-ROT-01` or `MC-L2-IDENT-01`

---

## 9. Authoring Status

| Item | Required | Authored | Notes |
|---|---|---|---|
| `identify_half_v2` templates | 12 | 3 | Need 9 more |
| `rotated_half` templates | 10 | 1 | Need 9 more |
| `half_of_a_set` templates | 10 | 0 | Need 10 more |
| TTS audio scripts | 32 | 0 | Runtime generation |
| Validator functions | 2 | 0 | `bothShowSameFraction`, `setHalf` |

---

## 10. Open Questions for Level 2

1. **Set-model rendering.** Recommended: thick outline + color, dual-channel.
2. **Scatter layout for sets.** Recommended: scatter starts Tier 2 with set sizes ≤ 8.
3. **Rotation distractors.** Recommended: minimum 30° rotation between compared shapes.
4. **Misconception persistence.** Recommended: only `MC-L2-ROT-01` and `MC-L2-IDENT-01` block advancement.
