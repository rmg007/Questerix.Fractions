---
title: Misconceptions Catalog
status: draft
owner: solo
last_reviewed: 2026-04-25
applies_to: [mvp]
constraint_refs: [C3, C8, C10]
related: [scope-and-sequence.md, levels/, standards-map.md, ../30-architecture/data-schema.md]
supersedes: [RoadMap/02_Level_03_05/misconceptions/MISCONCEPTIONS_FRAMEWORK.md]
---

# Misconceptions Catalog

Consolidated catalog of student misconceptions the MVP detects, flags, and (where possible) remediates.

Salvaged from `RoadMap/02_Level_03_05/misconceptions/MISCONCEPTIONS_FRAMEWORK.md` (M1–M12 taxonomy) and the per-level traps declared in `levels/level-01.md` (MC-EOL-01..03, MC-WHB-01).

Each row is the source of truth for one `Misconception` record (see `data-schema.md §2.8`). The IDs in this file are the IDs that ship in the IndexedDB curriculum seed.

---

## 1. Reading the Catalog

Each misconception entry has:

| Field                | Meaning                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| **MC ID**            | Stable ID, prefixed `MC-` and grouped by family (WHB, EOL, MAG, PRX, etc.)       |
| **Name**             | Short label                                                                      |
| **Description**      | What the misconception looks like in the student's reasoning                     |
| **Detection signal** | The observable pattern in app attempts that flags the misconception              |
| **Intervention**     | Suggested in-app remediation, ideally a specific activity replay or hint cascade |
| **Grade level**      | Earliest grade where this is typically observed                                  |
| **Related skills**   | Skills (`SK-*`) the misconception interferes with                                |
| **Source**           | Original taxonomy entry (M1–M12) or per-level trap                               |

---

## 2. Priority Misconceptions for MVP

Per the brief, four misconceptions are the **must-detect** set for MVP playtesting:

1. Whole-number bias (numerator) — `MC-WHB-01`
2. Whole-number bias (denominator) — `MC-WHB-02`
3. Equal-parts loose interpretation — `MC-EOL-01`
4. Magnitude blindness — `MC-MAG-01`
5. Proximity-to-1 confusion — `MC-PRX-01`

These are explicit detection targets in the L6–L9 comparison activities (the levels that exist to validate magnitude understanding per C10).

---

## 3. Catalog

### 3.1 Whole-Number Bias Family (MC-WHB-\*)

The single most-cited fraction misconception in research literature. Children apply whole-number reasoning to fraction symbols and quantities.

## MC-WHB-01 — Whole-Number Bias (Numerator)

**Detector:** detectWHB01
**Templates baiting:** 75

| Field                | Value                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | "More numerator means bigger fraction" — student picks 3/8 over 1/2 because 3 > 1. Surfaces when comparing fractions with different denominators.                          |
| **Detection signal** | On `compare` (L6+) or `identify_half` (L1) attempts where numerator is misleadingly large, student picks the larger-numerator option ≥ 60% of the time across 5+ attempts. |
| **Intervention**     | Replay L8 benchmark-sort activities focused on "is this closer to 0 or 1?" Force the student to reason about magnitude before symbol.                                      |
| **Grade level**      | Grade 1 (informal), Grade 2 (formal — main concern)                                                                                                                        |
| **Related skills**   | `KC-SYMBOL-BASIC` (SK-22, SK-23), `KC-SYMBOL-ADV` (SK-24, SK-25)                                                                                                          |
| **Source**           | M5 (More Pieces = Bigger Fraction); per-level trap in `level-01.md`                                                                                                        |

## MC-WHB-02 — Whole-Number Bias (Denominator)

**Detector:** detectWHB02
**Templates baiting:** 7

