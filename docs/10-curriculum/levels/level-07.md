---
title: Level 7 — Compare Same-Numerator Fractions
status: draft
owner: solo
last_reviewed: 2026-04-25
applies_to: [mvp]
constraint_refs: [C3, C8, C9]
related: [../scope-and-sequence.md, ../../30-architecture/data-schema.md, level-06.md, level-08.md]
---

# Level 7 — Compare Same-Numerator Fractions

The counter-intuitive level. Goal: when two fractions share the **same numerator**, the one with the **larger denominator is smaller**. The classic Grade 2 trap is `1/4 > 1/3` — false, because each fourth is smaller than each third.

This level is where **whole-number bias on the denominator** (`MC-WHB-02`) is first directly attacked. The pedagogical strategy, salvaged from `RoadMap/02_Level_03_05/Grade2-ComparingOrdering/01-FractionMagnitudeScales.md` and `RoadMap/03_Level_06_09/00-MASTER_PLAN.md` §8 (R-03), is to *pre-empt* the misconception with a "flip rule" micro-lesson before the student encounters their first same-numerator pair, then provide visual side-by-side bar models on every wrong answer until the rule is internalised.

Per **C8**, this is the first level where a single comparison **mixes denominators**. The comparison `1/3` vs `1/4` necessarily uses two denominator families; that mixing is the entire pedagogical point of the level.

---

## 1. Learning Goals

By the end of Level 7, the student can:

- **G7.1** — Given two fractions with the **same numerator** but different denominators, identify which is larger
- **G7.2** — Verbally state the rule: "When the top numbers are the same, the one with the bigger bottom number is the **smaller** fraction"
- **G7.3** — Order a sequence of unit fractions (`1/2`, `1/3`, `1/4`, `1/6`, `1/8`) from largest to smallest and explain why
- **G7.4** — Resist the whole-number bias on the denominator: not pick `1/4` over `1/3` based on `4 > 3`
- **G7.5** — Apply the same-numerator rule to non-unit fractions (e.g., `2/3` vs `2/4`)

The level does **not** ask the student to compare across denominators when **both** numerator and denominator differ (that is Level 8 with benchmark reasoning, and Level 9 with full ordering).

---

## 2. Skills Tracked

See `../skills.md` for canonical definitions. (audit §1.1 fix — former SK-13/SK-14/SK-15 at L7 collided with L4 IDs; renumbered SK-24/SK-25/SK-26)

| Skill ID | Name | BKT priors |
|----------|------|------------|
| `SK-24` | Same-numerator comparison (inverse-denominator rule) | `pInit=0.10, pTransit=0.20, pSlip=0.15, pGuess=0.33` |
| `SK-25` | Unit-fraction ordering (1/2, 1/3, 1/4, 1/6, 1/8) | `pInit=0.15, pTransit=0.25, pSlip=0.10, pGuess=0.20` |
| `SK-26` | Resisting whole-number bias on the denominator | `pInit=0.20, pTransit=0.30, pSlip=0.15, pGuess=0.50` |

`SK-24` carries forward into Level 8 (benchmarks) and Level 9 (ordering). `SK-26` is a *negative* skill — its mastery is signalled by the *absence* of `MC-WHB-02` flags across the last 8 attempts. The high `pSlip` (0.15) on `SK-24` reflects that even students who understand the rule sometimes default to the whole-number bias under timer pressure.

The `pGuess` on `SK-26` is `0.50` because the binary "did the student fall for the trap or not" has two possible outcomes.

Mastery of `SK-24` and `SK-25` at `state: "MASTERED"`, **and** at most one `MC-WHB-02` flag in the last 8 attempts, is the gate to unlock Level 8.

---

## 3. Standards Crosswalk (informational)

| Standard | Coverage |
|----------|----------|
| **CCSS.3.NF.A.3.d** (compare two fractions with the same numerator by reasoning about their size) | **Primary** |
| **CCSS.2.NF.A.1** (understand a fraction `1/b` as the quantity formed by 1 part when a whole is partitioned into `b` equal parts) | Reinforced (the unit-fraction inverse relationship is the heart of this level) |

---

## 4. Activities at This Level

