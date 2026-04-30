---
title: Level 8 — Benchmarks (0, 1/2, 1)
status: draft
owner: solo
last_reviewed: 2026-04-25
applies_to: [mvp]
constraint_refs: [C3, C8, C9]
related: [../scope-and-sequence.md, ../../30-architecture/data-schema.md, level-07.md, level-09.md]
---

# Level 8 — Benchmarks (0, 1/2, 1)

The level where the student stops comparing pairs and starts **placing fractions in space**. Goal: develop the mental number line. The three anchors are **0**, **1/2**, and **1**. Every fraction in the MVP pool gets categorised: closer to 0, closer to 1/2, or closer to 1.

This is also the level where two new skills come online: **number-line placement** (drag a card to a position on a 0–1 line) and **benchmark proximity reasoning** (does this fraction live in the blue zone or the orange zone?). Both skills are direct prerequisites for the ordering work in Level 9 and for the operations work that comes post-MVP in Grade 3.

The two source documents are `RoadMap/03_Level_06_09/01-FractionMagnitudeScales.md` (the number-line placement archetype) and `RoadMap/03_Level_06_09/02-FractionBenchmarkBattle.md` (the benchmark sort archetype). Both survive into the MVP at this level.

Per **C8**, mixed-denominator fractions appear freely from Level 6 onwards; this level fully exploits that licence — sorting `3/8` against `1/2` requires reasoning across denominator families.

---

## 1. Learning Goals

By the end of Level 8, the student can:

- **G8.1** — Place a single fraction on a 0–1 number line at the approximately correct position (within one snap interval, per `01-FractionMagnitudeScales.md` §5)
- **G8.2** — Sort fractions into three zones: closer to 0, closer to 1/2, closer to 1
- **G8.3** — Identify whether a fraction is **bigger than 1/2**, **smaller than 1/2**, or **equal to 1/2** without computing decimals
- **G8.4** — Apply the rule "a fraction `a/b` is bigger than 1/2 when `a > b/2`" (the benchmark rule from `02-FractionBenchmarkBattle.md` §2)
- **G8.5** — Recognise that `2/4`, `3/6`, `4/8` all equal `1/2` (visual confirmation only — no formal equivalence proof yet)

The level does **not** require the student to order three or more fractions (Level 9), nor to compare two fractions whose benchmarks are the same (also Level 9, where the question becomes "two fractions both close to 1/2 — which is bigger?").

---

## 2. Skills Tracked

See `../skills.md` for canonical definitions. (audit §1.1 fix — former SK-16/SK-17/SK-18 at L8 collided with L5 IDs; renumbered SK-27/SK-28/SK-29)

| Skill ID | Name                                             | BKT priors                                           |
| -------- | ------------------------------------------------ | ---------------------------------------------------- |
| `SK-27`  | Number-line placement (single fraction on 0–1)   | `pInit=0.15, pTransit=0.20, pSlip=0.15, pGuess=0.10` |
| `SK-28`  | Benchmark proximity sorting (zones: 0, 1/2, 1)   | `pInit=0.20, pTransit=0.25, pSlip=0.10, pGuess=0.33` |
| `SK-29`  | Benchmark 1/2 rule (`a > b/2` → bigger than 1/2) | `pInit=0.10, pTransit=0.25, pSlip=0.15, pGuess=0.33` |

The `pGuess` of `0.10` on `SK-27` reflects that random placement on a continuous line is unlikely to land within snap tolerance of the target. By contrast `SK-28` and `SK-29` both have ternary outcomes (`pGuess=0.33`).

`SK-27`, `SK-28`, and `SK-29` all carry forward to Level 9. Mastery of all three at `state: "MASTERED"` is the gate to unlock Level 9.

---

## 3. Standards Crosswalk (informational)

| Standard                                                                                                               | Coverage                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **CCSS.2.NF.A.2** (understand a fraction as a number on the number line; represent fractions on a number line diagram) | **Primary**                                                                |
| **CCSS.3.NF.A.2** (represent a fraction `a/b` on a number line diagram)                                                | **Primary** (Grade 3 standard introduced early per `00-MASTER_PLAN.md` §1) |
| **CCSS.3.NF.A.3.d** (compare fractions by reasoning about their size, including using benchmarks)                      | Reinforced (the benchmark strategy is named here)                          |

---

