---
title: Level 6 — Compare Same-Denominator Fractions
status: draft
owner: solo
last_reviewed: 2026-04-25
applies_to: [mvp]
constraint_refs: [C3, C8, C9]
related: [../scope-and-sequence.md, ../../30-architecture/data-schema.md, level-05.md, level-07.md]
---

# Level 6 — Compare Same-Denominator Fractions

The first level where the student compares two fractions and answers with a relational symbol. Goal: when the denominators match, **larger numerator = larger fraction**.

This is also the level where **symbolic notation `1/2`, `1/3`, `2/3`, `3/4`** is formally introduced (per `scope-and-sequence.md` §7 and `RoadMap/02_Level_03_05/02_LEARNING_TRAJECTORY.md`). Up through Level 5 the student saw shapes and the words "one half"; from Level 6 onward, the symbol and the visual co-occur.

Per **C8**, this is the first level where the curriculum is _allowed_ to mix denominators in a single screen — and even here, the **comparisons** themselves stay same-denominator. Mixed denominators in the _fraction pool_ (e.g., a session that contains both 2/3-vs-1/3 problems and 3/4-vs-1/4 problems) are fine; mixed denominators **inside one comparison** start at Level 7.

---

## 1. Learning Goals

By the end of Level 6, the student can:

- **G6.1** — Read and write the symbolic forms `1/2`, `1/3`, `2/3`, `1/4`, `2/4`, `3/4` and connect each to a partitioned shape
- **G6.2** — Given two fractions with the **same denominator**, identify which is larger (or that they are equal)
- **G6.3** — Use the symbols `<`, `=`, `>` between two same-denominator fractions correctly
- **G6.4** — Verbally state the rule: "When the bottom number is the same, the bigger top number means the bigger fraction"
- **G6.5** — Recognise that `2/4 = 1/2` and `3/3 = 1` are facts the visual model confirms (no formal equivalence work yet — that is Level 9 territory and beyond MVP)

The level does **not** ask the student to compare across denominators (Level 7), reason from benchmarks (Level 8), or order three or more (Level 9).

---

## 2. Skills Tracked

See `../skills.md` for canonical definitions. (audit §1.1 fix — former SK-10/SK-11/SK-12 at L6 collided with L3/L4 IDs; renumbered SK-21/SK-22/SK-23)

| Skill ID | Name                                         | BKT priors                                           |
| -------- | -------------------------------------------- | ---------------------------------------------------- |
| `SK-21`  | Read symbolic fraction notation `a/b`        | `pInit=0.20, pTransit=0.25, pSlip=0.10, pGuess=0.25` |
| `SK-22`  | Same-denominator comparison (numerator rule) | `pInit=0.30, pTransit=0.30, pSlip=0.10, pGuess=0.33` |
| `SK-23`  | Use of `<`, `=`, `>` symbols                 | `pInit=0.20, pTransit=0.25, pSlip=0.10, pGuess=0.33` |

`SK-21` carries forward into Levels 7–9. `SK-22` and `SK-23` are first introduced here. The `pGuess` prior on `SK-22` and `SK-23` is `0.33` because the student is choosing among three options (`<`, `=`, `>`).

Mastery of all three skills at `state: "MASTERED"` is the gate to unlock Level 7.

---

## 3. Standards Crosswalk (informational)

| Standard                                                                                            | Coverage                                                                                |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **CCSS.2.G.A.3** (recognize equal shares of identical wholes need not have the same shape)          | Touched (the bar/circle model duality)                                                  |
| **CCSS.3.NF.A.3.d** (compare two fractions with the same denominator by reasoning about their size) | **Primary** (Grade 3 standard introduced early in MVP scope per `00-MASTER_PLAN.md` §1) |

The MVP intentionally introduces 3.NF.A.3.d at Grade 2 because the comparison-validation question (C10) requires the student to _do_ comparison, not just identify partitions.

---

## 4. Activities at This Level

Three core activities. Each session uses one activity; a full level pass touches all three at least once.

### 4.1 Activity: `comparison_battle_same_denom` (mechanic: compare)

**Slug:** `comparison_battle_same_denom`
**Mechanic:** compare
**Title:** "Which Is Bigger?"
**Levels in app:** L6 only (Level 7 uses a same-numerator variant)