Three core activities. Each session uses one activity; a full level pass touches all three at least once.

### 4.1 Activity: `comparison_battle_same_num` (mechanic: compare)

**Slug:** `comparison_battle_same_num`
**Mechanic:** compare
**Title:** "When the Tops Match"
**Levels in app:** L7 only

The same UI as `comparison_battle_same_denom` from Level 6, but now **the denominators differ and the numerators match**. Two fractions side-by-side with bar models, three buttons (`<`, `=`, `>`).

**Pre-activity micro-lesson** (per `00-MASTER_PLAN.md` §8 R-03): the very first time a student starts this activity, a 25-second non-graded scene plays. Two pizzas of identical size are shown — one cut into 3 equal slices, one cut into 6 equal slices. A single slice is highlighted on each. The voiceover says: "Look — both pizzas are the same size, but one is cut into more pieces. When you cut into MORE pieces, each piece is SMALLER." This scene is shown once per student per device, dismissable, and does not contribute to attempt counts.

#### Difficulty tiers

| Tier | Visual support | Comparison structure | Hint budget |
|------|---------------|---------------------|-------------|
| Easy | Bar models, identical scale, both bars on screen | Unit fractions only (`1/2`, `1/3`, `1/4`); large denominator gap (e.g., `1/2` vs `1/4`) | 3 |
| Medium | Bar models, smaller | Unit fractions, adjacent denominators (`1/3` vs `1/4`); also non-unit pairs with matching numerators (`2/3` vs `2/4`) | 2 |
| Hard | Symbolic only (bar via hint) | Includes `1/6` and `1/8`; denominator gap of 1 (`1/6` vs `1/7` is **not** in MVP — sevenths are out of scope per C8); the trap "tops match → look at the bottoms backwards" is the explicit target | 1 |

#### Question template archetype

**Type:** `comparison`
**Payload shape:** `{ left: { num, den }, right: { num, den }, showBarModel: boolean }`
**Correct answer shape:** `"<" | "=" | ">"`
**Validator:** `validator.comparison.relationalSymbol`

#### Sample templates (4 of 14 needed)

```jsonc
// Easy — large denominator gap; the canonical first-encounter
{
  "id": "q:cbsn:L7:0001",
  "type": "comparison",
  "prompt": { "text": "Which symbol makes this true?", "ttsKey": "tts.cbsn.l7.0001" },
  "payload": {
    "left":  { "num": 1, "den": 2 },
    "right": { "num": 1, "den": 4 },
    "showBarModel": true
  },
  "correctAnswer": ">",
  "validatorId": "validator.comparison.relationalSymbol",
  "skillIds": ["SK-24", "SK-26"],
  "misconceptionTraps": ["MC-WHB-02"],
  "difficultyTier": "easy"
}

// Easy — opposite direction to prevent positional habit
{
  "id": "q:cbsn:L7:0002",
  "type": "comparison",
  "prompt": { "text": "Which symbol makes this true?", "ttsKey": "tts.cbsn.l7.0002" },
  "payload": {
    "left":  { "num": 1, "den": 6 },
    "right": { "num": 1, "den": 3 },
    "showBarModel": true
  },
  "correctAnswer": "<",
  "validatorId": "validator.comparison.relationalSymbol",
  "skillIds": ["SK-24", "SK-26"],
  "misconceptionTraps": ["MC-WHB-02"],
  "difficultyTier": "easy"
}

// Medium — adjacent denominators, the classic trap
{
  "id": "q:cbsn:L7:0006",
  "type": "comparison",
  "prompt": { "text": "Which symbol makes this true?", "ttsKey": "tts.cbsn.l7.0006" },
  "payload": {
    "left":  { "num": 1, "den": 3 },
    "right": { "num": 1, "den": 4 },
    "showBarModel": true
  },
  "correctAnswer": ">",
  "validatorId": "validator.comparison.relationalSymbol",
  "skillIds": ["SK-24", "SK-26"],
  "misconceptionTraps": ["MC-WHB-02"],
  "difficultyTier": "medium"
}

// Hard — non-unit, symbolic only
{
  "id": "q:cbsn:L7:0012",
  "type": "comparison",
  "prompt": { "text": "Which symbol makes this true?", "ttsKey": "tts.cbsn.l7.0012" },
  "payload": {
    "left":  { "num": 2, "den": 3 },
    "right": { "num": 2, "den": 4 },
    "showBarModel": false
  },
  "correctAnswer": ">",
  "validatorId": "validator.comparison.relationalSymbol",
  "skillIds": ["SK-24", "SK-26"],
  "misconceptionTraps": ["MC-WHB-02"],
  "difficultyTier": "hard"
}
```