| Field                | Value                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | "Bigger denominator means bigger fraction" — student picks 1/8 over 1/2 because 8 > 2. The classic Grade 2–3 trap.           |
| **Detection signal** | On `compare_same_numerator` (L7) attempts, student picks the larger-denominator option ≥ 60% of the time across 5+ attempts. |
| **Intervention**     | Physical visual: side-by-side same-pizza demonstration. Replay L7 Easy tier with explicit visual scaffolding.                |
| **Grade level**      | Grade 2 (primary), persists into Grade 3                                                                                     |
| **Related skills**   | `KC-SYMBOL-BASIC` (SK-23), `KC-SYMBOL-ADV` (SK-24)                                                                          |
| **Source**           | M5 (More Pieces = Bigger Fraction)                                                                                           |

## MC-NOM-01 — Numerator Over Magnitude

**Detector:** detectNOM01
**Templates baiting:** 5

| Field                | Value                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | General reliance on numerator as the sole indicator of fraction value. "If the number on top is big, the fraction is big."                                            |
| **Detection signal** | Across any activity type (identify, compare, order), student consistently chooses options with higher numerators even when magnitude is small.                        |
| **Intervention**     | Visual "numerator-stripping": show the fraction with the numerator removed to highlight that the unit (denominator) defines the scale.                                |
| **Grade level**      | Grade 2                                                                                                                                                               |
| **Related skills**   | `KC-SYMBOL-BASIC` (SK-22, SK-23)                                                                                                                                      |
| **Source**           | Observed pattern in student telemetry                                                                                                                                 |

---

### 3.2 Equal-Parts Family (MC-EOL-\*)

Misinterpretations of what "equal parts" means.

## MC-EOL-01 — Equal-Parts Loose Interpretation ("Any Two Pieces = Halves")

**Detector:** detectEOL01
**Templates baiting:** 54

| Field                | Value                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | "If I cut something into two pieces, those are halves" — student does not check for equality. Visible on `equal_or_not` Tier 1.                           |
| **Detection signal** | On `equal_or_not` Easy templates with clearly unequal partitions (e.g., 30/70 split), student answers "yes (equal)" ≥ 50% of the time across 4+ attempts. |
| **Intervention**     | Replay `partition_halves` Easy with axis-snap on. Surface visual feedback that highlights the area difference.                                            |
| **Grade level**      | Grade K, Grade 1 (primary)                                                                                                                                |
| **Related skills**   | `KC-HALVES-VIS` (SK-01, SK-02)                                                                                                                            |
| **Source**           | M3 (Any Two Pieces = Halves); `level-01.md` trap MC-EOL-01                                                                                                |

## MC-EOL-02 — Rotated-Halves Confusion

**Detector:** detectEOL02
**Templates baiting:** 3 (q:en:L3:N002, q:en:L3:N003, q:en:L3:N004)

| Field                | Value                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | "Rotated halves are unequal" — student rejects 50/50 partitions when shape is rotated or pieces are oriented differently.     |
| **Detection signal** | On `equal_or_not` Tier 2/3 with non-zero rotation, student answers "no (unequal)" ≥ 50% of the time across 3+ attempts.       |
| **Intervention**     | Physical demo via animation: rotate the shape back to canonical orientation in front of the student, show areas remain equal. |
| **Grade level**      | Grade K, Grade 1                                                                                                              |
| **Related skills**   | `KC-HALVES-VIS` (SK-01, SK-02)                                                                                                |
| **Source**           | M7 (Position Matters for Fraction Identity); `level-01.md` trap MC-EOL-02                                                     |

## MC-EOL-03 — Visual-Symmetry-Equals-Equality

**Detector:** detectEOL03
**Templates baiting:** 0

| Field                | Value                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | "Symmetric-looking partitions must be equal even if they are not" — student trusts visual symmetry over actual area.                         |
| **Detection signal** | On `equal_or_not` Hard templates with curved or skewed partitions (e.g., 45/55), student answers "yes" ≥ 40% of the time across 3+ attempts. |
| **Intervention**     | Show overlay of computed areas with numeric labels. Then re-attempt with hint budget reduced by 1.                                           |
| **Grade level**      | Grade 1, Grade 2                                                                                                                             |
| **Related skills**   | `KC-HALVES-VIS` (SK-01)                                                                                                                      |
| **Source**           | `level-01.md` trap MC-EOL-03                                                                                                                 |