## 4. Activities at This Level

Three core activities. Each session uses one activity; a full level pass touches all three at least once.

### 4.1 Activity: `magnitude_scales` (mechanic: benchmark)

**Slug:** `magnitude_scales`
**Mechanic:** benchmark (a placement variant)
**Title:** "Where Does It Go?"
**Levels in app:** L8 only at MVP scope (Levels 1–5 of the source design doc map to L8 difficulty tiers Easy/Medium/Hard)

The canonical archetype from `RoadMap/03_Level_06_09/01-FractionMagnitudeScales.md`. The student drags a fraction card onto a 0–1 number line. The line is rendered as an SVG with major ticks at 0, 1/2, 1 (always labelled), and zone bands (left = blue, right = orange) to prime benchmark reasoning. Snap tolerance is wide at Easy tier (denominator-8 grid) and tightens through Hard (denominator-12 grid).

The full mechanic spec — pointer events, ghost preview, direction tooltip, snap-grid math, validation thresholds (`EXACT` / `CLOSE` / `WRONG`) — lives in the source design doc. The MVP implementation reuses that spec verbatim, narrowed to the L8 fraction pool.

#### Difficulty tiers

| Tier   | Tick visibility                                                    | Color zones         | Snap denominator | Hint budget |
| ------ | ------------------------------------------------------------------ | ------------------- | ---------------- | ----------- |
| Easy   | All major ticks (0, 1/4, 1/2, 3/4, 1) labelled; minor ticks at 1/8 | Full opacity 0.4    | 8                | 3           |
| Medium | Major ticks (0, 1/2, 1) only                                       | Reduced opacity 0.2 | 12               | 2           |
| Hard   | Endpoints (0, 1) only                                              | Removed             | 12               | 1           |

#### Question template archetype

**Type:** `placement`
**Payload shape:** `{ fraction: { num, den }, lineConfig: { tickLevels: ("major"|"minor"|"endpoints")[], showZones: boolean }, snapDenominator: number, areaTolerance: number }`
**Correct answer shape:** `number` (the target decimal, 0.0 to 1.0)
**Validator:** `validator.placement.snapTolerance`

#### Sample templates (3 of 12 needed)

```jsonc
{
  "id": "q:ms:L8:0001",
  "type": "placement",
  "prompt": { "text": "Where does 1/2 go on the number line?", "ttsKey": "tts.ms.l8.0001" },
  "payload": {
    "fraction": { "num": 1, "den": 2 },
    "lineConfig": { "tickLevels": ["major", "minor"], "showZones": true },
    "snapDenominator": 8,
    "areaTolerance": 0.0625
  },
  "correctAnswer": 0.5,
  "validatorId": "validator.placement.snapTolerance",
  "skillIds": ["SK-27"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

{
  "id": "q:ms:L8:0006",
  "type": "placement",
  "prompt": { "text": "Where does 3/8 go on the number line?", "ttsKey": "tts.ms.l8.0006" },
  "payload": {
    "fraction": { "num": 3, "den": 8 },
    "lineConfig": { "tickLevels": ["major"], "showZones": true },
    "snapDenominator": 12,
    "areaTolerance": 0.0833
  },
  "correctAnswer": 0.375,
  "validatorId": "validator.placement.snapTolerance",
  "skillIds": ["SK-27", "SK-29"],
  "misconceptionTraps": ["MC-PRX-01"],
  "difficultyTier": "medium"
}

{
  "id": "q:ms:L8:0011",
  "type": "placement",
  "prompt": { "text": "Where does 5/6 go on the number line?", "ttsKey": "tts.ms.l8.0011" },
  "payload": {
    "fraction": { "num": 5, "den": 6 },
    "lineConfig": { "tickLevels": ["endpoints"], "showZones": false },
    "snapDenominator": 12,
    "areaTolerance": 0.0833
  },
  "correctAnswer": 0.833,
  "validatorId": "validator.placement.snapTolerance",
  "skillIds": ["SK-27"],
  "misconceptionTraps": [],
  "difficultyTier": "hard"
}
```

**Authoring target:** 12 templates (4 easy, 5 medium, 3 hard).

---

### 4.2 Activity: `benchmark_battle` (mechanic: benchmark)

**Slug:** `benchmark_battle`
**Mechanic:** benchmark
**Title:** "Bigger or Smaller Than 1/2?"
**Levels in app:** L8 only (Levels 1–5 in source design doc map to L8 difficulty tiers)