**Authoring target:** 14 templates (4 easy, 6 medium, 4 hard). Higher than Level 6 (12) because this is the misconception-heavy level and adaptive difficulty needs more material to draw from on retry.

---

### 4.2 Activity: `unit_fraction_ladder` (mechanic: order)

**Slug:** `unit_fraction_ladder`
**Mechanic:** order
**Title:** "Stack the Slices"
**Levels in app:** L7 only (Level 9 generalises this to non-unit ordering with mixed denominators)

The student is given 3, 4, or 5 unit-fraction cards (e.g., `1/2`, `1/3`, `1/4`, `1/6`, `1/8`) shuffled in a tray. Below the tray is a vertical "ladder" with N labelled rungs: top = LARGEST, bottom = SMALLEST. The student drags each card onto a rung. The mechanic is the drag-to-sequence archetype from `RoadMap/03_Level_06_09/03-FractionOrderingTournament.md`, restricted at this level to **unit fractions only** to keep the focus on `SK-25` (the unit-fraction inverse relationship: bigger bottom = smaller piece).

A bar-model strip down the right side of the screen shows each fraction's bar at unified scale; as the student places cards, the corresponding bars highlight in the same vertical order, providing implicit feedback (per the "implicit feedback from number line" pattern in the Ordering Tournament source doc §3).

#### Difficulty tiers

| Tier | Card count | Bars visible | Hint budget |
|------|-----------|-------------|-------------|
| Easy | 3 cards (`1/2`, `1/3`, `1/4`) | Always shown | 3 |
| Medium | 4 cards (adds `1/6`) | Shown after 1st wrong placement | 2 |
| Hard | 5 cards (adds `1/8`) | Shown only via hint | 1 |

The vertical ladder framing is a deliberate choice: a horizontal slot row (as in Level 9 ordering) introduces a **left-to-right reading bias** that competes with the actual rule. A vertical ladder labelled "TOP = BIGGEST" makes the magnitude direction explicit.

#### Question template archetype

**Type:** `ordering`
**Payload shape:** `{ cards: [{ num, den }, ...], orientation: "vertical_top_largest", showBars: boolean }`
**Correct answer shape:** `[{ num, den }, ...]` (the cards in the canonical largest-to-smallest order)
**Validator:** `validator.ordering.descendingDecimal`

#### Sample templates (3 of 10 needed)