## MC-EOL-04 — Equal Means Identical

**Detector:** detectEOL04
**Templates baiting:** 4 (q:en:L3:N002, q:en:L3:N003, q:en:L3:N005, q:en:L3:N006)

| Field                | Value                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | "Equal means the two pieces look exactly the same" — student rejects pieces that are equal in area but different in orientation or shape. |
| **Detection signal** | On `equal_or_not` with same-area but different-shape partitions, student answers "no" ≥ 50% of the time.                                  |
| **Intervention**     | Side-by-side demo: piece A and piece B both painted with the same area-fill color.                                                        |
| **Grade level**      | Grade 1                                                                                                                                   |
| **Related skills**   | `KC-HALVES-VIS` (SK-01), `KC-UNITS-VIS` (SK-08)                                                                                          |
| **Source**           | M4 (Equal Means Identical)                                                                                                                |

---

### 3.3 Magnitude Family (MC-MAG-\*)

The hardest misconceptions and the ones MVP exists to detect (per C10).

## MC-MAG-01 — Magnitude Blindness

**Detector:** detectMAG01
**Templates baiting:** 65

| Field                | Value                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Student cannot reason about which fraction is "bigger" without computing or visualizing. Defaults to surface features (numerator size, position, color).   |
| **Detection signal** | Across L6–L9 comparison and ordering attempts, student accuracy on Tier-3 (no-scaffolding) items < 50% AND avg `errorMagnitude` on placement items > 0.20. |
| **Intervention**     | Heavy benchmark-sort practice (L8). Force student to first answer "closer to 0, 1/2, or 1?" before answering the comparison question.                      |
| **Grade level**      | Grade 1 (latent), Grade 2 (visible)                                                                                                                        |
| **Related skills**   | `KC-SYMBOL-ADV` (SK-24, SK-25, SK-26), `KC-MAGNITUDE`                                                                                                     |
| **Source**           | Synthesized from M5, M6 and the validation goal in C10                                                                                                     |

## MC-MAG-02 — Whole Disappears When Divided

**Detector:** detectMAG02
**Templates baiting:** 3

| Field                | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | "When I cut a whole into pieces, the whole is gone" — student treats fraction pieces as independent objects, not parts of a referent. Causes failures on "two halves make a whole" reasoning.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Detection signal** | Detected via **`KC-PRODUCTION-2` attempt logs** (compositional fourths, L5 — formerly SK-17). The two-step `compositional_fourths` activity (`level-05.md §4.3`) operationalizes compose-back-to-whole: the student must recognize that the original whole persists after each partition step. Students who fail step 2 and redraw step 1 exhibit the "whole disappeared" pattern. Flag MC-MAG-02 when the student re-attempts step 1 after step 2 fails on ≥ 3 consecutive `compositional_fourths` attempts. (audit §1.6 fix — former "how many halves make 1?" prompt was not a discrete in-app activity; replaced with this real telemetry signal.) |
| **Intervention**     | Reunification animation: physically slide the pieces back together to reform the whole.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Grade level**      | Grade 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Related skills**   | `KC-PRODUCTION-2` (compose-back-to-whole / compositional fourths — formerly SK-17)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Source**           | M6 (Whole Disappears When Divided)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

---

### 3.4 Benchmark / Proximity Family (MC-PRX-\*)

Misconceptions about where fractions sit relative to landmark values.

## MC-PRX-01 — Proximity-to-1 Confusion

**Detector:** detectPRX01
**Templates baiting:** 18

| Field                | Value                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Student confuses "almost-one" fractions (e.g., 7/8) with "one-half-ish" fractions (e.g., 3/8). Driven by inattention to magnitude in favor of numerator/denominator-as-numbers. |
| **Detection signal** | On L8 `benchmark_sort` items where the answer is "almost_one", student places item in "half" or "almost_half" zone ≥ 50% of the time across 4+ attempts.                        |
| **Intervention**     | Number-line replay with anchor markers at 0, 1/2, 1. Show the student's placement and the correct placement side-by-side.                                                       |
| **Grade level**      | Grade 2                                                                                                                                                                         |
| **Related skills**   | `KC-SYMBOL-ADV` (SK-25), `KC-MAGNITUDE`                                                                                                                                         |
| **Source**           | Synthesized from M5 + magnitude-family research; explicit MVP target                                                                                                            |

