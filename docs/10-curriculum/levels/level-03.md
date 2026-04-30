---
title: Level 3 — Identify Thirds and Fourths
status: active
owner: solo
last_reviewed: 2026-04-30
applies_to: [mvp]
constraint_refs: [C3, C8, C9]
related:
  [./level-02.md, ./level-04.md, ../scope-and-sequence.md, ../../30-architecture/data-schema.md]
---

# Level 3 — Identify Thirds and Fourths

The student's **first encounter with denominators other than 2**. Level 3 introduces **thirds** and **fourths** as new denominator families, building directly on the halves schema from Levels 1–2.

Per C8, Level 3 is the entry point for non-halves denominators. The scope-and-sequence calls this cluster **"Identify thirds and fourths"** with ~14 topics. The pedagogical move follows the Learning Trajectory's compositional framing:

> _A fourth is one of four equal parts. It's also half of a half._

We honor this by presenting fourths as a continuation of the halving schema (compositional) while introducing thirds as a **new family with its own logic** (three equal parts cannot be reached by halving alone).

Per the Learning Trajectory, **symbolic notation is still not introduced**. Students hear and see the words "one third", "thirds", "one fourth", "fourths", and "one quarter" (synonym).

## 1. Specification

| Field | Value |
|---|---|
| **Mastery objective** | Identifies thirds and fourths in equal-vs-unequal divisions; recognizes that "equal parts" is the necessary condition. |
| **Prerequisite skills** | `KC-HALVES-VIS` (Core Halving Recognition) |
| **Skills introduced** | `KC-UNITS-VIS` (Unit Fraction Recognition: 1/3, 1/4) |
| **Skills reinforced** | `KC-HALVES-VIS`, `KC-SET-MODEL` |
| **Misconceptions targeted** | `MC-EOL-01` (Equal-parts blindness), `MC-EOL-02` (Count-only fraction) |
| **Representations used** | Area, Set |
| **Out-of-scope at this level** | Symbolic notation (1/3, 1/4), partition production (L5) |
| **Evidence-of-mastery threshold** | BKT estimate ≥ 0.85 AND first-try accuracy ≥ 70% on last 8 attempts |

---

## 2. Learning Goals (Detailed)

By the end of Level 3, the student can:

- **G3.1** — Identify a shape that has been split into exactly **3 equal parts** ("thirds")
- **G3.2** — Identify a shape that has been split into exactly **4 equal parts** ("fourths" / "quarters")
- **G3.3** — Recognize "one third" of a shape (one of the three highlighted equal parts)
- **G3.4** — Recognize "one fourth" / "one quarter" of a shape
- **G3.5** — Distinguish thirds from fourths in side-by-side comparisons
- **G3.6** — Use the words **"one third"**, **"thirds"**, **"one fourth"**, **"one quarter"**, **"fourths"**, **"quarters"** consistently

This level explicitly heads off misconception **M5 (more pieces = bigger fraction)** from the framework: from the trajectory, _"When you share with MORE friends, each friend gets LESS."_ Some Tier 3 questions deliberately surface this trap.

Per C8 the level **does NOT mix denominators within a single question's correct answer** — but distractors at Tier 2-3 use other denominators to test discrimination. A `frac:1/3` question may have a `frac:1/4` distractor. This is identification, not comparison; comparison is Level 6+.

---

## 2. Skills Tracked

Skill IDs are consolidated per D-023. See `../skills.md` for canonical definitions.

| Skill ID | Name | BKT priors |
| -------- | ---- | ---------- |
| `KC-UNITS-VIS` | Unit Fraction Recognition (1/3, 1/4) | `pInit=0.10, pTransit=0.18, pSlip=0.10, pGuess=0.25` |

> [!NOTE]
> `KC-UNITS-VIS` consolidates legacy skills SK-07, SK-08, SK-09, and SK-10. This ensures higher data density for BKT convergence while maintaining focus on the transition from halves to other unit fractions.

Mastery of `KC-UNITS-VIS` is required to unlock Level 4.