```jsonc
{
  "id": "q:ufl:L7:0001",
  "type": "ordering",
  "prompt": { "text": "Stack the slices: biggest piece on top.", "ttsKey": "tts.ufl.l7.0001" },
  "payload": {
    "cards": [
      { "num": 1, "den": 4 },
      { "num": 1, "den": 2 },
      { "num": 1, "den": 3 }
    ],
    "orientation": "vertical_top_largest",
    "showBars": true
  },
  "correctAnswer": [
    { "num": 1, "den": 2 },
    { "num": 1, "den": 3 },
    { "num": 1, "den": 4 }
  ],
  "validatorId": "validator.ordering.descendingDecimal",
  "skillIds": ["SK-24", "SK-25"],
  "misconceptionTraps": ["MC-WHB-02"],
  "difficultyTier": "easy"
}

{
  "id": "q:ufl:L7:0005",
  "type": "ordering",
  "prompt": { "text": "Stack the slices: biggest piece on top.", "ttsKey": "tts.ufl.l7.0005" },
  "payload": {
    "cards": [
      { "num": 1, "den": 6 },
      { "num": 1, "den": 2 },
      { "num": 1, "den": 4 },
      { "num": 1, "den": 3 }
    ],
    "orientation": "vertical_top_largest",
    "showBars": false
  },
  "correctAnswer": [
    { "num": 1, "den": 2 },
    { "num": 1, "den": 3 },
    { "num": 1, "den": 4 },
    { "num": 1, "den": 6 }
  ],
  "validatorId": "validator.ordering.descendingDecimal",
  "skillIds": ["SK-24", "SK-25"],
  "misconceptionTraps": ["MC-WHB-02"],
  "difficultyTier": "medium"
}

{
  "id": "q:ufl:L7:0009",
  "type": "ordering",
  "prompt": { "text": "Stack all five slices: biggest on top.", "ttsKey": "tts.ufl.l7.0009" },
  "payload": {
    "cards": [
      { "num": 1, "den": 8 },
      { "num": 1, "den": 2 },
      { "num": 1, "den": 4 },
      { "num": 1, "den": 6 },
      { "num": 1, "den": 3 }
    ],
    "orientation": "vertical_top_largest",
    "showBars": false
  },
  "correctAnswer": [
    { "num": 1, "den": 2 },
    { "num": 1, "den": 3 },
    { "num": 1, "den": 4 },
    { "num": 1, "den": 6 },
    { "num": 1, "den": 8 }
  ],
  "validatorId": "validator.ordering.descendingDecimal",
  "skillIds": ["SK-24", "SK-25"],
  "misconceptionTraps": ["MC-WHB-02"],
  "difficultyTier": "hard"
}
```

**Authoring target:** 10 templates (3 easy, 4 medium, 3 hard).

---

### 4.3 Activity: `flip_rule_check` (mechanic: identify)

**Slug:** `flip_rule_check`
**Mechanic:** identify
**Title:** "Spot the Trap"
**Levels in app:** L7 only

A diagnostic activity that *targets* `MC-WHB-02`. The student is shown a "what someone said" speech bubble with a wrong claim like "**1/4 is bigger than 1/3 because 4 is bigger than 3.**" Two buttons: "I AGREE" and "I DISAGREE — that's the trap." The student picks. If they tap "DISAGREE," they then see a second screen asking them to drag a bar model to the side that is actually larger. The activity is therefore **two-step**: detect the misconception, then correct it.

This is the only L7 activity that is explicitly *about* the misconception rather than implicitly trapping it. Its purpose is metacognitive: the student names the trap so the next time it appears in `comparison_battle_same_num` they can recognise it.

#### Difficulty tiers

| Tier | Trap framing | Correction step | Hint budget |
|------|-------------|----------------|-------------|
| Easy | Speech bubble + obvious bar disparity (`1/4` vs `1/2`) | Tap correct side | 3 |
| Medium | Speech bubble; bar model shown only after disagree | Tap correct side | 2 |
| Hard | Speech bubble alone; symbolic statement only; correction step requires reading the symbol | Tap correct side | 1 |

#### Question template archetype

**Type:** `identify`
**Payload shape:** `{ claim: { left: { num, den }, right: { num, den }, asserted: ">"|"<"|"=" }, options: ["agree", "disagree"], correctionPair?: { left: { num, den }, right: { num, den } } }`
**Correct answer shape:** `{ judgement: "agree"|"disagree", correctionSide?: "left"|"right" }`
**Validator:** `validator.identify.flipRuleTwoStep`

#### Sample templates (2 of 8 needed)