## MC-PRX-02 — All Fractions Are Less Than One-Half

**Detector:** detectPRX02
**Templates baiting:** 0

| Field                | Value                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Student assumes every fraction lives in [0, 1/2] because "fractions are small." Causes systematic placement errors on >0.5 fractions. |
| **Detection signal** | On L8 placement attempts where target is > 0.5, student's `studentAnswerRaw.placedDecimal` < 0.5 ≥ 60% of the time.                   |
| **Intervention**     | Show the student a 7/8 example physically — a near-full pizza. Verbal hint: "fractions can be big or small."                          |
| **Grade level**      | Grade 2                                                                                                                               |
| **Related skills**   | `KC-SYMBOL-ADV` (SK-24, SK-25), `KC-MAGNITUDE`                                                                                       |
| **Source**           | Observed; not in M1–M12 but documented in Behr et al. (1983)                                                                          |

---

### 3.5 Shape and Vocabulary Family (MC-SHP-_, MC-VOC-_)

## MC-SHP-01 — Whole = Circle

**Detector:** detectSHP01
**Templates baiting:** 3 (q:pt:L1:N001, q:pt:L1:N002, q:pt:L1:N003)

| Field                | Value                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Only circles are "wholes" or can be halved. Student balks at rectangles.                                                        |
| **Detection signal** | On L1 `partition_halves` with rectangle, attempt time exceeds 2× the median for circle attempts AND student requests max hints. |
| **Intervention**     | Animated demonstration of folding a paper rectangle in half.                                                                    |
| **Grade level**      | Grade K, Grade 1                                                                                                                |
| **Related skills**   | `KC-HALVES-VIS` (formerly SK-11; surfaces in L1 partition_halves)                                                                                                                         |
| **Source**           | M2 (Whole = Circle)                                                                                                             |

## MC-SHP-02 — Size = Wholeness

**Detector:** detectSHP02
**Templates baiting:** 0

| Field                | Value                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| **Description**      | "Bigger things are more whole than smaller things" — student says small shapes can't be wholes. |
| **Detection signal** | Indirect: student error rate on small-shape items > 2× error rate on large-shape items at L1.   |
| **Intervention**     | Show varied-size wholes side by side.                                                           |
| **Grade level**      | Grade K                                                                                         |
| **Related skills**   | `KC-HALVES-VIS` (SK-01)                                                                                         |
| **Source**           | M1 (Size ≠ Wholeness)                                                                           |

## MC-VOC-01 — Fourth ≠ Quarter

**Detector:** detectVOC01
**Templates baiting:** 4 (q:lb:L3:N005, q:lb:L3:N006, q:lb:L3:N007, q:lb:L3:N008)

| Field                | Value                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Student treats "one-fourth" and "one-quarter" as different fractions.                                                                                       |
| **Detection signal** | On L3–L5 `label` / `name_the_fraction` attempts that ask for "quarter," student selects a different fraction than they would for "fourth" on parallel item. |
| **Intervention**     | Audio hint: "fourth and quarter mean the same thing." Explicit synonymy.                                                                                    |
| **Grade level**      | Grade 1                                                                                                                                                     |
| **Related skills**   | `KC-UNITS-VIS` (SK-09)                                                                                                                                                     |
| **Source**           | M10 (Fourth and Quarter are Different)                                                                                                                      |

---

### 3.6 Level 5 Partitioning Traps (MC-L5-*)

Specific traps observed in the complex partitioning tasks of Level 5.

## MC-L5-THIRDS-HALF-01 — Thirds vs Half Confusion

**Detector:** detectL5ThirdsHalf
**Templates baiting:** 4

