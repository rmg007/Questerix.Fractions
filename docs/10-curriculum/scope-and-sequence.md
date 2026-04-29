---
title: Scope and Sequence
status: draft
owner: solo
last_reviewed: 2026-04-25
applies_to: [mvp]
constraint_refs: [C3, C8]
related: [levels/, ../00-foundation/constraints.md, ../30-architecture/data-schema.md]
supersedes: [Topics.docx]
---

# Scope and Sequence

Defines what fraction concepts the MVP covers, in what order, with what density. Replaces the original `Topics.docx` (which is now in `_quarantine/`).

This document is a **planning artifact**, not a question bank. Detailed question banks live in `levels/level-01.md` through `levels/level-09.md`.

---

## 1. Source Inventory

The original `Topics.docx` contained **422 topic headings** with **844 example questions** (2 per topic). After categorizing against the MVP scope (C3):

| Category                                              | Topics                               | Notes                             |
| ----------------------------------------------------- | ------------------------------------ | --------------------------------- |
| **Level 1-5 (Grade K-1)** — partition, identify, make | 38 + ~50 from "uncategorized" review | Within scope                      |
| **Level 6-9 (Grade 2)** — compare, order, benchmark   | 62 + ~30 from "uncategorized" review | Within scope                      |
| **Out of scope** — Grade 3+                           | 238                                  | Defer to post-MVP-2029            |
| **Uncategorized**                                     | 4                                    | Truly ambiguous, mark as "review" |

**Key finding:** The Topics inventory is _broad but shallow_. 2 examples per topic is **not enough** for adaptive difficulty, retry on failure, or session variety. We need 10–15 questions per topic minimum for a usable MVP.

---

## 2. MVP Topic Inventory

### 2.1 Levels 1–5: Partition · Identify · Make (Grade K–1)

The mechanic is mostly drag-snap and shape partitioning. ~88 topics fit here.

| Level  | Concept Cluster             | Topic Count (approx) | Mechanics in Scope        |
| ------ | --------------------------- | -------------------- | ------------------------- |
| **L1** | Equal parts: 2              | ~6                   | partition, identify-equal |
| **L2** | Identify halves             | ~12                  | identify, label, match    |
| **L3** | Identify thirds and fourths | ~14                  | identify, label, match    |
| **L4** | Make halves                 | ~8                   | make, fold, partition     |
| **L5** | Make thirds and fourths     | ~12                  | make, fold, partition     |

Per C8, denominators are introduced linearly: halves first (L1–L2), thirds (L3), fourths (L3–L4), then mixed practice (L5).

### 2.2 Levels 6–9: Compare · Order · Benchmark (Grade 2)

The mechanic shifts: drag-snap on a number line, comparison battles, ordering tournaments. ~92 topics fit here.

| Level  | Concept Cluster          | Topic Count (approx) | Mechanics in Scope           |
| ------ | ------------------------ | -------------------- | ---------------------------- |
| **L6** | Compare same denominator | ~10                  | compare, side-by-side        |
| **L7** | Compare same numerator   | ~12                  | compare, magnitude reasoning |
| **L8** | Benchmark to 0, 1/2, 1   | ~16                  | benchmark sort, number line  |
| **L9** | Order 3+ fractions       | ~14                  | ordering, tournament bracket |

### 2.3 Out of Scope (Post-MVP 2029)

The 238 out-of-scope topics include:

- Addition / subtraction with like denominators
- Mixed numbers and improper fractions
- Decomposition into unit fractions
- Decimal ↔ fraction conversion
- Reducing to lowest terms
- Multiplication and division
- Denominators of 10 and 100
- Fraction word problems (advanced, multi-step)

These are valid future work but are explicitly excluded from MVP per C3.

---

## 3. Topic-to-Mechanic Mapping

The original Topics.docx assumes a paper-and-pencil context ("Draw a line", "Shade 1/2 of..."). The app needs digital equivalents. This table maps topic verbs to app mechanics:

| Topic verb                         | App mechanic                 | Question type    |
| ---------------------------------- | ---------------------------- | ---------------- |
| "Identify..."                      | tap-select                   | `identify`       |
| "Shade..."                         | tap-cell                     | `shade`          |
| "Match..."                         | drag-pair                    | `snap_match`     |
| "Draw a line to split..."          | drag-divider                 | `partition`      |
| "Fold..."                          | drag-fold-line               | `fold`           |
| "Label..."                         | drag-label-to-target         | `label`          |
| "Compare..."                       | tap-greater \| less \| equal | `comparison`     |
| "Order..."                         | drag-to-sequence             | `ordering`       |
| "Place on number line"             | drag-to-position             | `placement`      |
| "Is X bigger or smaller than 1/2?" | tap-zone                     | `benchmark_sort` |