The archetype from `RoadMap/03_Level_06_09/02-FractionBenchmarkBattle.md`. A single fraction is shown. The student taps one of three buttons: **BIGGER than 1/2**, **SMALLER than 1/2**, **EQUAL to 1/2**. The benchmark 1/2 is always displayed at the top of the screen as a pie chart and a bar.

This activity directly trains `SK-29` (the rule `a > b/2`). At Easy tier the rule card is fully visible; by Hard tier the student must apply the rule mentally. The "equal" button is hidden at Easy tier (binary decision only) and revealed at Medium per the staged-introduction approach in the source doc §4.

#### Difficulty tiers

| Tier   | Rule card                                          | Equal button                  | Timer                             | Hint budget |
| ------ | -------------------------------------------------- | ----------------------------- | --------------------------------- | ----------- |
| Easy   | Fully visible                                      | Hidden (binary only)          | None                              | 3           |
| Medium | Collapsed by default; tap to expand                | Visible from first appearance | None                              | 2           |
| Hard   | Hidden; "Show rule" button available at point cost | Visible                       | 15-second soft timer per question | 1           |

#### Question template archetype

**Type:** `benchmark_sort`
**Payload shape:** `{ fraction: { num, den }, benchmark: { num: 1, den: 2 }, options: ["bigger", "smaller", "equal"]|["bigger", "smaller"], showRuleCard: boolean, timerMs: number | null }`
**Correct answer shape:** `"bigger" | "smaller" | "equal"`
**Validator:** `validator.benchmark_sort.threeWay`

#### Sample templates (4 of 14 needed)

```jsonc
{
  "id": "q:bb:L8:0001",
  "type": "benchmark_sort",
  "prompt": { "text": "Is 1/4 bigger or smaller than 1/2?", "ttsKey": "tts.bb.l8.0001" },
  "payload": {
    "fraction":  { "num": 1, "den": 4 },
    "benchmark": { "num": 1, "den": 2 },
    "options": ["bigger", "smaller"],
    "showRuleCard": true,
    "timerMs": null
  },
  "correctAnswer": "smaller",
  "validatorId": "validator.benchmark_sort.threeWay",
  "skillIds": ["SK-28", "SK-29"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

{
  "id": "q:bb:L8:0005",
  "type": "benchmark_sort",
  "prompt": { "text": "Is 5/8 bigger, smaller, or equal to 1/2?", "ttsKey": "tts.bb.l8.0005" },
  "payload": {
    "fraction":  { "num": 5, "den": 8 },
    "benchmark": { "num": 1, "den": 2 },
    "options": ["bigger", "smaller", "equal"],
    "showRuleCard": false,
    "timerMs": null
  },
  "correctAnswer": "bigger",
  "validatorId": "validator.benchmark_sort.threeWay",
  "skillIds": ["SK-28", "SK-29"],
  "misconceptionTraps": ["MC-PRX-01"],
  "difficultyTier": "medium"
}

// Medium — the "equal" answer (3/6 = 1/2)
{
  "id": "q:bb:L8:0008",
  "type": "benchmark_sort",
  "prompt": { "text": "Is 3/6 bigger, smaller, or equal to 1/2?", "ttsKey": "tts.bb.l8.0008" },
  "payload": {
    "fraction":  { "num": 3, "den": 6 },
    "benchmark": { "num": 1, "den": 2 },
    "options": ["bigger", "smaller", "equal"],
    "showRuleCard": false,
    "timerMs": null
  },
  "correctAnswer": "equal",
  "validatorId": "validator.benchmark_sort.threeWay",
  "skillIds": ["SK-28", "SK-29"],
  "misconceptionTraps": ["MC-EQ-02"],
  "difficultyTier": "medium"
}

// Hard — close call with timer
{
  "id": "q:bb:L8:0012",
  "type": "benchmark_sort",
  "prompt": { "text": "Is 3/8 bigger, smaller, or equal to 1/2?", "ttsKey": "tts.bb.l8.0012" },
  "payload": {
    "fraction":  { "num": 3, "den": 8 },
    "benchmark": { "num": 1, "den": 2 },
    "options": ["bigger", "smaller", "equal"],
    "showRuleCard": false,
    "timerMs": 15000
  },
  "correctAnswer": "smaller",
  "validatorId": "validator.benchmark_sort.threeWay",
  "skillIds": ["SK-29"],
  "misconceptionTraps": ["MC-PRX-01"],
  "difficultyTier": "hard"
}
```