The student sees two fractions side by side, both rendered as labelled bar models with the symbolic notation underneath each bar. The denominators are equal. Three large buttons sit below: `<`, `=`, `>`. The student taps the button that makes the statement true (left fraction `?` right fraction).

This is the canonical archetype from `RoadMap/03_Level_06_09/05-FractionSnap.md` §1, simplified for first-encounter symbolic comparison and stripped of timer pressure.

#### Difficulty tiers

| Tier   | Visual support                                                              | Distractors / traps                                                                                                                                                          | Hint budget |
| ------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Easy   | Both fractions show bar model + symbolic notation. Bars use the same width. | None — comparisons are clearly unequal (e.g., 1/4 vs 3/4)                                                                                                                    | 3           |
| Medium | Bar model shown, but smaller (50% height)                                   | One of the three buttons (`=`) is a trap: never correct in same-denominator pairs unless numerators are also equal — which they are in a small fraction of medium tier items | 2           |
| Hard   | Symbolic only, no bar model unless the student requests via hint            | Numerators differ by 1 only (e.g., `2/4` vs `3/4`); equal pairs (`2/3` vs `2/3`) appear as a deliberate trap                                                                 | 1           |

#### Question template archetype

**Type:** `comparison`
**Payload shape:** `{ left: { num, den }, right: { num, den }, showBarModel: boolean }`
**Correct answer shape:** `"<" | "=" | ">"`
**Validator:** `validator.comparison.relationalSymbol`

#### Sample templates (4 of 12 needed)

```jsonc
// Easy — clearly unequal halves vs halves does not exist (only 1/2);
// the easy tier in same-denom uses fourths or thirds with large numerator gap.
{
  "id": "q:cbsd:L6:0001",
  "type": "comparison",
  "prompt": { "text": "Which symbol makes this true?", "ttsKey": "tts.cbsd.l6.0001" },
  "payload": {
    "left":  { "num": 1, "den": 4 },
    "right": { "num": 3, "den": 4 },
    "showBarModel": true
  },
  "correctAnswer": "<",
  "validatorId": "validator.comparison.relationalSymbol",
  "skillIds": ["SK-21", "SK-22", "SK-23"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

// Easy — equal pair to teach the "=" button's purpose
{
  "id": "q:cbsd:L6:0002",
  "type": "comparison",
  "prompt": { "text": "Which symbol makes this true?", "ttsKey": "tts.cbsd.l6.0002" },
  "payload": {
    "left":  { "num": 2, "den": 3 },
    "right": { "num": 2, "den": 3 },
    "showBarModel": true
  },
  "correctAnswer": "=",
  "validatorId": "validator.comparison.relationalSymbol",
  "skillIds": ["SK-22", "SK-23"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

// Medium — adjacent numerators in fourths (smallest legal gap)
{
  "id": "q:cbsd:L6:0006",
  "type": "comparison",
  "prompt": { "text": "Which symbol makes this true?", "ttsKey": "tts.cbsd.l6.0006" },
  "payload": {
    "left":  { "num": 2, "den": 4 },
    "right": { "num": 3, "den": 4 },
    "showBarModel": true
  },
  "correctAnswer": "<",
  "validatorId": "validator.comparison.relationalSymbol",
  "skillIds": ["SK-22", "SK-23"],
  "misconceptionTraps": ["MC-WHB-01"],
  "difficultyTier": "medium"
}

// Hard — symbolic only, no bar; tests whether SK-22 has internalized
{
  "id": "q:cbsd:L6:0011",
  "type": "comparison",
  "prompt": { "text": "Which symbol makes this true?", "ttsKey": "tts.cbsd.l6.0011" },
  "payload": {
    "left":  { "num": 1, "den": 3 },
    "right": { "num": 2, "den": 3 },
    "showBarModel": false
  },
  "correctAnswer": "<",
  "validatorId": "validator.comparison.relationalSymbol",
  "skillIds": ["SK-21", "SK-22", "SK-23"],
  "misconceptionTraps": [],
  "difficultyTier": "hard"
}
```

**Authoring target:** 12 templates (4 easy, 5 medium, 3 hard).

---

### 4.2 Activity: `fraction_snap_same_denom` (mechanic: compare)

**Slug:** `fraction_snap_same_denom`
**Mechanic:** compare
**Title:** "Snap the Bigger One"
**Levels in app:** L6, L7 (continued with same-numerator variant)