| Field                | Value                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Student partitions into 2 pieces when asked for 3, or vice versa, due to visual confusion with the "half" landmark.                         |
| **Detection signal** | On L5 `partition` tasks for 3 parts, student creates 2 parts (or vice-versa) on ≥ 50% of attempts.                                           |
| **Intervention**     | Explicit count-back: "Count the pieces! You have 2, but we need 3."                                                                         |
| **Grade level**      | Grade 2                                                                                                                                     |
| **Related skills**   | `KC-PRODUCTION-2` (SK-15 — thirds production)                                                                                                                                     |
| **Source**           | Level 5 activity telemetry                                                                                                                  |

## MC-L5-FOURTHS-3CUTS-01 — Fourths by 3 Cuts

**Detector:** detectL5Fourths3Cuts
**Templates baiting:** 1

| Field                | Value                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | "3 cuts = 3 pieces" — student makes 3 cuts to get 4 pieces but forgets that the number of pieces is cuts+1 for linear partitions.           |
| **Detection signal** | On L5 `partition` tasks for 4 parts, student makes exactly 3 cuts and stops, even if areas are unequal or count is wrong.                   |
| **Intervention**     | Highlight the "cut" vs "piece" distinction. "3 cuts made 4 pieces! Count them."                                                            |
| **Grade level**      | Grade 2                                                                                                                                     |
| **Related skills**   | `KC-PRODUCTION-2` (SK-16 — fourths production)                                                                                                                                     |
| **Source**           | Level 5 activity telemetry                                                                                                                  |

## MC-L5-DENSWITCH-01 — Denominator Switch Confusion

**Detector:** detectL5DenSwitch
**Templates baiting:** 3

| Field                | Value                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Student switches to a different denominator midway through a multi-step task.                                                               |
| **Detection signal** | On L5 multi-step `partition` tasks, student successfully completes step 1 (e.g., halves) but fails step 2 by partitioning into wrong count. |
| **Intervention**     | Prompt: "Wait, we were making fourths! Why did we switch to thirds?"                                                                        |
| **Grade level**      | Grade 2                                                                                                                                     |
| **Related skills**   | `KC-PRODUCTION-2` (SK-17 — compositional partitioning)                                                                                                                                     |
| **Source**           | Level 5 activity telemetry                                                                                                                  |

### 3.7 Equivalence Recognition Family (MC-EQ-\*)

Misconceptions that arise when students fail to recognise that two fractions represent the same quantity, or mistake perceptual similarity for mathematical equality.

## MC-EQ-01 — Perceptual Equality Bias ("Equal Looks the Same")

**Detector:** detectEQ01 *(planned — not yet implemented)*
**Templates baiting:** L6 comparison_battle_same_denom Medium, L7 comparison_battle_mixed_denom Medium

| Field                | Value                                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Student picks `=` (equal) whenever the two fraction bar representations look approximately the same length, regardless of the actual numerator values.                              |
| **Detection signal** | On `compare` Easy/Medium templates where numerators differ by 1 (same denominator), student selects `=` ≥ 50% of the time across 4+ attempts.                                     |
| **Intervention**     | Redirect to bar alignment: "Look closely — one bar is longer. They can't be equal." Replay Tier 1 comparison templates with exaggerated differences.                               |
| **Grade level**      | Grade 1–2                                                                                                                                                                          |
| **Related skills**   | `KC-SYMBOL-BASIC` (L6 comparison skill; formerly SK-08/SK-09)                                                                                                                                                                   |
| **Source**           | `level-06.md` trap MC-EQ-01; `level-07.md` trap MC-EQ-01                                                                                                                         |

## MC-EQ-02 — Equivalent Benchmark Unrecognised

**Detector:** detectEQ02 *(planned — not yet implemented)*
**Templates baiting:** L8 benchmark items where target = 1/2 exactly; L9 ordering_tournament_5 Hard with equivalence pair