**Authoring target:** 14 templates (4 easy, 6 medium, 4 hard). Equal-to-1/2 answer fractions (`2/4`, `3/6`, `4/8`) appear in roughly 15% of templates per the source doc §4 ratio.

---

### 4.3 Activity: `three_zone_sort` (mechanic: benchmark)

**Slug:** `three_zone_sort`
**Mechanic:** benchmark
**Title:** "Sort Into Zones"
**Levels in app:** L8 only

The student sees a tray of 3–6 fraction cards and three drop zones at the bottom of the screen, labelled **CLOSER TO 0**, **CLOSER TO 1/2**, **CLOSER TO 1**. They drag each card into the zone it belongs to. This is a multi-fraction generalisation of `benchmark_battle` and an important bridge to the full ordering activity in Level 9 — the student is not yet placing fractions in _order_, just in _neighbourhoods_.

A fraction is "closer to" benchmark `b` when `|f - b|` is smaller than `|f - other_benchmark|` for both other benchmarks. Equal cases (e.g., `1/4` is exactly equidistant from 0 and 1/2) are handled per the source doc's tie rule: such fractions are valid in either zone, and the validator accepts both.

#### Difficulty tiers

| Tier   | Card count                                                     | Bar model on cards | Hint budget |
| ------ | -------------------------------------------------------------- | ------------------ | ----------- |
| Easy   | 3 cards (one obvious for each zone)                            | Yes                | 3           |
| Medium | 5 cards (some 1/2-zone close calls)                            | Yes                | 2           |
| Hard   | 6 cards (multiple cards per zone, includes equal-to-1/2 cases) | No (symbolic only) | 1           |

#### Question template archetype

**Type:** `benchmark_sort`
**Payload shape:** `{ cards: [{ num, den }, ...], zones: ["zero", "half", "one"], showBarOnCard: boolean }`
**Correct answer shape:** `Record<string, "zero" | "half" | "one">` (mapping each card id to a zone; the validator accepts either zone for cards equidistant from two benchmarks)
**Validator:** `validator.benchmark_sort.multiCardZones`

#### Sample templates (2 of 10 needed)

```jsonc
{
  "id": "q:tzs:L8:0001",
  "type": "benchmark_sort",
  "prompt": { "text": "Sort each fraction into the right zone.", "ttsKey": "tts.tzs.l8.0001" },
  "payload": {
    "cards": [
      { "num": 1, "den": 8 },
      { "num": 1, "den": 2 },
      { "num": 7, "den": 8 }
    ],
    "zones": ["zero", "half", "one"],
    "showBarOnCard": true
  },
  "correctAnswer": {
    "1/8": "zero",
    "1/2": "half",
    "7/8": "one"
  },
  "validatorId": "validator.benchmark_sort.multiCardZones",
  "skillIds": ["SK-28"],
  "misconceptionTraps": [],
  "difficultyTier": "easy"
}

{
  "id": "q:tzs:L8:0008",
  "type": "benchmark_sort",
  "prompt": { "text": "Sort all six fractions into the right zone.", "ttsKey": "tts.tzs.l8.0008" },
  "payload": {
    "cards": [
      { "num": 1, "den": 6 },
      { "num": 3, "den": 8 },
      { "num": 2, "den": 4 },
      { "num": 5, "den": 8 },
      { "num": 5, "den": 6 },
      { "num": 1, "den": 4 }
    ],
    "zones": ["zero", "half", "one"],
    "showBarOnCard": false
  },
  "correctAnswer": {
    "1/6": "zero",
    "3/8": "half",
    "2/4": "half",
    "5/8": "half",
    "5/6": "one",
    "1/4": "zero"
  },
  "validatorId": "validator.benchmark_sort.multiCardZones",
  "skillIds": ["SK-28", "SK-29"],
  "misconceptionTraps": ["MC-PRX-01"],
  "difficultyTier": "hard"
}
```

The card `1/4` is intentionally equidistant from 0 (distance 0.25) and 1/2 (distance 0.25). The validator accepts either `"zero"` or `"half"` for `1/4`. The expected canonical answer (`"zero"`) reflects the convention that ties go to the lower benchmark, but the student is not penalised for choosing `"half"`.