---

## 3. Standards Crosswalk (informational)

| Standard                                                                                       | Coverage                                          |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **CCSS.1.G.A.3** (partition into 2 or 4 equal shares; describe as halves, fourths, quarters)   | Primary — fourths portion                         |
| **CCSS.2.G.A.3** (partition into 2, 3, or 4 equal shares; describe as halves, thirds, fourths) | Primary — adds thirds, exceeding Grade 1 standard |
| **CCSS.K.G.A.2** (identify shapes regardless of orientation)                                   | Light — re-applied to thirds/fourths              |

Note: CCSS 1.G.A.3 does **not** include thirds. Our scope-and-sequence (and the Learning Trajectory's "intentional rigor beyond the standard") includes thirds at this level for two reasons:

1. The MVP serves K–2 broadly; Grade 2 students benefit from thirds early.
2. Thirds prevent over-reliance on the halving schema and prepare students for Level 6+ comparison work.

---

## 4. Activities at This Level

Three core activities. All three address both thirds and fourths.

### 4.1 Activity: `identify_thirds` (mechanic: identify)

**Slug:** `identify_thirds`
**Mechanic:** identify
**Title:** "Find the Thirds"
**Levels in app:** L3 only

The student sees 3 or 4 shapes. Exactly one is correctly partitioned into 3 equal parts (or has 1 of 3 equal parts highlighted, depending on the prompt). Distractors include halves, fourths, and unequal-thirds.

#### Difficulty tiers

| Tier   | Distractor strategy                                               | Hint budget |
| ------ | ----------------------------------------------------------------- | ----------- |
| Easy   | One option is unpartitioned; others are clearly thirds vs. halves | 3           |
| Medium | All options have 3 parts but only one has equal thirds            | 2           |
| Hard   | Mix of thirds and fourths; correct one is thirds                  | 1           |

#### Question template archetype

**Type:** `identify`
**Payload shape:** `{ options: [{ shapeType, partitionLines, highlightedRegions, rotation }, ...3-4 options], targetIndex: number, targetFraction: "1/3" }`
**Correct answer shape:** `number` (index)
**Validator:** `validator.identify.exactIndex`

#### Sample templates (3 of 14 needed)

```jsonc
// Easy — clearly equal thirds vs unpartitioned vs halves
{
  "id": "q:idt:L3:0001",
  "type": "identify",
  "prompt": { "text": "Which shape is split into thirds?", "ttsKey": "tts.idt.l3.0001" },
  "payload": {
    "options": [
      { "shapeType": "rectangle", "partitionLines": [], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0.333,0],[0.333,1]],[[0.667,0],[0.667,1]]], "highlightedRegions": [], "rotation": 0 }
    ],
    "targetIndex": 2,
    "targetFraction": "1/3"
  },
  "correctAnswer": 2,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-UNITS-VIS"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

// Medium — three options, all show 3 parts, only one has equal thirds
{
  "id": "q:idt:L3:0006",
  "type": "identify",
  "prompt": { "text": "Which shape shows EQUAL thirds?", "ttsKey": "tts.idt.l3.0006" },
  "payload": {
    "options": [
      { "shapeType": "rectangle", "partitionLines": [[[0.25,0],[0.25,1]],[[0.5,0],[0.5,1]]], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0.333,0],[0.333,1]],[[0.667,0],[0.667,1]]], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0.4,0],[0.4,1]],[[0.7,0],[0.7,1]]], "highlightedRegions": [], "rotation": 0 }
    ],
    "targetIndex": 1,
    "targetFraction": "1/3"
  },
  "correctAnswer": 1,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-UNITS-VIS"],
  "misconceptionTraps": ["MC-EOL-01"],
  "difficultyTier": "medium"
}

// Hard — discriminate thirds from fourths (M5 trap)
{
  "id": "q:idt:L3:0012",
  "type": "identify",
  "prompt": { "text": "Which shape is split into thirds?", "ttsKey": "tts.idt.l3.0012" },
  "payload": {
    "options": [
      { "shapeType": "circle", "partitionLines": [[[0.5,0],[0.5,1]],[[0.25,0.5],[0.75,0.5]]], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "circle", "partitionLines": [[[0.5,0],[0.5,0.5]],[[0.5,0.5],[1,0.5]],[[0.5,0.5],[0,0.5]]], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "circle", "partitionLines": [[[0.5,0],[0.5,1]],[[0,0.5],[1,0.5]]], "highlightedRegions": [], "rotation": 0 }
    ],
    "targetIndex": 1,
    "targetFraction": "1/3"
  },
  "correctAnswer": 1,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-UNITS-VIS"],
  "misconceptionTraps": ["MC-L3-PARTCOUNT-01"],
  "difficultyTier": "hard"
}
```

**Authoring target for this activity:** 14 templates (5 easy, 6 medium, 3 hard).

---

### 4.2 Activity: `identify_fourths` (mechanic: identify)

**Slug:** `identify_fourths`
**Mechanic:** identify
**Title:** "Find the Fourths"
**Levels in app:** L3, L5 (revisited with mixed denominators)

Mirrors `identify_thirds` but for fourths. Distractors include halves, thirds, and unequal-fourths. The audio prompt randomly varies between **"fourths"** and **"quarters"** to teach the synonymy explicitly (counters misconception **M10** from the framework).

#### Difficulty tiers

| Tier   | Distractor strategy                                                                         | Hint budget |
| ------ | ------------------------------------------------------------------------------------------- | ----------- |
| Easy   | Clearly fourths vs. unpartitioned vs. halves                                                | 3           |
| Medium | All 4-part, but only one with equal fourths; varied fold patterns (perpendicular, diagonal) | 2           |
| Hard   | Mix with thirds and fourths; alternating "fourths"/"quarters" wording                       | 1           |

#### Question template archetype

**Type:** `identify`
**Payload shape:** `{ options: [...3-4 options], targetIndex: number, targetFraction: "1/4", promptVariant: "fourths"|"quarters" }`
**Correct answer shape:** `number`
**Validator:** `validator.identify.exactIndex`

#### Sample templates (3 of 14 needed)

```jsonc
// Easy — fourths via two perpendicular folds vs distractors
{
  "id": "q:idf:L3:0001",
  "type": "identify",
  "prompt": { "text": "Which shape is split into fourths?", "ttsKey": "tts.idf.l3.0001" },
  "payload": {
    "options": [
      { "shapeType": "rectangle", "partitionLines": [[[0.5,0],[0.5,1]]], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0.5,0],[0.5,1]],[[0,0.5],[1,0.5]]], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0.333,0],[0.333,1]],[[0.667,0],[0.667,1]]], "highlightedRegions": [], "rotation": 0 }
    ],
    "targetIndex": 1,
    "targetFraction": "1/4",
    "promptVariant": "fourths"
  },
  "correctAnswer": 1,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-UNITS-VIS"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

// Medium — same prompt uses synonym "quarters"; tests M10
{
  "id": "q:idf:L3:0007",
  "type": "identify",
  "prompt": { "text": "Which shape is split into quarters?", "ttsKey": "tts.idf.l3.0007" },
  "payload": {
    "options": [
      { "shapeType": "circle", "partitionLines": [[[0.5,0],[0.5,1]],[[0,0.5],[1,0.5]]], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "circle", "partitionLines": [[[0.5,0],[0.5,1]],[[0,0.5],[1,0.5]]], "highlightedRegions": [], "rotation": 45 },
      { "shapeType": "circle", "partitionLines": [[[0.4,0],[0.4,1]],[[0.6,0],[0.6,1]],[[0.8,0],[0.8,1]]], "highlightedRegions": [], "rotation": 0 }
    ],
    "targetIndex": 0,
    "targetFraction": "1/4",
    "promptVariant": "quarters"
  },
  "correctAnswer": 0,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-UNITS-VIS"],
  "misconceptionTraps": ["MC-L3-QTR-01"],
  "difficultyTier": "medium"
}

// Hard — discriminate fourths from thirds; M5 trap
{
  "id": "q:idf:L3:0013",
  "type": "identify",
  "prompt": { "text": "Which shape is split into fourths?", "ttsKey": "tts.idf.l3.0013" },
  "payload": {
    "options": [
      { "shapeType": "rectangle", "partitionLines": [[[0.333,0],[0.333,1]],[[0.667,0],[0.667,1]]], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0.25,0],[0.25,1]],[[0.5,0],[0.5,1]],[[0.75,0],[0.75,1]]], "highlightedRegions": [], "rotation": 0 },
      { "shapeType": "rectangle", "partitionLines": [[[0.2,0],[0.2,1]],[[0.5,0],[0.5,1]],[[0.7,0],[0.7,1]]], "highlightedRegions": [], "rotation": 0 }
    ],
    "targetIndex": 1,
    "targetFraction": "1/4",
    "promptVariant": "fourths"
  },
  "correctAnswer": 1,
  "validatorId": "validator.identify.exactIndex",
  "skillIds": ["KC-UNITS-VIS"],
  "misconceptionTraps": ["MC-L3-PARTCOUNT-01"],
  "difficultyTier": "hard"
}
```

**Authoring target for this activity:** 14 templates (5 easy, 6 medium, 3 hard).

---

### 4.3 Activity: `name_the_fraction` (mechanic: label)

**Slug:** `name_the_fraction`
**Mechanic:** label
**Title:** "What Fraction Is This?"
**Levels in app:** L3 only (extends to L5 mixed pool)

The student sees one shape with a single equal part highlighted (or one of N parts highlighted). Three word labels appear: **"one half"**, **"one third"**, **"one fourth"** (sometimes including **"one quarter"** as a synonym for "one fourth"). The student drags the correct label onto the shape.

This is the **vocabulary commitment** activity — it forces the student to pair a visual representation with a name. Aligns with Activity 08 (Equal Detectives) salvaged content from `RoadMap/02_Level_03_05/activities/08_Equal_Detectives.md`.

#### Difficulty tiers

| Tier   | Variation                                                         | Hint budget |
| ------ | ----------------------------------------------------------------- | ----------- |
| Easy   | Distractors are very different (one half vs. one fourth)          | 3           |
| Medium | All three labels available; correct is one third or one fourth    | 2           |
| Hard   | "Quarter" appears as a fourth label option; rotated/varied shapes | 1           |

#### Question template archetype

**Type:** `snap_match`
**Payload shape:** `{ shapeType, partitionLines, highlightedRegions, rotation, labelOptions: string[], correctLabelIndex: number }`
**Correct answer shape:** `number` (index of the chosen label)
**Validator:** `validator.snap_match.labelMatch`

#### Sample templates (4 of 12 needed)

```jsonc
// Easy — clearly one fourth highlighted; labels include one half (distractor)
{
  "id": "q:ntf:L3:0001",
  "type": "snap_match",
  "prompt": { "text": "Drag the right name onto this shape.", "ttsKey": "tts.ntf.l3.0001" },
  "payload": {
    "shapeType": "rectangle",
    "partitionLines": [[[0.5,0],[0.5,1]],[[0,0.5],[1,0.5]]],
    "highlightedRegions": [0],
    "rotation": 0,
    "labelOptions": ["one half", "one fourth", "one third"],
    "correctLabelIndex": 1
  },
  "correctAnswer": 1,
  "validatorId": "validator.snap_match.labelMatch",
  "skillIds": ["KC-UNITS-VIS"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

// Easy — one third highlighted
{
  "id": "q:ntf:L3:0002",
  "type": "snap_match",
  "prompt": { "text": "Drag the right name onto this shape.", "ttsKey": "tts.ntf.l3.0002" },
  "payload": {
    "shapeType": "rectangle",
    "partitionLines": [[[0.333,0],[0.333,1]],[[0.667,0],[0.667,1]]],
    "highlightedRegions": [0],
    "rotation": 0,
    "labelOptions": ["one half", "one fourth", "one third"],
    "correctLabelIndex": 2
  },
  "correctAnswer": 2,
  "validatorId": "validator.snap_match.labelMatch",
  "skillIds": ["KC-UNITS-VIS"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

// Medium — circle with diagonal partitions into thirds (visually unfamiliar)
{
  "id": "q:ntf:L3:0006",
  "type": "snap_match",
  "prompt": { "text": "Drag the right name onto this shape.", "ttsKey": "tts.ntf.l3.0006" },
  "payload": {
    "shapeType": "circle",
    "partitionLines": [[[0.5,0.5],[0.5,0]],[[0.5,0.5],[1,0.75]],[[0.5,0.5],[0,0.75]]],
    "highlightedRegions": [0],
    "rotation": 0,
    "labelOptions": ["one half", "one fourth", "one third"],
    "correctLabelIndex": 2
  },
  "correctAnswer": 2,
  "validatorId": "validator.snap_match.labelMatch",
  "skillIds": ["KC-UNITS-VIS"],
  "misconceptionTraps": ["MC-L3-PARTCOUNT-01"],
  "difficultyTier": "medium"
}

// Hard — "one quarter" as the correct label; tests synonym M10
{
  "id": "q:ntf:L3:0010",
  "type": "snap_match",
  "prompt": { "text": "Drag the right name onto this shape.", "ttsKey": "tts.ntf.l3.0010" },
  "payload": {
    "shapeType": "circle",
    "partitionLines": [[[0.5,0],[0.5,1]],[[0,0.5],[1,0.5]]],
    "highlightedRegions": [0],
    "rotation": 0,
    "labelOptions": ["one third", "one quarter", "one half"],
    "correctLabelIndex": 1
  },
  "correctAnswer": 1,
  "validatorId": "validator.snap_match.labelMatch",
  "skillIds": ["KC-UNITS-VIS"],
  "misconceptionTraps": ["MC-L3-QTR-01"],
  "difficultyTier": "hard"
}
```

**Authoring target for this activity:** 12 templates (4 easy, 5 medium, 3 hard).

---

## 5. Misconceptions Detected at This Level

| MC ID                 | Name                                                                                                         | Detection signal                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `MC-L3-PARTCOUNT-01`  | "More pieces = bigger" (M5) — student picks 4-part option when prompt asks for thirds, or vice-versa         | Wrong answer on `identify_thirds` Hard or `identify_fourths` Hard with cross-denominator distractors              |
| `MC-VOC-01`           | "Fourth ≠ Quarter" (M10, canonical) — student treats "one-fourth" and "one-quarter" as different fractions   | Tagged on 4 `label` templates with denominator-4 options: N005 (easy), N006/N007 (medium), N008 (hard)            |
| `MC-L3-QTR-01`        | (L3-local alias for MC-VOC-01) "Quarter ≠ fourth" — differential accuracy between synonym prompts            | Differential accuracy: "fourths" prompt > 80% correct, "quarters" prompt < 50% correct on same template structure |
| `MC-L3-EQUAL-01`      | "Three pieces = thirds, regardless of equality" (M3 generalized) — student accepts 3 unequal parts as thirds | Wrong answer on `identify_thirds` Medium with unequal-3-part distractors                                          |
| `MC-EOL-01`           | (carryover) "More lines = equal" — student accepts unequal partitioning if line count is right               | Wrong on Tier 2 across all activities                                                                             |
| `MC-L3-CIRCLEONLY-01` | "Thirds only happen in pie shapes" — student picks circle option even when wrong                             | Pattern of always-circle picks on `identify_thirds` Medium with mixed shapes                                      |

These mostly map to misconceptions **M3, M5, M9, M10** in `MISCONCEPTIONS_FRAMEWORK.md`. `MC-VOC-01` is the cross-level canonical code; `MC-L3-QTR-01` is the L3-scoped behavioural alias.

---

## 6. Fraction Pool

Per C8, Level 3 introduces thirds and fourths. Halves remain available as distractors and review material:

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

`visualAssets` omitted for brevity but follows the schema in `data-schema.md` §2.6.

Sixths and eighths do **not** appear at this level (per C8). They arrive in Level 8+ for comparison work.

---

## 7. Advancement Criteria (Mastery Gate to Level 4)

A student unlocks Level 4 when **all** are true:

- `SkillMastery.state === "MASTERED"` for `KC-UNITS-VIS` (see `../skills.md`)
- `KC-HALVES-VIS` and `KC-SET-MODEL` remain at `"MASTERED"` or `"APPROACHING"`
- At least 24 attempts across all 3 activities at Level 3 (8 minimum per activity)
- Tier 3 (Hard) accuracy ≥ 65% across the last 6 hard attempts (slightly looser than L1/L2 because thirds are genuinely harder)
- No active `MisconceptionFlag` for `MC-L3-PARTCOUNT-01` (the M5 trap is the load-bearing diagnostic for this level)

`MC-L3-QTR-01` is tracked but non-blocking — students can advance with quarter/fourth confusion remaining; it gets continued exposure in Level 5.

---

## 8. Estimated Session Time

Per C9:

- **Single session:** 11–14 minutes (5 problems with hints + 2 unscaffolded check problems)
- **Full level mastery:** 5–7 sessions across 3–5 days

Level 3 is genuinely harder than Levels 1–2 because thirds break the halving schema. Expect more sessions and more "stay" recommendations from the progression engine.

---

## 9. Authoring Status

| Item                          | Required              | Authored                                  | Notes                                                                                       |
| ----------------------------- | --------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `identify_thirds` templates   | 14                    | 3 doc examples (11 in bundle)             | ≥30 floor met (30 total in bundle). Per-activity aspirational target: 14.                   |
| `identify_fourths` templates  | 14                    | 3 doc examples (bundle count shared)      | Per-activity aspirational target: 14. Increase when per-activity tagging is added.          |
| `name_the_fraction` templates | 12                    | 4 doc examples (19 label templates total) | Per-activity aspirational target: 12. Bundle label count: 19.                               |
| **Bundle total (live)**       | ≥30                   | **30 ✓** (equal_or_not:11, label:19)      | `public/curriculum/v1.json` — floor met as of 2026-04-30.                                   |
| TTS audio scripts             | 40                    | 0                                         | Generate via SpeechSynthesis API at runtime                                                 |
| Hint definitions              | ~90 (3 per 30)        | 0                                         | TBD                                                                                         |
| Validator function specs      | 1 new (`labelMatch`)  | High-level only                           | Need detailed pseudocode                                                                    |

---

## 10. Open Questions for Level 3

1. **Pie-slice vs. bar-slice rendering for thirds.** Thirds are visually intuitive in pies (3 equal sectors) but harder in bars (3 vertical strips). Should `identify_thirds` show both representations equally, or weight toward bars to break circle-only bias? Recommended: 60/40 bars/pies on Tier 1, balanced 50/50 on Tier 2-3.
2. **"Quarter" vocabulary strategy.** Should the synonym be introduced gradually (Tier 3 only) or from the first encounter? Recommended: introduce in Tier 2; Tier 1 stays on "fourths" to build the primary association first.
3. **Distractor-fraction policy.** Tier 3 mixes denominators in distractors. Does this violate C8's "no mixed-denominator activities until Level 6"? **Interpretation:** C8 prohibits mixing in **comparison/operation** contexts. Distractors in identification questions are not comparisons — the student is identifying a single fraction. We should document this interpretation in `constraints.md` or accept this as the working interpretation.
4. **Audio prompt synonymization.** When the prompt says "fourths" but the correct label is "one quarter", is that fair? Recommended: only allow synonym mismatches at Tier 3 with explicit hint scaffolding.
5. **Triangle thirds.** Equilateral triangles split into thirds via three central rays — visually distinctive but unfamiliar. Should they appear at this level or wait until Level 5? Recommended: introduce only at Tier 3 with a hint that explains the partition pattern.
