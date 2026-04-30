---
title: Learning Hypotheses
status: draft
owner: solo
last_reviewed: 2026-04-25
applies_to: [mvp]
constraint_refs: [C1, C3, C9, C10]
related:
  [
    playtest-protocol.md,
    in-app-telemetry.md,
    ../10-curriculum/standards-map.md,
    ../10-curriculum/misconceptions.md,
  ]
---

# Learning Hypotheses

The MVP exists to validate one big claim (per **C10**):

> The magnetic-drag mechanic teaches K–2 students fraction concepts well enough to improve their performance on a standard paper test.

That claim is too big to test directly. This document decomposes it into **discrete, falsifiable hypotheses**, each with a measurement plan and a success threshold.

If we cannot measure a hypothesis with paper-test items + in-app telemetry available under C1 (no backend), it does not belong here.

---

## 1. Hypothesis Format

Each hypothesis has:

| Field                                          | Description                                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **H-ID**                                       | Stable identifier (`H-01`, `H-02`, …)                                                               |
| **Statement**                                  | One-sentence claim                                                                                  |
| **Prediction**                                 | What we expect to observe if the hypothesis is true                                                 |
| **Measurement**                                | Paper-test items + telemetry queries that produce the data                                          |
| **Success threshold**                          | The numeric bar at which we count the hypothesis as supported                                       |
| **Falsification criterion**                    | The result that would force us to reject the hypothesis — written in advance, not after seeing data |
| **Priority**                                   | P0 (MVP-blocking) or P1 (informative but non-blocking)                                              |
| **Linked skills / standards / misconceptions** | Cross-references                                                                                    |

A hypothesis is **not** "we'll see what happens." A hypothesis with no falsification criterion is not a hypothesis.

---

## 2. The Hypotheses

### H-01 — The Identification Mechanic Teaches Identification (P0)

**Statement.** Students who complete Levels 1–3 in the app improve their accuracy on paper-test items that ask "which shape shows one half / one third / one fourth?" compared with a matched pre-test.

**Prediction.** Mean accuracy on the L1–L3 identification subset of the paper post-test is at least 20 percentage points higher than the pre-test, across the 8–10 student cohort.

**Measurement.**

- **Pre-test:** 5 paper items asking "circle the shape that shows one half" with three distractors. Identical structure for thirds and fourths (15 items total across the three skills).
- **Post-test:** Parallel 15-item form with different shapes / distractors.
- **Telemetry:** `Attempt.outcome === "EXACT"` rate on `identify_half`, `identify_third`, `identify_fourth` activities, computed per student per session.
- Compare each student's pre-test % to post-test % paired.

**Success threshold.** Mean post − pre ≥ +20 pp (paired across students). At least 6 of 8–10 students show positive gain. No student regresses by more than −10 pp.

**Falsification.** Mean gain < +10 pp, OR ≥ 3 students regress by more than −10 pp. Either result means the identification mechanic does not teach identification well enough to justify shipping.

**Priority.** P0.

**Linked.** Skills `SK-02`, `SK-04`, `SK-05` (canonical IDs per `../10-curriculum/skills.md`). Standards `1.G.A.3`, `2.G.A.3`. Misconceptions `MC-EOL-01`, `MC-WHB-01`.

---

### H-02 — The Partitioning Mechanic Teaches Partitioning (P0)

**Statement.** Students who complete the L1, L4, and L5 partitioning activities improve at drawing equal-part divisions on paper.

**Prediction.** On post-test items asking "draw a line that splits this shape into two equal parts" (or four), the proportion of student-drawn partitions that fall within ±10% area tolerance increases by at least 20 percentage points compared with pre-test.

**Measurement.**

- **Pre-test:** 5 paper items. Student draws the partition with a pencil. Author scores by overlay on a calibrated tolerance template.
- **Post-test:** Parallel 5-item form.
- **Telemetry:** Across `partition_halves` and `partition_fourths` sessions, % of attempts with `outcome === "EXACT"` and the median `errorMagnitude` per student.
- Cross-check: do students whose in-app partition accuracy improves over the playtest also improve on paper?

**Success threshold.** Mean post − pre ≥ +20 pp on paper items. AND ≥ 5 of 8–10 students show paper improvement that is concordant with in-app improvement (Spearman rank correlation ≥ 0.4 between in-app and paper improvement).

**Falsification.** Mean paper gain < +10 pp, OR no concordance between in-app and paper improvement (rank correlation ≤ 0).

**Priority.** P0.