Adapted from `RoadMap/03_Level_06_09/05-FractionSnap.md` and constrained to same-denominator pairs at this level. Two fraction cards flip face-up. A direction banner above reads "Tap the BIGGER fraction!" or "Tap the SMALLER fraction!" The student taps the chosen card. The mechanic shifts emphasis from symbolic reasoning (Activity 4.1) to **quick recognition under mild time pressure** (15-second timer at Easy, 10s at Medium, 6s at Hard — see source design doc §3).

This activity is intentionally lighter on cognitive load than Activity 4.1 (no `=` decision; only "which one") and serves as fluency practice once the rule is understood.

#### Difficulty tiers

| Tier   | Timer | Visual                 | Direction prompt         | Hint budget |
| ------ | ----- | ---------------------- | ------------------------ | ----------- |
| Easy   | 15s   | Bar model on each card | "Tap the BIGGER" only    | 2           |
| Medium | 10s   | Compact bar model      | Mixed: BIGGER or SMALLER | 1           |
| Hard   | 6s    | Symbolic only          | Mixed: BIGGER or SMALLER | 0           |

Per **C9**, even Hard tier sessions are designed to fit a 10–15 minute play window: ~12 rounds at 6s = ~2 minutes of timer, plus inter-round transitions and feedback.

#### Question template archetype

**Type:** `comparison`
**Payload shape:** `{ left: { num, den }, right: { num, den }, direction: "bigger" | "smaller", showBarModel: boolean, timerMs: number }`
**Correct answer shape:** `"left" | "right"` (the side the student should tap)
**Validator:** `validator.comparison.tapSide`

#### Sample templates (3 of 10 needed)

```jsonc
{
  "id": "q:fssd:L6:0001",
  "type": "comparison",
  "prompt": { "text": "Tap the BIGGER fraction!", "ttsKey": "tts.fssd.l6.0001" },
  "payload": {
    "left":  { "num": 1, "den": 4 },
    "right": { "num": 3, "den": 4 },
    "direction": "bigger",
    "showBarModel": true,
    "timerMs": 15000
  },
  "correctAnswer": "right",
  "validatorId": "validator.comparison.tapSide",
  "skillIds": ["SK-21", "SK-22"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

{
  "id": "q:fssd:L6:0005",
  "type": "comparison",
  "prompt": { "text": "Tap the SMALLER fraction!", "ttsKey": "tts.fssd.l6.0005" },
  "payload": {
    "left":  { "num": 2, "den": 3 },
    "right": { "num": 1, "den": 3 },
    "direction": "smaller",
    "showBarModel": true,
    "timerMs": 10000
  },
  "correctAnswer": "right",
  "validatorId": "validator.comparison.tapSide",
  "skillIds": ["SK-22"],
  "misconceptionTraps": ["MC-WHB-01"],
  "difficultyTier": "medium"
}

{
  "id": "q:fssd:L6:0009",
  "type": "comparison",
  "prompt": { "text": "Tap the BIGGER fraction!", "ttsKey": "tts.fssd.l6.0009" },
  "payload": {
    "left":  { "num": 3, "den": 4 },
    "right": { "num": 2, "den": 4 },
    "direction": "bigger",
    "showBarModel": false,
    "timerMs": 6000
  },
  "correctAnswer": "left",
  "validatorId": "validator.comparison.tapSide",
  "skillIds": ["SK-21", "SK-22"],
  "misconceptionTraps": [],
  "difficultyTier": "hard"
}
```

**Authoring target:** 10 templates (3 easy, 4 medium, 3 hard).

---

### 4.3 Activity: `match_symbol_to_shape` (mechanic: snap_match)

**Slug:** `match_symbol_to_shape`
**Mechanic:** snap_match
**Title:** "Match the Fraction to the Picture"
**Levels in app:** L6 only

A bridge activity that explicitly trains `SK-21` (read symbolic notation). The student sees three or four shaded shapes (bars or circles) and a single fraction symbol like `2/3`. They drag the symbol card onto the matching shape. This is the _only_ same-denominator activity that does not directly involve a comparison — its job is to anchor the symbol to the visual, so that Activities 4.1 and 4.2 can rely on the student reading `2/3` correctly under timer pressure.

The same archetype reappears in Level 7+ as a hint mechanism, but it lives as a first-class activity here.

#### Difficulty tiers

