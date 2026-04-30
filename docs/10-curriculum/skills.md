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

| id              | name                                | description                                                                                             | gradeLevel | introduced | mastered | prerequisites     |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- | ---------- | -------- | ----------------- |
| `KC-HALVES-VIS` | Core Halving Recognition            | Identify equal partitions and halves across varied shapes, rotations, and orientations.                 | 1          | L1         | L2       | —                 |
| `KC-UNITS-VIS`  | Unit Fraction Recognition (1/3, 1/4)| Recognize and name regions divided into 3 or 4 equal parts; discriminate between them.                  | 2          | L3         | L3       | KC-HALVES-VIS     |
| `KC-SET-MODEL`  | Discrete Set Models                 | Identify halves, thirds, and fourths of collections of objects (set models).                            | 2          | L2         | L5       | KC-HALVES-VIS     |
| `KC-PRODUCTION-1`| Region & Length Halving             | Actively produce equal halves of areas and lengths (number line precursor) without assistance.          | 1          | L4         | L4       | KC-HALVES-VIS     |
| `KC-PRODUCTION-2`| Complex Partitioning                | Produce thirds/fourths; compositional partitioning (half-of-a-half); switching between targets.          | 2          | L5         | L5       | KC-PRODUCTION-1   |
| `KC-SYMBOL-BASIC`| Symbolic Reading & Same-Den Comp    | Read symbolic notation (1/b); compare fractions with same denominators.                                 | 2          | L6         | L6       | KC-UNITS-VIS      |
| `KC-SYMBOL-ADV` | Same-Num Comp & Unit Ordering       | Compare fractions with same numerators; order unit fractions; resist denominator bias (MC-WHB-02).      | 2          | L7         | L7       | KC-SYMBOL-BASIC   |
| `KC-MAGNITUDE`  | Number Line & Benchmarks            | Place fractions on a 0-1 number line; sort by landmarks (closer to 0, 1/2, 1).                          | 2          | L8         | L8       | KC-SYMBOL-ADV     |
| `KC-ORDERING`   | Mixed Denominator Ordering          | Order 3-5 fractions with mixed denominators; use benchmark-clustering strategies.                      | 2          | L9         | L9       | KC-MAGNITUDE      |

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