**Linked.** Skills `SK-11`, `SK-15` (canonical IDs per `../10-curriculum/skills.md` — formerly SK-06, SK-07 before audit §1.1 renumbering). Standards `1.G.A.3`. Misconceptions `MC-EOL-01`, `MC-EOL-02`.

---

### H-03 — Comparison Skill Transfers from App to Paper (P0)

**Statement.** Students who complete L6–L9 comparison and ordering activities transfer the magnitude-comparison skill to paper-and-pencil items where no app is present.

**Prediction.** On post-test items asking "circle the bigger fraction" (with shape-pair distractors), accuracy improves by at least 25 pp over pre-test, measured against an unscaffolded baseline.

**Measurement.**

- **Pre-test:** 8 paired-fraction items mixing same-denominator (2 items), same-numerator (3 items), and benchmark (3 items) comparisons.
- **Post-test:** Parallel 8-item form.
- **Telemetry:** `compare_*` and `ordering_*` Tier-3 attempt accuracy per session.
- Item-level analysis: which comparison sub-type (same-denom / same-num / benchmark) shows the largest transfer?

**Success threshold.** Mean post − pre ≥ +25 pp overall. The same-numerator subset (where MC-WHB-02 dominates) shows ≥ +15 pp gain.

**Falsification.** Mean overall gain < +10 pp, OR same-numerator gain < +5 pp. The same-numerator items are the C10 acid test; failure there means the magnitude schema is not forming.

**Priority.** P0.

**Linked.** Skills `SK-22`, `SK-23`, `SK-24`, `SK-25` (canonical IDs per `../10-curriculum/skills.md` — formerly SK-11..SK-14). Standards `2.NF.2`. Misconceptions `MC-WHB-01`, `MC-WHB-02`, `MC-MAG-01`, `MC-PRX-01`.

---

### H-04 — Learning Persists Across Days (P0)

**Statement.** Improvement observed within a single session does not decay between sessions; students return on Day 2 / Day 3 retaining at least 80% of within-session gains.

**Prediction.** A student who reaches Tier-3 accuracy ≥ 70% at end of Day 1 starts Day 2 with Tier-3 accuracy ≥ 56% (= 80% × 70%) on the same skill, before any new instruction in that session.

**Measurement.**

- **Telemetry only.** For each `(studentId, skillId)` pair, compute end-of-day-1 Tier-3 accuracy from the last 5 attempts of the day.
- Compute first-5-attempts Tier-3 accuracy at the start of day-2 in the same skill.
- Retention ratio = day-2-start / day-1-end.
- Repeat for day-2-end vs. day-3-start.

**Success threshold.** Median retention ratio ≥ 0.80 across student-skill pairs. At least 2 of the 3 paired tests (day-1-to-2, day-2-to-3, day-1-to-3) hit this threshold.

**Retention measurement calibration requirement.** The "first-5-attempts at start of day-2" measurement is only valid if those 5 attempts target the **same skill** practiced at day-1 end. Adaptive routing may select a different skill if the engine judges the prior skill mastered. To ensure measurement validity, the engine must serve a **calibration round** of 5 items targeting the specific prior-session skill before adaptive routing resumes. This is a pre-requisite for valid H-04 data and must be implemented as a "retention-calibration mode" on session start. <!-- Q-NEW: Add to open-questions.md as a tracking item before playtest — this calibration round is not yet spec'd in the engine. -->

**Falsification.** Median retention ratio < 0.65, OR fewer than 1 of 3 paired tests hits the threshold. This would indicate the mechanic produces in-the-moment performance but not durable learning.

**Priority.** P0.

**Linked.** All skills. Implements the C9 assumption that 10–15-minute sessions over multiple days produce learning, not just performance.

---

### H-05 — No Negative Interaction with Prior Knowledge (P0)

**Statement.** Students do not get _worse_ on any pre-existing fraction skill after using the app. The mechanic does not introduce new misconceptions or unlearn correct prior knowledge.

**Prediction.** No student regresses by more than −10 percentage points on any skill subset (identification, partitioning, comparison) between pre-test and post-test. Specifically, no new misconception flags appear in students who entered the playtest free of those misconceptions.

**Measurement.**

- **Paper:** Per-student per-skill-subset pre vs. post. Flag any subset where post − pre < −10.
- **Telemetry:** For each student, compare the `MisconceptionFlag` records present at session 1 (largely empty) vs. session-N. New flags after the first session are tracked.
- Qualitative cross-check: observer notes flag any student showing visible frustration or confusion that wasn't present at pre-test.

