---
title: Level 9 — Order 3+ Fractions (Mastery Capstone)
status: draft
owner: solo
last_reviewed: 2026-04-25
applies_to: [mvp]
constraint_refs: [C3, C8, C9, C10]
related: [../scope-and-sequence.md, ../../30-architecture/data-schema.md, level-08.md, ../../50-roadmap/mvp-l1-l9.md]
---

# Level 9 — Order 3+ Fractions

The MVP capstone. Goal: given three to five fractions with mixed denominators, **order them from smallest to largest** (or largest to smallest), correctly, without scaffolding. Mastery here is the answer to **C10**'s validation question — a student who can do Level 9 has demonstrated genuine fraction magnitude understanding.

The single source archetype is `RoadMap/03_Level_06_09/03-FractionOrderingTournament.md`. The full mechanic spec — the drag-sort UI, the model toggle, the tie-breaking system, the progressive feedback engine — is reused verbatim, narrowed to MVP scope (no Tournament Mode, no Speed Round, no leaderboards — those are post-MVP per C2/C10).

Per **C8**, Level 9 fully exploits mixed denominators within and across items. There is no remaining scaffolding around denominator family. Per **C10**, this level is intentionally hard — playtest validation succeeds only when students **without** the app cannot do Level 9 tasks on a paper test, and students **with** the app can.

---

## 1. Learning Goals

By the end of Level 9, the student can:

- **G9.1** — Order three fractions with mixed denominators from smallest to largest
- **G9.2** — Order four or five fractions with mixed denominators in either direction (smallest-first or largest-first, as prompted)
- **G9.3** — Recognise equivalent fractions during ordering (e.g., `1/2` and `2/4` are interchangeable in the sequence) and use the "either order accepted" rule
- **G9.4** — Apply benchmark reasoning (`SK-29` from L8) **as a strategy** during ordering: identify the fractions near 0, near 1/2, near 1, then order within each cluster
- **G9.5** — Articulate, when prompted, *why* one fraction is larger than another using one of the rules learned in L6 (same-denominator), L7 (same-numerator), or L8 (benchmark)

The level does **not** require the student to compute common denominators, perform fraction arithmetic, or work with improper fractions. All four are post-MVP per **C3**.

---

## 2. Skills Tracked

