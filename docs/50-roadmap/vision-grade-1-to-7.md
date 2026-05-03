---
title: Vision — Grade 1 to Grade 7 Fraction Curriculum
status: active
owner: solo
last_reviewed: 2026-05-02
applies_to: [post-mvp]
constraint_refs: [C3]
related:
  - ../10-curriculum/standards-map.md
  - ../10-curriculum/scope-and-sequence.md
  - mvp-l1-l9.md
  - post-mvp-2029.md
supersedes: [Topics.docx]
---

# Vision — Grade 1 to Grade 7 Fraction Curriculum

This document captures the full K–7 fraction skill progression that Questerix Fractions is designed to eventually cover. It is the product-level vision, not a sprint plan. **MVP (Levels 1–9) covers Grade K–2 only**, per constraint C3. Grades 3–7 are explicitly post-MVP scope.

The skill inventory below was extracted from `Topics.docx` (2026-05-02) and organized into grade bands aligned to CCSS and common state standards.

> **C3 status:** C3 ("Levels 1–9 only — no Grade 3+ content") applies to the MVP. Decision D-05 documents the planned post-MVP expansion. C3 will be retired at the start of the Grade 3 build phase.

---

## Grade Band Overview

| Grade Band | Levels (planned) | Core concepts | CCSS anchors |
|---|---|---|---|
| **K** | L1–L2 | Equal parts, recognize halves | K.G.A.2 |
| **G1** | L3–L5 | Halves/thirds/fourths — identify, make, fold | 1.G.A.3 |
| **G2** | L6–L9 | Compare, benchmark, order | 2.G.A.3, 2.NF.2 |
| **G3** | L10–L18 | Eighths/sixths, number lines, equivalence, mixed numbers | 3.NF.A.1–3 |
| **G4** | L19–L28 | /10 and /100 fractions, word problems, line plots | 4.NF.A–C |
| **G5** | L29–L38 | Unlike denominators, fraction of a group, operations | 5.NF.A–B |
| **G6–G7** | TBD | Ratios, proportional reasoning | 6.RP, 7.RP |

Level numbers above G2 are **illustrative** — actual level numbering will be set when those phases are designed.

---

## Grade K (Levels 1–2) — Equal Parts Foundation

**Core question:** Can the student recognize when a whole has been split into equal parts?

| Skill cluster | Key activities | Denominators |
|---|---|---|
| Recognize equal vs. unequal splits | `equal_or_not`, `partition` | halves |
| Identify halves visually | `identify`, `label` | 2 |

---

## Grade 1 (Levels 3–5) — Identify and Make

**Core question:** Can the student identify and create halves, thirds, and fourths?

| Skill cluster | Key activities | Denominators |
|---|---|---|
| Identify halves, thirds, fourths | `identify`, `snap_match` | 2, 3, 4 |
| Make halves, thirds, fourths | `make`, `partition` | 2, 3, 4 |
| Make in different orientations | `partition` (rotated) | 2, 3, 4 |
| Compare halves and fourths | `compare` | 2, 4 |

---

## Grade 2 (Levels 6–9) — Compare and Order

**Core question:** Can the student reason about relative size of fractions?

| Skill cluster | Key activities | Denominators |
|---|---|---|
| Compare same denominator | `compare` | 2, 3, 4 |
| Compare same numerator | `compare` | 2, 3, 4 |
| Benchmark at 0, 1/2, 1 | `benchmark`, `placement` | 2, 3, 4 |
| Order 3+ fractions | `order`, `explain_your_order` | 2, 3, 4 |

---

## Grade 3 (Levels 10–18) — Number Line, Equivalence, Mixed Numbers

**Core question:** Can the student represent fractions on a number line and find equivalent fractions?

### 3a — Eighths and Sixths (new denominators)

| Skill cluster | Key activities | Denominators added |
|---|---|---|
| Identify eighths | `identify`, `label` | 8 |
| Identify sixths | `identify`, `label` | 6 |
| Make eighths, sixths | `make`, `partition` | 6, 8 |
| Make in different ways | `partition` | 6, 8 |
| Compare halves, fourths, eighths | `compare` | 2, 4, 8 |
| Compare halves, thirds, sixths | `compare` | 2, 3, 6 |

### 3b — Number Lines

| Skill cluster | Key activities |
|---|---|
| Fractions of number lines: unit fractions | `placement` on 0–1 |
| Identify unit fractions on number lines | `identify` from tick marks |
| Graph fractions < 1 | `placement` |
| Graph fractions > 1 and mixed numbers | `placement` (extended line) |
| Order fractions on number lines | `order` |

### 3c — Equivalent Fractions

| Skill cluster | Key activities |
|---|---|
| Find equivalent fractions (strips, area models) | `snap_match`, `make` |
| Equivalent fractions on number lines | `placement`, `identify` |
| Find equivalent fractions (multiply/divide) | `label`, `make` |
| Equivalent fractions for whole numbers | `identify`, `make` |
| Write fractions in lowest terms | `label` |
| Fractions with denominators of 10 and 100 | `identify`, `label` |

### 3d — Mixed Numbers and Improper Fractions

| Skill cluster | Key activities |
|---|---|
| Identify mixed numbers | `identify` |
| Convert improper ↔ mixed | `label`, `make` |
| Count fractions beyond 1 whole | `order`, `placement` |

---

## Grade 4 (Levels 19–28) — Word Problems and Line Plots

**Core question:** Can the student apply fraction knowledge to measurement and data contexts?

| Skill cluster | Key activities |
|---|---|
| Fractions of a group (unit fractions) | `make`, word problems |
| Fractions of a group (non-unit) | word problems |
| Fractions of a whole (word problems) | word problems |
| Write fractions using numbers and words | `label` |
| Decompose fractions into unit fractions | `make` |
| Create line plots with fractions | data/measurement activities |
| Compare fractions (any strategy) | `compare`, `benchmark` |
| Compare fractions: find missing numerator/denominator | `label`, `make` |
| Order fractions (mixed denominators) | `order` |

---

## Grade 5 (Levels 29–38) — Operations

**Core question:** Can the student add, subtract, and multiply fractions?

| Skill cluster | Key activities |
|---|---|
| Add/subtract fractions with like denominators | operations |
| Add/subtract fractions with unlike denominators | operations |
| Multiply a fraction by a whole number | operations |
| Multiply fractions by fractions | operations |
| Fraction word problems (all operations) | word problems |
| Compare fractions in context (recipes, measurements) | `compare` |

---

## Grade 6–7 (TBD) — Ratios and Proportional Reasoning

Mapped to 6.RP and 7.RP. Mechanic design TBD — the magnetic-drag partition mechanic may not extend naturally to ratio tables; a new mechanic may be needed.

Deferring until post-Grade-5 validation.

---

## Design Constraints for Post-MVP Levels

When building Grades 3+ levels, the following rules carry forward from the MVP:

1. **C1** (no backend) remains until explicitly lifted — all content is client-side.
2. **C4** (Phaser 4 + TS) remains until a deliberate migration decision is made.
3. **C8** (linear denominator progression) extends naturally: sixths and eighths are introduced in G3 only after halves/thirds/fourths are solid.
4. **C9** (sessions ≤ 15 min) is enforced at every level.
5. Every new level must pass the same validation gate: students demonstrate measurable learning gain across a 5-question session.

---

## Source Notes

Skill clusters above were derived from the IXL-style topic list in `Topics.docx` (ingested 2026-05-02). Examples were not ported — they live in the source file if needed for content authoring.