**Success threshold.** ≤ 1 student shows a regression of more than −10 pp on any subset, AND no new misconception flag is observed in more than 2 of the 8–10 students.

**Falsification.** ≥ 3 of the 8–10 students show ≥ −10 pp regression on any subset, OR a new misconception flag (not present pre-test) appears in ≥ 4 students. Either is a "stop ship" signal: the mechanic is creating problems.

**Priority.** P0.

**Linked.** Misconceptions `MC-WHB-01`, `MC-WHB-02`, `MC-EOL-01`, `MC-MAG-01`. Constraints `C10`. Skills (canonical IDs per `../10-curriculum/skills.md`).

---

### H-06 — Mastery Gates Predict Paper Performance (P1)

**Statement.** Students who reach `SkillMastery.state === "MASTERED"` for a skill in-app perform statistically better on the paper post-test items targeting that skill than students who don't.

**Prediction.** Within the cohort, students with `MASTERED` state on `SK-02` outperform `LEARNING`/`APPROACHING` students on the paper "identify halves" subset by ≥ 15 pp.

**Measurement.**

- **Telemetry:** Final `SkillMastery.state` per `(studentId, skillId)`.
- **Paper:** Per-skill subset post-test accuracy.
- Compute mean paper accuracy by mastery state.

**Success threshold.** Mean accuracy delta between MASTERED and non-MASTERED ≥ +15 pp on at least 2 skills.

**Falsification.** No skill shows a ≥ +5 pp delta. This would mean the in-app mastery signal is uncorrelated with real understanding — either the BKT priors are wrong or the mastery gate is too easy.

**Priority.** P1 — informative for tuning BKT priors, not blocking ship.

**Linked.** Skill mastery system (`data-schema.md §3.6`).

---

### H-07 — Hint Usage Inversely Correlates with Skill Progress (P1)

**Statement.** Students who use hints heavily early but reduce hint use over sessions are demonstrating learning. Students whose hint use does not decrease are stuck.

**Prediction.** For students who reach MASTERED on a skill, mean hints-per-attempt on the last session of that skill is ≤ 50% of the first session.

**Measurement.**

- **Telemetry:** For each `(studentId, skillId)`, compute `HintEvent` count per attempt across the first session vs. the last session in that skill.
- Compute reduction ratio.

**Success threshold.** ≥ 70% of student-skill pairs that achieved MASTERED show ≥ 50% hint reduction.

**Falsification.** < 30% of MASTERED pairs show that reduction. Indicates either hints are not effective or students are gaming the mastery gate by guessing.

**Priority.** P1.

**Linked.** `HintEvent` (`data-schema.md §3.4`).

---

## 3. Hypothesis Map

| H-ID | Type                                     | Priority | Primary Measurement             |
| ---- | ---------------------------------------- | -------- | ------------------------------- |
| H-01 | Identification mechanic teaches          | P0       | Paper pre/post                  |
| H-02 | Partitioning mechanic teaches            | P0       | Paper pre/post + telemetry      |
| H-03 | Comparison transfers to paper            | P0       | Paper pre/post                  |
| H-04 | Retention across days                    | P0       | Telemetry only                  |
| H-05 | No negative interaction                  | P0       | Paper pre/post + observer notes |
| H-06 | Mastery state predicts paper performance | P1       | Telemetry × paper               |
| H-07 | Hint reduction tracks learning           | P1       | Telemetry only                  |

---

## 4. What Counts as MVP Success

The MVP is **validated** when at least 4 of the 5 P0 hypotheses are supported by the playtest data, with no P0 hypothesis falsified.

The MVP is **invalidated** when any P0 hypothesis falsifies. This is the C10 stop signal: do not ship, do not market, do not scale. Either the curriculum or the mechanic needs rework.

The MVP is **partially validated** if 3 P0 hypotheses are supported, 0 falsify, and the remaining 2 are inconclusive (under-powered, etc.). In that case the recommendation is to expand the playtest cohort, not to ship.

---

## 5. Pre-registration

Per scientific norms, this document should be **frozen** before the first playtest session. The success thresholds and falsification criteria above must not be changed after data collection begins. If a threshold turns out to be wrong, document the lesson in the post-mortem and use a corrected threshold for the _next_ validation cycle, not retroactively.

The git commit that locks this file pre-playtest will be tagged `validation-v1-prereg`.

Last reviewed: 2026-04-25. (audit §1.1 fix: SK-NN references updated to canonical IDs; H-04 calibration requirement added)