**Authoring target:** 10 templates (3 easy, 4 medium, 3 hard).

---

## 5. Misconceptions Detected at This Level

| MC ID        | Name                                                                                                                                   | Detection signal                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `MC-PRX-01`  | "Proximity-to-1 confusion" — student places fractions near 1 (e.g., `5/6`, `7/8`) too far left because the numerator is small          | Wrong placement on `magnitude_scales` Hard items where the fraction is in the `[0.7, 0.9]` range |
| `MC-EQ-02`   | "Equal benchmarks unrecognised" — student places `2/4` or `3/6` in the "almost half" zone instead of recognising it equals 1/2 exactly | Wrong "bigger" or "smaller" on `benchmark_battle` items where the fraction equals 1/2            |
| `MC-RULE-01` | "Rule misapplication" — student inverts the benchmark rule (says `a > b/2` is smaller than 1/2)                                        | Mirror-image errors on `benchmark_battle`: consistently picking the opposite of correct          |
| `MC-WHB-01`  | (carried from L6) "Whole-number bias on numerator"                                                                                     | Wrong placement of fractions like `3/4` near the `3/8` position because the numerator is 3       |
| `MC-WHB-02`  | (carried from L7) "Whole-number bias on denominator"                                                                                   | Re-emerges in `magnitude_scales` Hard items where `1/4` is placed left of `1/8` because `4 > 8`  |

The L7 misconceptions (`MC-WHB-01`, `MC-WHB-02`) re-surface here because Level 8 mixes denominators across the entire fraction pool. A student who appeared to master those at L7 may still slip when the cognitive load of placement is added.

---

## 6. Fraction Pool