| Tier   | Distractor strategy                                                                                                | Hint budget |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ----------- |
| Easy   | 3 options: target + 1 different denominator + 1 unpartitioned shape                                                | 3           |
| Medium | 3 options: all same denominator, only the numerator differs                                                        | 2           |
| Hard   | 4 options: same denominator across all, includes one near-miss (e.g., target `2/3`, distractor `3/3` fully shaded) | 1           |

#### Question template archetype

**Type:** `snap_match`
**Payload shape:** `{ symbol: { num, den }, options: [{ shapeType, partitionLines, highlightedRegions }, ...], targetIndex: number }`
**Correct answer shape:** `number` (index of the matching shape)
**Validator:** `validator.snap_match.exactIndex`

#### Sample templates (2 of 8 needed)

```jsonc
{
  "id": "q:msts:L6:0001",
  "type": "snap_match",
  "prompt": { "text": "Drag 2/3 onto the picture that shows two-thirds.", "ttsKey": "tts.msts.l6.0001" },
  "payload": {
    "symbol": { "num": 2, "den": 3 },
    "options": [
      {
        "shapeType": "rectangle",
        "partitionLines": [[[0.333,0],[0.333,1]],[[0.667,0],[0.667,1]]],
        "highlightedRegions": [0, 1]
      },
      {
        "shapeType": "rectangle",
        "partitionLines": [[[0.333,0],[0.333,1]],[[0.667,0],[0.667,1]]],
        "highlightedRegions": [0]
      },
      {
        "shapeType": "rectangle",
        "partitionLines": [[[0.5,0],[0.5,1]]],
        "highlightedRegions": [0]
      }
    ],
    "targetIndex": 0
  },
  "correctAnswer": 0,
  "validatorId": "validator.snap_match.exactIndex",
  "skillIds": ["SK-21"],
  "misconceptionTraps": ["MC-WHB-01"],
  "difficultyTier": "easy"
}

{
  "id": "q:msts:L6:0006",
  "type": "snap_match",
  "prompt": { "text": "Drag 3/4 onto the picture that shows three-fourths.", "ttsKey": "tts.msts.l6.0006" },
  "payload": {
    "symbol": { "num": 3, "den": 4 },
    "options": [
      {
        "shapeType": "circle",
        "partitionLines": [[[0.25,0],[0.25,1]],[[0.5,0],[0.5,1]],[[0.75,0],[0.75,1]]],
        "highlightedRegions": [0, 1, 2, 3]
      },
      {
        "shapeType": "circle",
        "partitionLines": [[[0.25,0],[0.25,1]],[[0.5,0],[0.5,1]],[[0.75,0],[0.75,1]]],
        "highlightedRegions": [0, 1, 2]
      },
      {
        "shapeType": "circle",
        "partitionLines": [[[0.25,0],[0.25,1]],[[0.5,0],[0.5,1]],[[0.75,0],[0.75,1]]],
        "highlightedRegions": [0, 1]
      },
      {
        "shapeType": "circle",
        "partitionLines": [[[0.25,0],[0.25,1]],[[0.5,0],[0.5,1]],[[0.75,0],[0.75,1]]],
        "highlightedRegions": [0]
      }
    ],
    "targetIndex": 1
  },
  "correctAnswer": 1,
  "validatorId": "validator.snap_match.exactIndex",
  "skillIds": ["SK-21"],
  "misconceptionTraps": [],
  "difficultyTier": "hard"
}
```

**Authoring target:** 8 templates (3 easy, 3 medium, 2 hard).

---

## 5. Misconceptions Detected at This Level

| MC ID       | Name                                                                                                                                      | Detection signal                                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `MC-WHB-01` | "Whole-number bias on numerator" — student picks the fraction with the _visually larger numerator digit_ without checking the denominator | Wrong on `match_symbol_to_shape` Hard items where `3/3` is offered as a distractor for target `2/3`                                       |
| `MC-EQ-01`  | "Equal looks the same" — student picks `=` whenever the two bars look approximately the same length, even with unequal numerators         | Wrong "=" on `comparison_battle_same_denom` Medium items where numerators differ by 1                                                     |
| `MC-SYM-01` | "Reverses `<` and `>`" — student knows the rule but consistently picks the wrong direction symbol                                         | Correct relative judgement on `fraction_snap_same_denom` (which side to tap) but wrong direction symbol on `comparison_battle_same_denom` |