A topic that requires a mechanic not on this list is flagged and either dropped or rewritten.

---

## 4. Question Density Targets

The Topics.docx delivers 2 examples per topic. That is insufficient. Recommended density per topic:

| Tier                | Examples needed | Purpose                                            |
| ------------------- | --------------- | -------------------------------------------------- |
| **Tier 1: Easy**    | 4–5             | First-encounter, scaffolded                        |
| **Tier 2: Medium**  | 4–5             | Practice with reduced scaffolding                  |
| **Tier 3: Hard**    | 3–4             | Mastery check, no scaffolding                      |
| **Total per topic** | **12–14**       | Allows adaptive difficulty + retry without repeats |

For ~180 in-scope topics across MVP, this means **~2,200 question instances** (180 × 12). That's a content-authoring workload measured in weeks, not days.

**Mitigation strategy:** Many questions are _parameterized_ (e.g., "Place X on the number line" works for any X in the fraction pool). A single QuestionTemplate with parameter substitution can generate 5–20 instances. Realistic authoring effort is closer to **~250 unique templates** producing ~2,000 instances.

---

## 5. Authoring Workflow

For each MVP level (1–9):

1. **Pick the level from the table in §2** → know which topic cluster + mechanics apply
2. **List the topics** that map to in-scope mechanics
3. **Write the QuestionTemplate set** in `levels/level-NN.md`:
   - Use parameterized templates where possible
   - Specify difficulty tier per template
   - Map each template to one or more SkillIds and (optionally) MisconceptionIds
4. **Write the validator function spec** for each template type (placement, comparison, etc.)
5. **Cross-check coverage** against §2 to make sure no topic cluster is left empty

Authoring order: **L1 first** (smallest scope, simplest mechanic). Don't open L2 until L1 is complete. The first level is the calibration loop — every later level reuses its patterns.

---

## 6. What Lives Where

| Concern                               | Document                                                          | Relationship                                                                |
| ------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Topic inventory + grouping (this doc) | `scope-and-sequence.md`                                           | Source of truth for what's in scope                                         |
| Per-level question banks              | `levels/level-NN.md`                                              | Concrete templates, validators, fraction pools                              |
| Skill taxonomy (SK-\* IDs)            | `skills.md` (canonical registry — 33 skills, SK-01 through SK-33) | Each question is tagged with skills; level files reference IDs defined here |
| Standards crosswalk                   | `standards-map.md` (TBD)                                          | Each topic linked to CCSS code                                              |
| Misconceptions                        | `misconceptions.md` (TBD)                                         | Salvaged from `RoadMap/02_Level_03_05/misconceptions/`                      |
| Mechanic specifications               | `../20-mechanic/activity-archetypes.md`                           | How each mechanic actually works                                            |

---

## 7. Open Questions to Resolve Before Authoring L1

1. **Visual model preference.** Topics.docx mixes circles, rectangles, bars, sets, and number lines. Pick a _primary_ visual model per level, with secondary models gated behind mastery. Recommended: rectangles primary in L1–L2 (easiest to partition geometrically), circles secondary in L3+ (introduces angle reasoning).

2. **Symbolic notation introduction.** Per `RoadMap/02_Level_03_05/02_LEARNING_TRAJECTORY.md`, formal "1/2" notation is delayed to Grade 2. For MVP this means L1–L5 use **labels and words** ("one half", "1 of 2 equal parts") and **L6+ uses symbols**. This is a real constraint; many Topics.docx items show "1/2" in early grades.

3. **Audio narration scope.** Many K–1 students cannot read fluently. Each question template needs a TTS key (`prompt.ttsKey`). Decide: pre-recorded audio assets vs. browser SpeechSynthesis API. Recommended: SpeechSynthesis for MVP (zero-cost, immediate), pre-recorded post-validation.

4. **Locale handling.** MVP ships English only (per CurriculumPack). The schema supports `localeStrings` but no Spanish content is authored. Confirm this matches intent.

---

## 8. Next Step

The very next document to write is `levels/level-01.md` — the question bank for Level 1 (equal parts: halves). Once that is complete and reviewed, the pattern is established and L2–L9 follow the same template.