```jsonc
{
  "id": "q:frc:L7:0001",
  "type": "identify",
  "prompt": {
    "text": "Someone said: '1/4 is bigger than 1/3 because 4 is bigger than 3.' Are they right?",
    "ttsKey": "tts.frc.l7.0001"
  },
  "payload": {
    "claim": {
      "left":  { "num": 1, "den": 4 },
      "right": { "num": 1, "den": 3 },
      "asserted": ">"
    },
    "options": ["agree", "disagree"],
    "correctionPair": {
      "left":  { "num": 1, "den": 4 },
      "right": { "num": 1, "den": 3 }
    }
  },
  "correctAnswer": { "judgement": "disagree", "correctionSide": "right" },
  "validatorId": "validator.identify.flipRuleTwoStep",
  "skillIds": ["SK-24", "SK-26"],
  "misconceptionTraps": ["MC-WHB-02"],
  "difficultyTier": "easy"
}

// Hard — the agree case (the speech-bubble claim is actually correct)
// included so the student cannot just always pick "disagree"
{
  "id": "q:frc:L7:0007",
  "type": "identify",
  "prompt": {
    "text": "Someone said: '1/3 is bigger than 1/8 because thirds are bigger than eighths.' Are they right?",
    "ttsKey": "tts.frc.l7.0007"
  },
  "payload": {
    "claim": {
      "left":  { "num": 1, "den": 3 },
      "right": { "num": 1, "den": 8 },
      "asserted": ">"
    },
    "options": ["agree", "disagree"]
  },
  "correctAnswer": { "judgement": "agree" },
  "validatorId": "validator.identify.flipRuleTwoStep",
  "skillIds": ["SK-24", "SK-26"],
  "misconceptionTraps": [],
  "difficultyTier": "hard"
}
```

**Authoring target:** 8 templates (3 easy, 3 medium, 2 hard). Approximately 70% should be "disagree" cases (the trap is wrong), 30% "agree" cases (the trap was actually correct reasoning) to prevent the student gaming the activity.

---

## 5. Misconceptions Detected at This Level

| MC ID | Name | Detection signal |
|-------|------|------------------|
| `MC-WHB-02` | "Whole-number bias on denominator" — student picks `1/4 > 1/3` because `4 > 3` | Wrong answer with the explicit pattern (larger denominator chosen as larger fraction) on `comparison_battle_same_num` Easy or Medium |
| `MC-INV-01` | "Inverse relationship not internalised" — student gets unit-fraction comparisons right when bars are visible but consistently wrong when symbolic-only | Accuracy gap > 30% between Medium (bars on miss) and Hard (bars only via hint) on `comparison_battle_same_num` |
| `MC-NUM-01` | "Non-unit numerator-bias" — student applies the same-numerator rule correctly to `1/3` vs `1/4` but fails on `2/3` vs `2/4` | Wrong on `comparison_battle_same_num` Hard non-unit items while correct on equivalent unit items |
| `MC-EQ-01` | (carried from L6) "Equal looks the same" | Wrong "=" on items where bar lengths are perceptually similar but not equal |

`MC-WHB-02` is the *flagship* misconception of this level. The intervention strategy (per `00-MASTER_PLAN.md` R-03) is the pre-emptive micro-lesson before the activity starts, plus the `flip_rule_check` activity, plus mandatory bar-model display on every wrong answer at Tier 1–2.

---

## 6. Fraction Pool

Per **C8**, Level 7 introduces sixths and eighths in the unit-fraction context. Non-unit sixths and eighths are *not* in the pool yet — they arrive at Level 8 (benchmark reasoning) and Level 9 (full ordering).

```json
[
  { "id": "frac:1/2", "numerator": 1, "denominator": 2, "decimalValue": 0.5,    "benchmark": "half",         "denominatorFamily": "halves"  },
  { "id": "frac:1/3", "numerator": 1, "denominator": 3, "decimalValue": 0.333,  "benchmark": "almost_half",  "denominatorFamily": "thirds"  },
  { "id": "frac:2/3", "numerator": 2, "denominator": 3, "decimalValue": 0.667,  "benchmark": "almost_half",  "denominatorFamily": "thirds"  },
  { "id": "frac:1/4", "numerator": 1, "denominator": 4, "decimalValue": 0.25,   "benchmark": "almost_zero",  "denominatorFamily": "fourths" },
  { "id": "frac:2/4", "numerator": 2, "denominator": 4, "decimalValue": 0.5,    "benchmark": "half",         "denominatorFamily": "fourths" },
  { "id": "frac:3/4", "numerator": 3, "denominator": 4, "decimalValue": 0.75,   "benchmark": "almost_one",   "denominatorFamily": "fourths" },
  { "id": "frac:1/6", "numerator": 1, "denominator": 6, "decimalValue": 0.167,  "benchmark": "almost_zero",  "denominatorFamily": "sixths"  },
  { "id": "frac:1/8", "numerator": 1, "denominator": 8, "decimalValue": 0.125,  "benchmark": "almost_zero",  "denominatorFamily": "eighths" }
]
```