`MC-WHB-02` (whole-number bias on the _denominator_, the classic "1/4 > 1/3 because 4 > 3" error) is **not yet** observable here because all comparisons share a denominator. It first appears at Level 7.

Detail and intervention activities live in `../misconceptions.md` (TBD; salvage from `RoadMap/02_Level_03_05/misconceptions/MISCONCEPTIONS_FRAMEWORK.md`).

---

## 6. Fraction Pool

Per **C8**, Level 6 uses denominators 2, 3, and 4. Sixths and eighths arrive at Level 8.

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
    "benchmark": "almost_half",
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
  }
]
```

Within a single comparison item, both fractions must share a denominator. Across a session, fractions from different denominator families may appear (e.g., a thirds comparison followed by a fourths comparison). This is the first level where C8's "no mixed-denominator activities until Level 6" clause is exercised — and the comparison itself stays same-denominator.

---

## 7. Advancement Criteria (Mastery Gate to Level 7)

A student unlocks Level 7 when **all** are true:

- `SkillMastery.state === "MASTERED"` for `SK-21`, `SK-22`, **and** `SK-23` (see `../skills.md`)
- At least 18 attempts across at least 2 different activities at this level
- Tier 3 (Hard) accuracy ≥ 70% across the last 6 hard attempts (no scaffolding, no bar model)
- Average response time on Hard `fraction_snap_same_denom` ≤ 5 seconds (the fluency check — same-denominator comparison should be near-automatic before the mixed-denominator complexity of L7 lands)

The progression engine runs after each session and may recommend `"advance"`, `"stay"`, or `"regress"`. Regression to Level 5 is rare and only triggered after sustained struggle on `SK-21` (symbolic reading), which would indicate the symbol introduction is not consolidated.

---

## 8. Estimated Session Time

Per **C9**:

- **Single session:** 10–13 minutes (~12–18 problems depending on activity mix)
- **Full level mastery:** 3–4 sessions across 2–3 days

A pure `fraction_snap_same_denom` Hard session can fit ~25 rounds in 10 minutes; a `comparison_battle_same_denom` Easy session fits ~10 rounds in the same window because of the longer prompt/feedback cycle.

---

## 9. Authoring Status

| Item                                     | Required             | Authored         | Notes                                                                  |
| ---------------------------------------- | -------------------- | ---------------- | ---------------------------------------------------------------------- |
| `comparison_battle_same_denom` templates | 12                   | 4 examples shown | Need 8 more                                                            |
| `fraction_snap_same_denom` templates     | 10                   | 3 examples shown | Need 7 more                                                            |
| `match_symbol_to_shape` templates        | 8                    | 2 examples shown | Need 6 more                                                            |
| TTS audio scripts                        | 30                   | 0                | Generate from `prompt.text` via SpeechSynthesis API at runtime         |
| Hint definitions                         | ~90 (3 per template) | 0                | TBD                                                                    |
| Validator function specs                 | 3                    | High-level only  | Need detailed pseudocode in `../../20-mechanic/activity-archetypes.md` |

---

## 10. Open Questions for Level 6

1. **Symbol introduction ceremony.** Should the very first Level 6 session open with a 30-second non-graded "Meet the Symbol" scene that shows `1/2` morphing out of a partitioned shape and a voice saying "this is one half"? Recommended: yes; it is the only level transition where the visual schema and the symbolic schema first connect, and the cost is one short scene.

2. **Equal-pair ratio.** What fraction of `comparison_battle_same_denom` items should have answer `=`? Too few and the student never exercises that button (and treats it as decoration); too many and the activity becomes "always tap equals." Recommended: 15–20% of templates have answer `=`, distributed across all three tiers.

3. **Bar vs circle as the first visual model.** Per `level-01.md` open question 1, rectangles are the primary model in early levels. Should Level 6 introduce circles for the symbolic-comparison activities, given that comparing two circles by eye is harder than comparing two bars? Recommended: keep bars primary in `comparison_battle_same_denom`, allow circles in `match_symbol_to_shape` (where the student reads, not measures).

4. **Reading prerequisite.** The symbolic notation `2/3` requires the student to read two digits. Most kindergartners cannot reliably do this; most second-graders can. Should Level 6 require a brief reading-readiness check, or trust the curriculum sequencing (only students who passed L1–L5 reach L6)? Recommended: trust the sequencing for MVP; revisit if playtest data shows a reading bottleneck.