Per **C8**, sixths and eighths are now fully active in non-unit forms. The pool below is the union of L7's pool plus the missing non-unit sixths and eighths.

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
  },
  {
    "id": "frac:1/6",
    "numerator": 1,
    "denominator": 6,
    "decimalValue": 0.167,
    "benchmark": "almost_zero",
    "denominatorFamily": "sixths"
  },
  {
    "id": "frac:2/6",
    "numerator": 2,
    "denominator": 6,
    "decimalValue": 0.333,
    "benchmark": "almost_half",
    "denominatorFamily": "sixths"
  },
  {
    "id": "frac:3/6",
    "numerator": 3,
    "denominator": 6,
    "decimalValue": 0.5,
    "benchmark": "half",
    "denominatorFamily": "sixths"
  },
  {
    "id": "frac:4/6",
    "numerator": 4,
    "denominator": 6,
    "decimalValue": 0.667,
    "benchmark": "almost_half",
    "denominatorFamily": "sixths"
  },
  {
    "id": "frac:5/6",
    "numerator": 5,
    "denominator": 6,
    "decimalValue": 0.833,
    "benchmark": "almost_one",
    "denominatorFamily": "sixths"
  },
  {
    "id": "frac:1/8",
    "numerator": 1,
    "denominator": 8,
    "decimalValue": 0.125,
    "benchmark": "almost_zero",
    "denominatorFamily": "eighths"
  },
  {
    "id": "frac:3/8",
    "numerator": 3,
    "denominator": 8,
    "decimalValue": 0.375,
    "benchmark": "almost_half",
    "denominatorFamily": "eighths"
  },
  {
    "id": "frac:4/8",
    "numerator": 4,
    "denominator": 8,
    "decimalValue": 0.5,
    "benchmark": "half",
    "denominatorFamily": "eighths"
  },
  {
    "id": "frac:5/8",
    "numerator": 5,
    "denominator": 8,
    "decimalValue": 0.625,
    "benchmark": "almost_half",
    "denominatorFamily": "eighths"
  },
  {
    "id": "frac:7/8",
    "numerator": 7,
    "denominator": 8,
    "decimalValue": 0.875,
    "benchmark": "almost_one",
    "denominatorFamily": "eighths"
  }
]
```

Fractions equal to 1/2 (`2/4`, `3/6`, `4/8`) are explicitly tagged `benchmark: "half"` in the FractionBank. The benchmark-aware sorting algorithm in `validator.benchmark_sort.threeWay` reads this field directly rather than recomputing distance every time.

---

## 7. Advancement Criteria (Mastery Gate to Level 9)

A student unlocks Level 9 when **all** are true:

- `SkillMastery.state === "MASTERED"` for `SK-27`, `SK-28`, **and** `SK-29` (see `../skills.md`)
- At least 24 attempts across at least 2 different activities at this level
- Tier 3 (Hard) accuracy ≥ 70% across the last 6 hard attempts (no scaffolding, no rule card)
- For `magnitude_scales` Hard: at least 4 of last 6 placements have `outcome === "EXACT"` (per the validator's tier from `01-FractionMagnitudeScales.md` §5) — placement precision genuinely matters, and `CLOSE` placements are not enough at the gate
- No `MC-PRX-01` flag in the last 4 placement attempts (the student is no longer systematically misplacing near-1 fractions)

This is the most demanding mastery gate in the MVP because Level 9 is the capstone and Level 9 tasks fail catastrophically if a student arrives without solid benchmark intuition.

---

## 8. Estimated Session Time

Per **C9**:

- **Single session:** 12–14 minutes (placement is faster per item than comparison, but the item count per session is higher — ~15 placements vs ~10 comparisons in the same window)
- **Full level mastery:** 4–6 sessions across 3–5 days

Level 8 is the longest level in the MVP. Both the volume of new fractions (sixths and eighths now non-unit) and the introduction of two new mechanics (placement, multi-zone sort) account for the time.

---

## 9. Authoring Status

| Item                         | Required              | Authored         | Notes                                                                                                                                          |
| ---------------------------- | --------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `magnitude_scales` templates | 12                    | 3 examples shown | Need 9 more                                                                                                                                    |
| `benchmark_battle` templates | 14                    | 4 examples shown | Need 10 more                                                                                                                                   |
| `three_zone_sort` templates  | 10                    | 2 examples shown | Need 8 more                                                                                                                                    |
| TTS audio scripts            | 36                    | 0                | SpeechSynthesis API at runtime                                                                                                                 |
| Hint definitions             | ~108 (3 per template) | 0                | TBD; for `magnitude_scales` use the three-tier hint system from source doc §9 (pie / arrow / ghost)                                            |
| Validator function specs     | 3                     | High-level only  | `placement.snapTolerance`, `benchmark_sort.threeWay`, `benchmark_sort.multiCardZones` — `multiCardZones` validator must accept ties (see §4.3) |
| SVG number-line component    | 1                     | 0                | Reuse the spec from `01-FractionMagnitudeScales.md` §2 verbatim                                                                                |

---

## 10. Open Questions for Level 8

1. **Snap tolerance on Hard placements.** The source doc gives a denominator-12 grid with 8px pixel tolerance. For mobile devices at 360px width, 8px is roughly 1.7% of the line. Is that too tight for K–2 fingers? Recommended: keep 8px on desktop, scale to 12px on mobile (`viewport-width < 480px`), revisit after first playtest.

2. **Tie convention in `three_zone_sort`.** A fraction equidistant from two benchmarks (e.g., `1/4` is 0.25 from both 0 and 1/2) accepts either zone. Should the UI surface this? Options: (a) silent acceptance — student sees "correct" regardless; (b) a subtle "either works!" badge after the round. Recommended: (a) for MVP — simpler validator output, no extra UI surface area.

3. **Equal-to-1/2 in `magnitude_scales`.** A student dragging `2/4` should land at the 1/2 position. The validator should treat this as `EXACT` even though the card is labelled `2/4`, not `1/2`. Confirm: yes, the validator computes against `decimalValue` from the FractionBank, so `2/4` and `1/2` validate to the same target. No special-casing needed.

4. **Pie chart hint vs bar model hint.** The source doc gives a pie-chart hint at all levels. Per `level-01.md` open question 1 (rectangles primary, circles secondary), the pie hint should perhaps become a bar hint in MVP to maintain visual consistency. Recommended: bar hint in MVP for `magnitude_scales` and `three_zone_sort`; circles preserved in `match_symbol_to_shape` from L6 only.

5. **Number-line orientation.** All MVP number lines are horizontal 0-on-left, 1-on-right. A vertical orientation (0-bottom, 1-top) would harmonise with the `unit_fraction_ladder` from L7 ("biggest on top"). Recommended: stay horizontal in L8 for fidelity to standard tests; revisit post-MVP.