| Field                | Value                                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Student does not recognise that equivalent fractions (e.g., `2/4`, `3/6`, `4/8`) equal exactly `1/2`, placing them in an "almost half" zone rather than recognising them as equal. |
| **Detection signal** | On `benchmark` or `order` templates where the correct answer requires placing an equivalent-of-½ fraction at the ½ mark, student misplaces it ≥ 50% of the time across 3+ attempts. |
| **Intervention**     | Show a side-by-side bar of `1/2` next to the equivalent fraction. "They're both exactly at the middle — they're the same!"                                                        |
| **Grade level**      | Grade 2                                                                                                                                                                            |
| **Related skills**   | `KC-MAGNITUDE` (L8 benchmark skill; formerly SK-12/SK-13)                                                                                                                                                                   |
| **Source**           | `level-08.md` trap MC-EQ-02; `level-09.md` trap MC-EQ-02                                                                                                                         |

---

## 4. Out-of-Scope Misconceptions (Post-MVP 2029)

The following misconceptions from the M1–M12 taxonomy are **not detected by MVP**, either because the relevant activity is out of scope or because they require teacher observation rather than app telemetry.

| Source                                        | Why Deferred                                                                                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M8 (Halving sets requires evenness)           | Set-fraction activities are out of MVP scope                                                                                                                            |
| M9 (Fraction vocabulary = cutting vocabulary) | Requires verbal observation, not app-detectable                                                                                                                         |
| M11 (Fractions only exist in food)            | Transfer-task activity is post-MVP                                                                                                                                      |
| M12 (Identity: "I'm not a math person")       | Requires affective measurement; not MVP-detectable. **Important** for design (see C6 — bright, simple, non-threatening visuals) but not a tracked Misconception record. |

---

## 5. Detection Implementation Notes

Detection signals above describe _patterns_, not single attempts. Implementation guidance:

1. A `MisconceptionFlag` record (see `data-schema.md §3.5`) is created when the pattern threshold is crossed for the first time.
2. `observationCount` increments each time the pattern is re-confirmed in a subsequent session.
3. `resolvedAt` is set when the student passes a remediation activity for that misconception with Tier-3 accuracy ≥ 80% across 5 consecutive attempts.
4. Detection runs **client-side only** per C1. No remote analytics.

The detection logic itself lives in `src/engine/misconceptionDetectors.ts` (TBD). Each detector is a pure function `(attempts: Attempt[]) => MisconceptionFlag | null`.

---

## 6. Authoring Checklist for New Misconceptions

Before adding a new MC entry:

1. [ ] Is the misconception observable in app telemetry (i.e., from `Attempt` records alone)? If not, document it elsewhere — it does not belong here.
2. [ ] Is there at least one in-scope activity that would surface this misconception? If not, defer to post-MVP.
3. [ ] Is the detection signal **specific** (a numeric threshold, not "student seems confused")?
4. [ ] Is the intervention **actionable** in-app (a specific activity replay or hint cascade), not "talk to the teacher"?

---

## 7. Cross-Reference Map

| Source taxonomy                    | MVP catalog ID                 |
| ---------------------------------- | ------------------------------ |
| M1 — Size ≠ Wholeness              | MC-SHP-02                      |
| M2 — Whole = Circle                | MC-SHP-01                      |
| M3 — Any Two Pieces = Halves       | MC-EOL-01                      |
| M4 — Equal Means Identical         | MC-EOL-04                      |
| M5 — More Pieces = Bigger Fraction | MC-WHB-01, MC-WHB-02           |
| M6 — Whole Disappears              | MC-MAG-02                      |
| M7 — Position Matters              | MC-EOL-02                      |
| M8 — Set evenness                  | (out of scope)                 |
| M9 — Halve = cut                   | (out of scope)                 |
| M10 — Fourth ≠ Quarter             | MC-VOC-01                      |
| M11 — Food-only fractions          | (out of scope)                 |
| M12 — Math identity                | (out of scope, but informs C6) |
| L6/L7 perceptual-equality bias     | MC-EQ-01                       |
| L8/L9 equivalence-benchmark gap    | MC-EQ-02                       |

Last reviewed: 2026-04-30. (updated all SK-NN → KC-* in Related skills fields; added §3.7 Equivalence Recognition family: MC-EQ-01 and MC-EQ-02 — both were referenced in level-06..09 docs but had no catalog entry; detectors planned, not yet implemented)