Within a single same-numerator comparison, the two fractions must share a numerator. Across a session, all comparisons are same-numerator (mixed-denominator is the level's structural feature, not a session-level mix).

---

## 7. Advancement Criteria (Mastery Gate to Level 8)

A student unlocks Level 8 when **all** are true:

- `SkillMastery.state === "MASTERED"` for `SK-24` **and** `SK-25` (see `../skills.md`)
- `SkillMastery.state` for `SK-26` (resisting whole-number bias) is **at least** `"APPROACHING"`
- At most **one** `MC-WHB-02` flag in the last 8 attempts (the "approximately resolved" criterion from `00-MASTER_PLAN.md` §9 metrics)
- At least 20 attempts across at least 2 different activities at this level
- Tier 3 (Hard) accuracy ≥ 65% across the last 6 hard attempts (lower than L6's 70% because L7 is genuinely harder, and a student who reaches 65% Hard with no recent MC-WHB-02 flags has the schema)

The advancement bar for `SK-26` is intentionally `"APPROACHING"` not `"MASTERED"` — full mastery of "do not fall for the bias" is a multi-year process, and demanding it gates students out of Level 8 unnecessarily. What matters is that the student *recognises* the trap, which `"APPROACHING"` captures.

---

## 8. Estimated Session Time

Per **C9**:

- **Single session:** 11–14 minutes (slightly longer than L6 because the wrong-answer feedback loop with mandatory bar models is longer, and the unit-fraction ladder activity is naturally slower than a comparison battle)
- **Full level mastery:** 4–5 sessions across 3–4 days

Mastering `MC-WHB-02` typically requires more sessions than mastering a positive skill, because the misconception fires faster than the correction. Expect L7 to take ~1.3× the median time of L6.

---

## 9. Authoring Status

| Item | Required | Authored | Notes |
|------|----------|----------|-------|
| `comparison_battle_same_num` templates | 14 | 4 examples shown | Need 10 more |
| `unit_fraction_ladder` templates | 10 | 3 examples shown | Need 7 more |
| `flip_rule_check` templates | 8 | 2 examples shown | Need 6 more |
| Pre-activity micro-lesson scene | 1 (one-time per device) | 0 | 25 seconds; non-graded; salvage Maya pizza scene from `00-MASTER_PLAN.md` §6 narrative |
| TTS audio scripts | 32 | 0 | SpeechSynthesis API at runtime |
| Hint definitions | ~96 (3 per template) | 0 | TBD |
| Validator function specs | 3 | High-level only | `flipRuleTwoStep` is new — needs careful spec, two-state machine |

---

## 10. Open Questions for Level 7

1. **Pre-emptive vs reactive misconception treatment.** The micro-lesson scene runs before the first activity attempt. An alternative is to skip it and only show it after the student first answers wrong. Pre-emptive primes the rule and may reduce wrong attempts; reactive lets the misconception surface so the student feels its correction. Recommended for MVP: pre-emptive, because validation playtest sessions are short and we need accurate first-attempt data.

2. **Should `flip_rule_check` give partial credit on the agree/disagree step?** A student might disagree (correct judgement) but then tap the wrong side in the correction step. Currently the validator requires both right. Recommended: yes, require both; partial credit dilutes the metacognitive signal.

3. **Sevenths and ninths.** The same-numerator rule extends naturally to sevenths and ninths (e.g., `1/7` vs `1/9`), but C8 keeps denominators to 2/3/4/6/8 in MVP scope. Should L7 include `1/7` or `1/9` as out-of-scope-but-instructive cases? Recommended: no; stay strict on C8. Sevenths appear post-MVP.

4. **Equal pairs in same-numerator comparisons.** Two fractions with the same numerator are equal only if their denominators are equal (e.g., `2/3 = 2/3`), which is trivial. Should the `=` button appear at all in `comparison_battle_same_num`? Recommended: yes, occasionally (10% of items have answer `=` via identical pairs), for consistency with L6's UI and to keep the student honest about reading both fractions.
