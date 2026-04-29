---
title: Skills Registry (Canonical)
status: active
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
---

# Skills Registry

Canonical, single-source-of-truth registry for every `skillId` tracked by the BKT engine. Each SK-NN defined here corresponds to exactly one `SkillMastery` record keyed by `skillId` in IndexedDB.

Per-level files (`levels/level-NN.md`) reference these IDs and may include local activity descriptions, but the **definition lives here**. If a per-level file's description conflicts with this registry, this file wins.

---

## 1. Purpose

Skills are **atomic learning targets** — the smallest unit of knowledge the engine can track independently. BKT (Bayesian Knowledge Tracing) runs per `(studentId, skillId)` pair. The `SkillMastery` table rows use `skillId` as part of the composite key.

Skills are NOT activity types, NOT mechanic labels, and NOT question difficulty tiers. A skill can be exercised by many activities across many levels.

---

## 2. Numbering Rule

- Sequential SK-01 through SK-NN; no gaps, no reuse.
- L6+ skills continue from where L5 ended (SK-21 follows SK-20).
- A skill is **never** renumbered once shipped in a content version. If a skill is retired, the ID is deprecated (marked `status: retired`) but not recycled.
- This file is the only place an SK-NN is assigned. Level files do not create new IDs.

---

## 3. Skill Registry

BKT default priors unless overridden in the level file: `P_init=0.10, P_transit=0.10, P_slip=0.10, P_guess=0.20`.