See `../skills.md` for canonical definitions. (audit §1.1 fix — former SK-19..SK-22 renumbered SK-30..SK-33 to be sequential after L8's SK-27..SK-29)

| Skill ID | Name | BKT priors |
|----------|------|------------|
| `SK-30` | Order 3 fractions, mixed denominators | `pInit=0.10, pTransit=0.20, pSlip=0.15, pGuess=0.17` |
| `SK-31` | Order 4–5 fractions, mixed denominators | `pInit=0.05, pTransit=0.15, pSlip=0.20, pGuess=0.04` |
| `SK-32` | Equivalent-fraction recognition during ordering | `pInit=0.10, pTransit=0.20, pSlip=0.15, pGuess=0.10` |
| `SK-33` | Strategy: benchmark-cluster-then-order | `pInit=0.05, pTransit=0.20, pSlip=0.15, pGuess=0.10` |

`pGuess` for `SK-30` is `0.17` (= 1/6, since there are 6 permutations of 3 cards). `pGuess` for `SK-31` is `0.04` (= 1/24 for 4 cards; for 5 cards it would be 1/120 ≈ 0.008, averaged here). These low guess priors reflect that ordering tasks are nearly impossible to fluke.

`SK-33` is a **strategy** skill — observed when a student's drag pattern shows them placing a benchmark fraction (one near 1/2, say) first, then placing other fractions relative to it. The progression engine detects this from the drag-event sequence (see `RoadMap/03_Level_06_09/03-FractionOrderingTournament.md` §4 `evaluateCurrentOrder`).

Mastery of `SK-30` **and** `SK-31` at `state: "MASTERED"`, with `SK-32` and `SK-33` at least `"APPROACHING"`, signals the student has completed the MVP curriculum. There is no Level 10 in MVP.

---

## 3. Standards Crosswalk (informational)

| Standard | Coverage |
|----------|----------|
| **CCSS.3.NF.A.3.d** (compare fractions by reasoning about their size; record the results of comparisons with the symbols `<`, `=`, `>`) | **Primary, full coverage** |
| **CCSS.3.NF.A.3.b** (recognise simple equivalent fractions, e.g., `1/2 = 2/4`) | Touched (the equivalence-during-ordering pattern in `SK-32`) |
| **CCSS.4.NF.A.2** (compare two fractions with different numerators and different denominators) | Anticipatory — Level 9 demands this skill informally, even though the standard is officially Grade 4 |

The Grade 4 anticipatory coverage is intentional and defensible: the validation question (**C10**) is about whether the mechanic can teach the *concept* of magnitude, and the concept does not respect grade boundaries. Students who cannot order mixed-denominator fractions have not learned magnitude in any meaningful sense.

---

## 4. Activities at This Level

Three core activities. Each session uses one activity; full level mastery requires all three.

### 4.1 Activity: `ordering_tournament_3` (mechanic: order)

**Slug:** `ordering_tournament_3`
**Mechanic:** order
**Title:** "Line Them Up — 3 Fractions"
**Levels in app:** L9 only (this activity owns the 3-card variant; the 4–5-card variant lives in 4.2)

The student sees 3 fraction cards in a shuffled tray and 3 numbered slots below labelled "1 (smallest)" through "3 (largest)" — or the reverse, "1 (largest)" through "3 (smallest)" depending on the prompt direction. They drag each card into a slot. The "Check!" button enables once all slots are filled.

The full UI spec — card sizes, drag/lift animations, swap behaviour, ghost placeholder — comes from `RoadMap/03_Level_06_09/03-FractionOrderingTournament.md` §2. The model toggle (Pies / Bars / Line / Off) is available at all tiers, but the default model is set per tier per the source doc §3.

#### Difficulty tiers

| Tier | Default model | Direction prompt | Feedback verbosity | Hint budget |
|------|--------------|------------------|--------------------|-------------|
| Easy | Bars on | Smallest → Largest only | Verbose (per-slot as placed) | 3 |
| Medium | Off (toggle available) | Mixed direction | Summary only (after Check!) | 2 |
| Hard | Off | Mixed direction | "Correct" / "Try again" only | 1 |

#### Question template archetype

**Type:** `ordering`
**Payload shape:** `{ cards: [{ num, den }, ...], direction: "ascending"|"descending", defaultModel: "pies"|"bars"|"line"|"off", modelToggleEnabled: boolean }`
**Correct answer shape:** `[{ num, den }, ...]` (the cards in the canonical order; the validator accepts permutations of equivalent cards)
**Validator:** `validator.ordering.acceptableOrders`

The validator implements the `buildAcceptableOrders` function from the source doc §5 — if the set contains equivalent fractions, all orderings that maintain non-equivalent fractions in correct relative order are accepted.

#### Sample templates (3 of 12 needed)

```jsonc
{
  "id": "q:ot3:L9:0001",
  "type": "ordering",
  "prompt": { "text": "Line them up from smallest to largest.", "ttsKey": "tts.ot3.l9.0001" },
  "payload": {
    "cards": [
      { "num": 3, "den": 4 },
      { "num": 1, "den": 4 },
      { "num": 1, "den": 2 }
    ],
    "direction": "ascending",
    "defaultModel": "bars",
    "modelToggleEnabled": true
  },
  "correctAnswer": [
    { "num": 1, "den": 4 },
    { "num": 1, "den": 2 },
    { "num": 3, "den": 4 }
  ],
  "validatorId": "validator.ordering.acceptableOrders",
  "skillIds": ["SK-30"],
  "misconceptionTraps": ["MC-WHB-01"],
  "difficultyTier": "easy"
}

// Medium — equivalence during ordering: 1/2 = 2/4 are interchangeable
{
  "id": "q:ot3:L9:0006",
  "type": "ordering",
  "prompt": { "text": "Line them up from smallest to largest.", "ttsKey": "tts.ot3.l9.0006" },
  "payload": {
    "cards": [
      { "num": 2, "den": 4 },
      { "num": 1, "den": 2 },
      { "num": 3, "den": 4 }
    ],
    "direction": "ascending",
    "defaultModel": "off",
    "modelToggleEnabled": true
  },
  "correctAnswer": [
    { "num": 1, "den": 2 },
    { "num": 2, "den": 4 },
    { "num": 3, "den": 4 }
  ],
  "validatorId": "validator.ordering.acceptableOrders",
  "skillIds": ["SK-30", "SK-32"],
  "misconceptionTraps": [],
  "difficultyTier": "medium"
}

// Hard — descending direction, mixed denominators, no model
{
  "id": "q:ot3:L9:0010",
  "type": "ordering",
  "prompt": { "text": "Line them up from largest to smallest.", "ttsKey": "tts.ot3.l9.0010" },
  "payload": {
    "cards": [
      { "num": 1, "den": 6 },
      { "num": 5, "den": 8 },
      { "num": 1, "den": 3 }
    ],
    "direction": "descending",
    "defaultModel": "off",
    "modelToggleEnabled": false
  },
  "correctAnswer": [
    { "num": 5, "den": 8 },
    { "num": 1, "den": 3 },
    { "num": 1, "den": 6 }
  ],
  "validatorId": "validator.ordering.acceptableOrders",
  "skillIds": ["SK-30", "SK-33"],
  "misconceptionTraps": ["MC-WHB-02"],
  "difficultyTier": "hard"
}
```

**Authoring target:** 12 templates (4 easy, 5 medium, 3 hard).

---

### 4.2 Activity: `ordering_tournament_5` (mechanic: order)

**Slug:** `ordering_tournament_5`
**Mechanic:** order
**Title:** "The Long Line — 4 or 5 Fractions"
**Levels in app:** L9 only

Same UI and mechanic as `ordering_tournament_3`, but with 4 or 5 cards and slots. This is where `SK-33` (benchmark-cluster strategy) becomes load-bearing — at 5 cards, exhaustive pairwise comparison is too slow even at Easy tier, and the student is naturally pushed toward strategic reasoning.

The number-line model view becomes especially valuable here per the source doc §3 ("Implicit feedback from number line"): when the student places cards in approximately-correct order, the dots on the line connect with a green segment, providing real-time positive feedback without explicit messaging.

#### Difficulty tiers

| Tier | Card count | Default model | Spread (decimal) | Hint budget |
|------|-----------|---------------|------------------|-------------|
| Easy | 4 cards | Bars on | Wide spread (min adjacent gap ≥ 0.10) | 3 |
| Medium | 4 cards | Off (toggle available) | Medium spread (min adjacent gap ≥ 0.07) | 2 |
| Hard | 5 cards | Off | Tight spread (min adjacent gap ≥ 0.05); includes one equivalence pair in ~25% of items | 1 |

The spread parameters come directly from the source doc §8 generation table, restricted to MVP-pool denominators.

#### Question template archetype

**Type:** `ordering`
**Payload shape:** identical to `ordering_tournament_3`, but `cards.length` is 4 or 5
**Correct answer shape:** identical (an array of fractions; equivalent permutations accepted by validator)
**Validator:** `validator.ordering.acceptableOrders`

#### Sample templates (4 of 14 needed)

```jsonc
{
  "id": "q:ot5:L9:0001",
  "type": "ordering",
  "prompt": { "text": "Line up all 4 from smallest to largest.", "ttsKey": "tts.ot5.l9.0001" },
  "payload": {
    "cards": [
      { "num": 1, "den": 8 },
      { "num": 1, "den": 4 },
      { "num": 1, "den": 2 },
      { "num": 3, "den": 4 }
    ],
    "direction": "ascending",
    "defaultModel": "bars",
    "modelToggleEnabled": true
  },
  "correctAnswer": [
    { "num": 1, "den": 8 },
    { "num": 1, "den": 4 },
    { "num": 1, "den": 2 },
    { "num": 3, "den": 4 }
  ],
  "validatorId": "validator.ordering.acceptableOrders",
  "skillIds": ["SK-30", "SK-31"],
  "misconceptionTraps": ["MC-WHB-02"],
  "difficultyTier": "easy"
}

// Medium — 4 cards, mixed denominator families
{
  "id": "q:ot5:L9:0005",
  "type": "ordering",
  "prompt": { "text": "Line up all 4 from smallest to largest.", "ttsKey": "tts.ot5.l9.0005" },
  "payload": {
    "cards": [
      { "num": 1, "den": 6 },
      { "num": 1, "den": 3 },
      { "num": 2, "den": 3 },
      { "num": 5, "den": 6 }
    ],
    "direction": "ascending",
    "defaultModel": "off",
    "modelToggleEnabled": true
  },
  "correctAnswer": [
    { "num": 1, "den": 6 },
    { "num": 1, "den": 3 },
    { "num": 2, "den": 3 },
    { "num": 5, "den": 6 }
  ],
  "validatorId": "validator.ordering.acceptableOrders",
  "skillIds": ["SK-31", "SK-33"],
  "misconceptionTraps": [],
  "difficultyTier": "medium"
}

// Hard — 5 cards, no model
{
  "id": "q:ot5:L9:0011",
  "type": "ordering",
  "prompt": { "text": "Line up all 5 from smallest to largest.", "ttsKey": "tts.ot5.l9.0011" },
  "payload": {
    "cards": [
      { "num": 1, "den": 4 },
      { "num": 3, "den": 8 },
      { "num": 1, "den": 2 },
      { "num": 5, "den": 8 },
      { "num": 7, "den": 8 }
    ],
    "direction": "ascending",
    "defaultModel": "off",
    "modelToggleEnabled": false
  },
  "correctAnswer": [
    { "num": 1, "den": 4 },
    { "num": 3, "den": 8 },
    { "num": 1, "den": 2 },
    { "num": 5, "den": 8 },
    { "num": 7, "den": 8 }
  ],
  "validatorId": "validator.ordering.acceptableOrders",
  "skillIds": ["SK-31", "SK-33"],
  "misconceptionTraps": [],
  "difficultyTier": "hard"
}

// Hard — 5 cards with an equivalence pair (3/6 = 1/2)
{
  "id": "q:ot5:L9:0013",
  "type": "ordering",
  "prompt": { "text": "Line up all 5 from smallest to largest.", "ttsKey": "tts.ot5.l9.0013" },
  "payload": {
    "cards": [
      { "num": 1, "den": 6 },
      { "num": 3, "den": 6 },
      { "num": 1, "den": 2 },
      { "num": 2, "den": 3 },
      { "num": 5, "den": 6 }
    ],
    "direction": "ascending",
    "defaultModel": "off",
    "modelToggleEnabled": false
  },
  "correctAnswer": [
    { "num": 1, "den": 6 },
    { "num": 1, "den": 2 },
    { "num": 3, "den": 6 },
    { "num": 2, "den": 3 },
    { "num": 5, "den": 6 }
  ],
  "validatorId": "validator.ordering.acceptableOrders",
  "skillIds": ["SK-31", "SK-32", "SK-33"],
  "misconceptionTraps": ["MC-EQ-02"],
  "difficultyTier": "hard"
}
```

The last template's validator accepts both `[1/6, 1/2, 3/6, 2/3, 5/6]` and `[1/6, 3/6, 1/2, 2/3, 5/6]` because the equivalent group `{1/2, 3/6}` can appear in either order between the non-equivalent neighbours.

**Authoring target:** 14 templates (4 easy, 6 medium, 4 hard).

---

### 4.3 Activity: `explain_your_order` (mechanic: order + identify)

**Slug:** `explain_your_order`
**Mechanic:** order (with secondary identify)
**Title:** "How Did You Decide?"
**Levels in app:** L9 only

After the student successfully orders a 3- or 4-card sequence, this activity asks **why**. A multiple-choice prompt appears asking the student to pick the rule they used: "Same bottom — bigger top wins" / "Same top — bigger bottom is smaller" / "Used the half-line idea" / "Compared to 0 and 1." This is the metacognitive activity for the level — directly trains `G9.5` and produces evidence of `SK-33` for the mastery gate.

The pedagogical rationale (per `RoadMap/03_Level_06_09/04-FractionStoryProblems.md` §1 point 4) is that articulating reasoning consolidates conceptual understanding and exposes shallow guess-correct attempts that pure correctness data cannot detect.

This activity is **gated**: it only runs after the student gets the ordering step right. A student who can't order can't explain — the explanation step is reserved for confirmed-correct orderings.

#### Difficulty tiers

| Tier | Ordering pre-step | Rule options offered | Hint budget |
|------|------------------|---------------------|-------------|
| Easy | 3 cards, all same denominator | 2 rule choices (correct + 1 distractor) | 2 |
| Medium | 3 cards, mixed denominator | 3 rule choices | 1 |
| Hard | 4 cards, mixed denominator with one benchmark cue | 4 rule choices (all four rule families above) | 0 |

#### Question template archetype

**Type:** `ordering` (with embedded post-step `identify`)
**Payload shape:**
```
{
  cards: [{ num, den }, ...],
  direction: "ascending"|"descending",
  postStep: {
    prompt: string,
    options: ("same_denom_rule"|"same_numer_rule"|"benchmark_half"|"benchmark_zero_one")[],
    correctRule: "same_denom_rule"|"same_numer_rule"|"benchmark_half"|"benchmark_zero_one"
  }
}
```
**Correct answer shape:** `{ ordering: [{ num, den }, ...], rule: string }`
**Validator:** `validator.ordering.withRuleExplanation`

#### Sample templates (2 of 8 needed)

```jsonc
{
  "id": "q:eyo:L9:0001",
  "type": "ordering",
  "prompt": { "text": "Line them up smallest to largest, then tell me how you knew.", "ttsKey": "tts.eyo.l9.0001" },
  "payload": {
    "cards": [
      { "num": 1, "den": 4 },
      { "num": 3, "den": 4 },
      { "num": 2, "den": 4 }
    ],
    "direction": "ascending",
    "postStep": {
      "prompt": "How did you know the order?",
      "options": ["same_denom_rule", "same_numer_rule"],
      "correctRule": "same_denom_rule"
    }
  },
  "correctAnswer": {
    "ordering": [
      { "num": 1, "den": 4 },
      { "num": 2, "den": 4 },
      { "num": 3, "den": 4 }
    ],
    "rule": "same_denom_rule"
  },
  "validatorId": "validator.ordering.withRuleExplanation",
  "skillIds": ["SK-30", "SK-33"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

{
  "id": "q:eyo:L9:0006",
  "type": "ordering",
  "prompt": { "text": "Line them up smallest to largest, then tell me how you knew.", "ttsKey": "tts.eyo.l9.0006" },
  "payload": {
    "cards": [
      { "num": 1, "den": 8 },
      { "num": 3, "den": 8 },
      { "num": 5, "den": 8 },
      { "num": 7, "den": 8 }
    ],
    "direction": "ascending",
    "postStep": {
      "prompt": "How did you know the order?",
      "options": ["same_denom_rule", "same_numer_rule", "benchmark_half", "benchmark_zero_one"],
      "correctRule": "same_denom_rule"
    }
  },
  "correctAnswer": {
    "ordering": [
      { "num": 1, "den": 8 },
      { "num": 3, "den": 8 },
      { "num": 5, "den": 8 },
      { "num": 7, "den": 8 }
    ],
    "rule": "same_denom_rule"
  },
  "validatorId": "validator.ordering.withRuleExplanation",
  "skillIds": ["SK-30", "SK-33"],
  "misconceptionTraps": [],
  "difficultyTier": "hard"
}
```

**Authoring target:** 8 templates (3 easy, 3 medium, 2 hard).

---

## 5. Misconceptions Detected at This Level

| MC ID | Name | Detection signal |
|-------|------|------------------|
| `MC-WHB-01` | (carried) "Whole-number bias on numerator" | Wrong relative position of cards where the larger numerator is placed later in the ascending order regardless of denominator |
| `MC-WHB-02` | (carried) "Whole-number bias on denominator" | Wrong relative position of cards where the larger-denominator unit fraction is placed later in ascending order |
| `MC-EQ-02` | (carried) "Equal benchmarks unrecognised" | In `ordering_tournament_5` Hard with equivalence pair: student places one of the equal cards far from the other, resulting in a wrong ordering even though the validator would have accepted either equivalent permutation |
| `MC-PRX-01` | (carried) "Proximity-to-1 confusion" | `5/6` or `7/8` placed before `1/2` in ascending order |
| `MC-STRAT-01` | "No strategy" — student drag-pattern shows trial and error rather than benchmark-cluster strategy | `SK-33` mastery state stays `"NOT_STARTED"` despite `SK-30` and `SK-31` reaching `"LEARNING"` or higher |

`MC-STRAT-01` is the only Level-9-original misconception. Its detection is via the drag-pattern signal: a strategic student picks up a benchmark fraction first and places it; an unstrategic student picks up cards in tray order and tests them against slot 1, then 2, etc. The progression engine reads the `roundEvents` array on the Attempt record (sequence of pickUp/place events) to compute this.

---

## 6. Fraction Pool

The full Level 9 pool is the union of all earlier levels' pools — every fraction in the MVP. Per **C8** there are no further denominator family restrictions.

```json
[
  { "id": "frac:1/2", "numerator": 1, "denominator": 2, "decimalValue": 0.5,    "benchmark": "half",         "denominatorFamily": "halves"  },
  { "id": "frac:1/3", "numerator": 1, "denominator": 3, "decimalValue": 0.333,  "benchmark": "almost_half",  "denominatorFamily": "thirds"  },
  { "id": "frac:2/3", "numerator": 2, "denominator": 3, "decimalValue": 0.667,  "benchmark": "almost_half",  "denominatorFamily": "thirds"  },
  { "id": "frac:1/4", "numerator": 1, "denominator": 4, "decimalValue": 0.25,   "benchmark": "almost_zero",  "denominatorFamily": "fourths" },
  { "id": "frac:2/4", "numerator": 2, "denominator": 4, "decimalValue": 0.5,    "benchmark": "half",         "denominatorFamily": "fourths" },
  { "id": "frac:3/4", "numerator": 3, "denominator": 4, "decimalValue": 0.75,   "benchmark": "almost_one",   "denominatorFamily": "fourths" },
  { "id": "frac:1/6", "numerator": 1, "denominator": 6, "decimalValue": 0.167,  "benchmark": "almost_zero",  "denominatorFamily": "sixths"  },
  { "id": "frac:2/6", "numerator": 2, "denominator": 6, "decimalValue": 0.333,  "benchmark": "almost_half",  "denominatorFamily": "sixths"  },
  { "id": "frac:3/6", "numerator": 3, "denominator": 6, "decimalValue": 0.5,    "benchmark": "half",         "denominatorFamily": "sixths"  },
  { "id": "frac:4/6", "numerator": 4, "denominator": 6, "decimalValue": 0.667,  "benchmark": "almost_half",  "denominatorFamily": "sixths"  },
  { "id": "frac:5/6", "numerator": 5, "denominator": 6, "decimalValue": 0.833,  "benchmark": "almost_one",   "denominatorFamily": "sixths"  },
  { "id": "frac:1/8", "numerator": 1, "denominator": 8, "decimalValue": 0.125,  "benchmark": "almost_zero",  "denominatorFamily": "eighths" },
  { "id": "frac:3/8", "numerator": 3, "denominator": 8, "decimalValue": 0.375,  "benchmark": "almost_half",  "denominatorFamily": "eighths" },
  { "id": "frac:4/8", "numerator": 4, "denominator": 8, "decimalValue": 0.5,    "benchmark": "half",         "denominatorFamily": "eighths" },
  { "id": "frac:5/8", "numerator": 5, "denominator": 8, "decimalValue": 0.625,  "benchmark": "almost_half",  "denominatorFamily": "eighths" },
  { "id": "frac:7/8", "numerator": 7, "denominator": 8, "decimalValue": 0.875,  "benchmark": "almost_one",   "denominatorFamily": "eighths" }
]
```

The `2/8` and `6/8` fractions are not in the pool because they would create three-way equivalence groups (`1/4 = 2/8`, `3/4 = 6/8`) that the source doc §11 case C identifies as a special case reserved for "equivalence focus" rounds — and those are out of MVP scope per **C3**.

---

## 7. Advancement Criteria (MVP Completion)

Level 9 is the last MVP level. There is no Level 10 to unlock. "Mastery" of Level 9 is the **MVP completion signal** that feeds the validation analysis (per **C10** and `40-validation/playtest-protocol.md`, TBD).

A student is marked **MVP-complete** when **all** are true:

- `SkillMastery.state === "MASTERED"` for `SK-30` **and** `SK-31` (see `../skills.md`)
- `SkillMastery.state` for `SK-32` and `SK-33` is **at least** `"APPROACHING"`
- At least 30 attempts across all three Level 9 activities
- Tier 3 (Hard) accuracy ≥ 65% across the last 8 hard attempts (lower threshold than L8's 70% because Hard L9 is genuinely difficult — 5-card mixed-denominator ordering is a Grade 4 standard)
- At least one `explain_your_order` attempt at Hard tier with the correct rule selected

The MVP-complete event triggers a one-time celebration scene (Quex the dragon — see `RoadMap/03_Level_06_09/00-MASTER_PLAN.md` §6) and a `ProgressionStat.totalSessions` snapshot is taken for playtest analysis. No further levels open.

---

## 8. Estimated Session Time

Per **C9**:

- **Single session:** 12–15 minutes (ordering activities are slow per item — ~6–8 ordering items in a session — but high cognitive density)
- **Full level mastery:** 5–8 sessions across 4–6 days

Level 9 is the longest mastery horizon in the MVP. A 6-week classroom playtest at 3 sessions per week (per `00-MASTER_PLAN.md` §3) gives a student ~18 sessions, of which the last ~6–8 are expected to be on Level 9.

---

## 9. Authoring Status

| Item | Required | Authored | Notes |
|------|----------|----------|-------|
| `ordering_tournament_3` templates | 12 | 3 examples shown | Need 9 more |
| `ordering_tournament_5` templates | 14 | 4 examples shown | Need 10 more |
| `explain_your_order` templates | 8 | 2 examples shown | Need 6 more |
| TTS audio scripts | 34 | 0 | SpeechSynthesis API at runtime |
| Hint definitions | ~102 (3 per template) | 0 | TBD; for ordering use the three-tier hint system from source doc §9 (number-line auto-show / swap suggestion / direct reveal) |
| Validator function specs | 2 (3 with `withRuleExplanation`) | High-level only | `acceptableOrders` validator must implement `buildAcceptableOrders` from source §5; `withRuleExplanation` is a composite validator |
| Drag-sort UI component | 1 | 0 | Reuse spec from `03-FractionOrderingTournament.md` §2 |
| Number-line model component | 1 | 0 | Shared with L8 `magnitude_scales` — implement once, use in both |
| MVP-completion celebration scene | 1 | 0 | One-time per student per device; salvage Quex narrative beat from `00-MASTER_PLAN.md` §6 week-6 |

---

## 10. Open Questions for Level 9

1. **Tournament Mode and Speed Round.** The source doc §10 and §7 define competitive multi-round formats. These are out of scope per **C2** (no leaderboards or competitive surface) and **C10** (validation does not need them). Confirm: yes, drop entirely from MVP — even single-player Speed Round, because the timer pressure compromises validation data. Revisit post-MVP.

2. **Equivalence ordering at L9 vs L7's `unit_fraction_ladder`.** L7's ladder is unit-fractions only. L9's `ordering_tournament_5` Hard includes equivalence pairs like `1/2 = 3/6`. Is there a level between (L7 to L8) where non-unit equivalence is introduced more gently? Recommended: handle in `benchmark_battle` at L8 (via the equal-to-1/2 button) and `three_zone_sort` at L8 (where `2/4` lands in the same zone as `1/2`). The L7 → L8 → L9 progression on equivalence is therefore: name `1/2`'s synonyms (L8) → use them in ordering (L9).

3. **MVP-complete state and re-entry.** A student reaches MVP-complete. They open the app the next day. What do they see? Options: (a) Level 9 activities remain open as practice; (b) all activities including L1–L8 remain open as review; (c) a "you're done!" splash with no further play. Recommended: (a) plus (b) — Level 9 stays as the default-open level, but a "review past levels" menu lets them revisit anything. No "you're done" wall — that creates an artificial end and undercuts continued practice.

4. **Validator computational cost.** The `acceptableOrders` validator generates all permutations of equivalence groups. With a 5-card set containing two equivalence pairs (theoretical worst case, even though our pool prevents it), that is `2! × 2! = 4` orderings — fine. With three equivalent cards (also blocked by our pool) it would be `3! = 6` — still fine. Confirm: no cost concern at MVP scale, no need for the `curatedSets` fallback in the source doc §8.

5. **Strategy detection signal.** `MC-STRAT-01` is detected by drag-pattern analysis. The Attempt record needs a `roundEvents` array (see `data-schema.md` §3.3 — currently the schema does not have this field). This is a **schema change** required before L9 can ship its full progression engine. Action: add `roundEvents?: ProgressionEvent[]` as an **optional** field on Attempt before L9 implementation begins; fall back to no-strategy-detection if absent. The MVP can ship L9 without `MC-STRAT-01` detection if the schema change slips.