| id      | name                                                | description                                                                                                        | gradeLevel | introduced_in_level | mastered_in_level | prerequisites | bkt_priors                                           |
| ------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------- | ----------------- | ------------- | ---------------------------------------------------- |
| `SK-01` | Recognize equal partitioning                        | Identify whether a shape has been divided into parts of equal size                                                 | K          | L1                  | L1                | —             | `pInit=0.20, pTransit=0.25, pSlip=0.10, pGuess=0.30` |
| `SK-02` | Identify halves visually                            | Identify which shape shows one of two equal parts (one half) highlighted                                           | K          | L1                  | L1                | SK-01         | `pInit=0.15, pTransit=0.20, pSlip=0.10, pGuess=0.25` |
| `SK-03` | Use the word "half"                                 | Apply the word "half" to one of two equal parts in audio and label contexts                                        | K          | L1                  | L1                | SK-02         | `pInit=0.10, pTransit=0.20, pSlip=0.10, pGuess=0.25` |
| `SK-04` | Identify halves across shape families               | Identify halves across circle, rectangle, triangle, and irregular shapes                                           | 1          | L2                  | L2                | SK-01, SK-02  | `pInit=0.20, pTransit=0.25, pSlip=0.10, pGuess=0.30` |
| `SK-05` | Identify halves under rotation                      | Identify halves regardless of shape orientation or fold direction                                                  | 1          | L2                  | L2                | SK-04         | `pInit=0.15, pTransit=0.20, pSlip=0.10, pGuess=0.25` |
| `SK-06` | Identify halves of a set                            | Recognize when a highlighted subset is one half of the total count                                                 | 1          | L2                  | L2                | SK-02         | `pInit=0.10, pTransit=0.18, pSlip=0.12, pGuess=0.30` |
| `SK-07` | Identify thirds                                     | Recognize a shape divided into exactly 3 equal parts                                                               | 2          | L3                  | L3                | SK-01         | `pInit=0.10, pTransit=0.18, pSlip=0.10, pGuess=0.25` |
| `SK-08` | Identify fourths / quarters                         | Recognize a shape divided into exactly 4 equal parts                                                               | 1          | L3                  | L3                | SK-01, SK-02  | `pInit=0.15, pTransit=0.22, pSlip=0.10, pGuess=0.25` |
| `SK-09` | Use the words "third" and "fourth/quarter"          | Apply fraction vocabulary correctly, including the synonym "quarter" for "fourth"                                  | 2          | L3                  | L3                | SK-07, SK-08  | `pInit=0.08, pTransit=0.20, pSlip=0.10, pGuess=0.25` |
| `SK-10` | Discriminate thirds from fourths                    | Visually distinguish thirds from fourths in side-by-side comparisons                                               | 2          | L3                  | L3                | SK-07, SK-08  | `pInit=0.05, pTransit=0.18, pSlip=0.12, pGuess=0.25` |
| `SK-11` | Produce equal halves of a region                    | Drag a partition line to create two equal-area parts of a rectangle, square, or circle                             | 1          | L4                  | L4                | SK-02, SK-03  | `pInit=0.20, pTransit=0.25, pSlip=0.10, pGuess=0.15` |
| `SK-12` | Produce halves under varied orientation             | Produce equal halves of irregular shapes and rotated rectangles without snap assistance                            | 1          | L4                  | L4                | SK-11         | `pInit=0.10, pTransit=0.20, pSlip=0.12, pGuess=0.10` |
| `SK-13` | Halve a length                                      | Drag a marker to the midpoint of a strip or ribbon                                                                 | 1          | L4                  | L4                | SK-11         | `pInit=0.15, pTransit=0.22, pSlip=0.10, pGuess=0.15` |
| `SK-14` | Self-check: recognize unequal halves and revise     | Notice when produced partition is not yet equal and retry without prompting                                        | 1          | L4                  | L4                | SK-11         | `pInit=0.05, pTransit=0.18, pSlip=0.15, pGuess=0.05` |
| `SK-15` | Produce equal thirds of a region                    | Drag two partition lines to create three equal-area parts                                                          | 2          | L5                  | L5                | SK-07, SK-11  | `pInit=0.08, pTransit=0.18, pSlip=0.12, pGuess=0.10` |
| `SK-16` | Produce equal fourths of a region                   | Drag partition lines to create four equal-area parts (parallel, perpendicular, or diagonal configurations)         | 1          | L5                  | L5                | SK-08, SK-11  | `pInit=0.15, pTransit=0.22, pSlip=0.10, pGuess=0.10` |
| `SK-17` | Compositional production: fourths as half-of-a-half | Produce fourths by halving, then halving each half (two-step interaction)                                          | 1          | L5                  | L5                | SK-16, SK-14  | `pInit=0.05, pTransit=0.20, pSlip=0.10, pGuess=0.05` |
| `SK-18` | Produce equal thirds / fourths of a length          | Mark two or three points to divide a ribbon into equal segments                                                    | 2          | L5                  | L5                | SK-13, SK-15  | `pInit=0.10, pTransit=0.20, pSlip=0.12, pGuess=0.10` |
| `SK-19` | Split a set into 3 or 4 equal groups                | Tap to assign objects from a set into 3 or 4 equal-count groups                                                    | 2          | L5                  | L5                | SK-16         | `pInit=0.15, pTransit=0.22, pSlip=0.10, pGuess=0.15` |
| `SK-20` | Denominator-switching fluency                       | Complete consecutive attempts with different denominator targets (halves ↔ thirds ↔ fourths) without accuracy loss | 2          | L5                  | L5                | SK-15, SK-16  | `pInit=0.05, pTransit=0.18, pSlip=0.15, pGuess=0.08` |
| `SK-21` | Read symbolic fraction notation                     | Read `a/b` notation and match to a corresponding partitioned shape                                                 | 2          | L6                  | L6                | SK-09         | `pInit=0.20, pTransit=0.25, pSlip=0.10, pGuess=0.25` |
| `SK-22` | Same-denominator comparison                         | Given two fractions with equal denominators, identify which is larger using the numerator rule                     | 2          | L6                  | L6                | SK-21         | `pInit=0.30, pTransit=0.30, pSlip=0.10, pGuess=0.33` |
| `SK-23` | Use relational symbols `<`, `=`, `>`                | Apply `<`, `=`, `>` correctly between two fractions                                                                | 2          | L6                  | L6                | SK-22         | `pInit=0.20, pTransit=0.25, pSlip=0.10, pGuess=0.33` |
| `SK-24` | Same-numerator comparison                           | Given two fractions with equal numerators, identify which is larger using the inverse-denominator rule             | 2          | L7                  | L7                | SK-22         | `pInit=0.10, pTransit=0.20, pSlip=0.15, pGuess=0.33` |
| `SK-25` | Unit-fraction ordering                              | Order unit fractions (1/2, 1/3, 1/4, 1/6, 1/8) from largest to smallest                                            | 2          | L7                  | L7                | SK-24         | `pInit=0.15, pTransit=0.25, pSlip=0.10, pGuess=0.20` |
| `SK-26` | Resist whole-number bias on denominator             | Avoid the error of picking `1/4 > 1/3` because `4 > 3` (MC-WHB-02)                                                 | 2          | L7                  | L7                | SK-24         | `pInit=0.20, pTransit=0.30, pSlip=0.15, pGuess=0.50` |
| `SK-27` | Number-line placement (single fraction)             | Drag a fraction card to the approximately correct position on a 0–1 number line                                    | 2          | L8                  | L8                | SK-25         | `pInit=0.15, pTransit=0.20, pSlip=0.15, pGuess=0.10` |
| `SK-28` | Benchmark proximity sorting                         | Sort fractions into zones: closer to 0, closer to 1/2, closer to 1                                                 | 2          | L8                  | L8                | SK-27         | `pInit=0.20, pTransit=0.25, pSlip=0.10, pGuess=0.33` |
| `SK-29` | Benchmark 1/2 rule                                  | Determine whether a fraction is bigger, smaller, or equal to 1/2 using the rule `a > b/2`                          | 2          | L8                  | L8                | SK-28         | `pInit=0.10, pTransit=0.25, pSlip=0.15, pGuess=0.33` |
| `SK-30` | Order 3 fractions, mixed denominators               | Order three fractions from smallest to largest or largest to smallest                                              | 2          | L9                  | L9                | SK-27, SK-28  | `pInit=0.10, pTransit=0.20, pSlip=0.15, pGuess=0.17` |
| `SK-31` | Order 4–5 fractions, mixed denominators             | Order four or five fractions with mixed denominators                                                               | 2          | L9                  | L9                | SK-30         | `pInit=0.05, pTransit=0.15, pSlip=0.20, pGuess=0.04` |
| `SK-32` | Equivalent-fraction recognition during ordering     | Recognize that `1/2` and `2/4` are interchangeable in an ordering sequence                                         | 2          | L9                  | L9                | SK-29         | `pInit=0.10, pTransit=0.20, pSlip=0.15, pGuess=0.10` |
| `SK-33` | Benchmark-cluster-then-order strategy               | Group fractions by benchmark zone, then order within each cluster                                                  | 2          | L9                  | L9                | SK-28, SK-30  | `pInit=0.05, pTransit=0.20, pSlip=0.15, pGuess=0.10` |

---

## 4. Skill Lifecycle

Each skill progresses through states tracked in `SkillMastery.state`:

1. **NOT_STARTED** — the student has not yet encountered any questions tagged with this skill.
2. **LEARNING** — 1+ attempts; BKT posterior < 0.65.
3. **APPROACHING** — BKT posterior ≥ 0.65 and < 0.85.
4. **MASTERED** — BKT posterior ≥ 0.85 AND `consecutiveCorrectUnassisted` ≥ 3.
5. **DECAYED** — was MASTERED, but a spacing gap or wrong-answer pattern has pulled the posterior back below 0.65.

**Mastery gates** in each level file reference the MASTERED state for a subset of skills as the condition for unlocking the next level.

---

## 5. Revision Log

| Date       | Change                                                                                                                                                                         | Reason                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| 2026-04-24 | Created. Resolved SK-ID collisions across L3/L4/L5/L6/L7/L8. Removed G4.5 / halve-a-set skill from L4 (was old SK-14). Renumbered L4–L9 skills sequentially from SK-11 onward. | audit §1.1 fix; audit §1.6 G4.5 cut |
