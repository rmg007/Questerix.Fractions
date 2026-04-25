---
title: Standards Map (CCSS Crosswalk)
status: draft
owner: solo
last_reviewed: 2026-04-25
applies_to: [mvp]
constraint_refs: [C3, C8, C10]
related: [scope-and-sequence.md, levels/, misconceptions.md, ../50-roadmap/post-mvp-2029.md]
supersedes: [RoadMap/02_Level_03_05/03_STANDARDS_ALIGNMENT.md]
---

# Standards Map

CCSS crosswalk for the Questerix Fractions MVP. Lists every Common Core fraction-related standard from Grade K through Grade 2, plus a touchstone Grade 3 standard, and shows which MVP levels and skills cover it.

This document is informational only. Per **C2** (no teacher surface) the student never sees standards. Per **C10** (validation is the goal) standards alignment is a *secondary* concern — the primary measure is whether the mechanic teaches.

---

## 1. Reading the Coverage Column

| Coverage | Meaning |
|----------|---------|
| **full** | Every component of the standard is exercised by at least one in-scope MVP level with adequate question density (≥10 templates per skill) |
| **partial** | Some components are covered but at least one is deferred to post-MVP-2029 or addressed only in passing |
| **none** | Standard is referenced for context but has no MVP coverage; queued for post-MVP-2029 |
| **post-mvp-2029** | Standard is explicitly out of scope per C3 |

---

## 2. Kindergarten Standards

Kindergarten CCSS does **not** include any fraction standards in the Number & Operations strand. The only relevant K standard is geometric and is leveraged as a prerequisite for fraction work in Levels 1–2.

| Standard ID | Description | MVP Coverage | Levels | Skills |
|-------------|-------------|--------------|--------|--------|
| **K.G.A.2** | Correctly name shapes regardless of their orientations or overall size. | partial | L1, L2 | `SK-02` (identify halves visually) — rotated rectangles and circles in `equal_or_not` Tier 3 and `identify_half` Hard tier exercise this. We rely on the standard but do not formally teach it. (Canonical IDs per `skills.md`) |
| **K.G.B.6** | Compose simple shapes to form larger shapes. | none | — | Composition is touched obliquely in L4–L5 partition activities (the inverse of decomposition). Not a target outcome. |
| **K.CC.A.1–C.7** (counting & cardinality) | Count, compare numbers. | none | — | Out of scope; assumed prerequisite. The student must already count to 4 to handle Level 3 fourths. |

**Note:** Kindergarten students who reach Level 1 in the app rely on K.G.A.2 and basic cardinality as **prerequisites**, not as instructional targets. If a K student lacks shape vocabulary, the app does not remediate.

---

## 3. Grade 1 Standards

Grade 1 is where the formal "halves and fourths" standard appears. The bulk of MVP Levels 1–5 maps here.

| Standard ID | Description | MVP Coverage | Levels | Skills |
|-------------|-------------|--------------|--------|--------|
| **1.G.A.3** | Partition circles and rectangles into two and four equal shares; describe the shares using halves, fourths, quarters; describe the whole as two of, or four of the shares; understand that decomposing into more equal shares creates smaller shares. | **full** | L1, L2, L3, L4, L5 | `SK-01` (recognize equal partitioning), `SK-02` (identify halves), `SK-03` (use the word "half"), `SK-08` (identify fourths), `SK-11` (partition into halves), `SK-16` (partition into fourths) — see `skills.md` for canonical IDs |
| **1.G.A.1** | Distinguish defining vs. non-defining attributes of shapes. | partial | L1 | Touched in L1 `equal_or_not` activity (orientation does not change "halfness"). Not a primary target. |
| **1.G.A.2** | Compose 2-D shapes to create composite shapes. | none | — | Composition is the inverse of partition; addressed informally when a student "undoes" a partition. No dedicated activity. |
| **1.MD.B.3** | Tell and write time in hours and half-hours. | post-mvp-2029 | — | The "half hour" is a real-world fraction context but lives in the time/measurement strand. Out of scope per C3. |

### Notes on 1.G.A.3 coverage

- "Halves" coverage is delivered by L1–L2 (`identify_half`, `partition_halves`).
- "Fourths" coverage is delivered by L3–L4 (`identify_fourth`, `partition_fourths`).
- "Thirds" are NOT in CCSS 1.G.A.3 but are in many state standards (e.g., Virginia SOL 1.4). MVP includes thirds at L3 as an extension.
- "Decomposing into more equal shares creates smaller shares" is the magnitude precursor and is covered comparatively at L5 (review and L6+ comparison contexts).

---

## 4. Grade 2 Standards

Grade 2 introduces the comparison and benchmark concepts that MVP Levels 6–9 target. Symbolic notation `1/2` is also introduced here per the learning trajectory.

| Standard ID | Description | MVP Coverage | Levels | Skills |
|-------------|-------------|--------------|--------|--------|
| **2.G.A.3** | Partition circles and rectangles into two, three, or four equal shares; describe shares using halves, thirds, fourths; recognize that equal shares of identical wholes need not have the same shape. | **full** | L3, L4, L5, L6 | `SK-07` (thirds), `SK-08` (fourths), `SK-05` (equal halves under rotation — equal shares need not look identical), `SK-09` (use the word "third") — see `skills.md` |
| **2.NF.1** | (CCSS-aligned states' Grade 2 fraction standard, where present) Recognize that fractions describe equal parts of a whole and use unit fraction language. | **full** | L2, L3, L5 | `SK-03`, `SK-09`, `SK-21` (use symbolic fraction notation) — see `skills.md` |
| **2.NF.2** | Compare two fractions with the same numerator OR same denominator, by reasoning about their size; recognize that comparisons are valid only when the two fractions refer to the same whole. | **full** | L6, L7, L8, L9 | `SK-22` (same-denominator comparison), `SK-24` (same-numerator comparison), `SK-29` (benchmark to 1/2), `SK-30` (order 3+ fractions) — see `skills.md` |
| **2.MD.D.10** | Picture graphs / bar graphs. | none | — | Out of scope. |
| **2.OA.A.1** | Word problems within 100. | none | — | Out of scope. |

### Notes on 2.NF.2 coverage

- "Same-denominator comparison" → L6 (`compare_same_denominator`).
- "Same-numerator comparison" → L7 (`compare_same_numerator`). Heavy misconception load (M5: more pieces = bigger fraction).
- "Whole-referent" → enforced at L7 with explicit "same-pizza" framing in prompts.
- "Benchmark to 1/2" → L8 (`benchmark_sort`).
- "Order 3+ fractions" → L9 (`ordering_tournament`).

---

## 5. Grade 3 Standards (Touchpoint Only)

Grade 3 is **out of MVP scope**. One standard is listed because the L9 ordering activity provides natural extension into Grade 3 territory for advanced students.

| Standard ID | Description | MVP Coverage | Levels | Skills |
|-------------|-------------|--------------|--------|--------|
| **3.NF.A.3** | Explain equivalence of fractions in special cases; compare fractions by reasoning about their size. | **partial (extension only)** | L9 (Tier 3 hard problems) | `SK-30`/`SK-31` extend to ordering with mixed denominators; `SK-32` covers equivalent-fraction recognition during ordering. No formal equivalence taught. — see `skills.md` |
| **3.NF.A.1** | Understand a fraction 1/b as the quantity formed by 1 part when a whole is partitioned into b equal parts. | post-mvp-2029 | — | Symbolic notation arrives at L6 but is not formally taught as "1/b." |
| **3.NF.A.2** | Understand a fraction as a number on the number line. | post-mvp-2029 | — | Number-line activities exist (L8 placement) but the "fraction-as-number" framing is not explicit. |
| **3.NF.B** (any sub-standard) | Operations with fractions, equivalence, decomposition. | **post-mvp-2029** | — | All Grade 3+ operations are explicitly out of scope per C3. |

---

## 6. Standards Beyond MVP Scope (Post-MVP 2029)

The following standards are **explicitly flagged `post-mvp-2029`**. They are tracked here so that future curriculum extensions know where to plug in.

| Standard ID | Description | Why Deferred |
|-------------|-------------|--------------|
| 3.NF.A.1 | Unit fraction concept (1/b) | Requires symbolic notation curriculum; out of scope per C3 |
| 3.NF.A.2 | Fraction as a point on the number line | Number-line semantics in MVP are spatial only, not symbolic |
| 3.NF.A.3 (a–d) | Equivalence and comparison with mixed denominators | Beyond MVP scope; 3.NF.A.3 partially touched in L9 extension |
| 3.NF.B.* | Addition, subtraction, multiplication, division of fractions | Mechanic does not exist; scoped out of MVP per C3 |
| 4.NF.* | Equivalent fractions, mixed numbers, decimal conversion | Grade 4+; out of scope |
| 5.NF.* | Fraction operations across different denominators | Out of scope |
| 1.MD.B.3 | Half-hour time-telling | Time strand, not number strand |
| 2.MD.A.1–4 | Measurement | Out of scope |

---

## 7. Coverage Summary Table

| Standard ID | Coverage | Lead Levels |
|-------------|----------|-------------|
| K.G.A.2 | partial | L1, L2 |
| 1.G.A.3 | **full** | L1–L5 |
| 1.G.A.1 | partial | L1 |
| 1.G.A.2 | none | — |
| 2.G.A.3 | **full** | L3–L6 |
| 2.NF.1 | **full** | L2, L3, L5 |
| 2.NF.2 | **full** | L6–L9 |
| 3.NF.A.3 | extension only | L9 (Tier 3) |
| 3.NF.A.1, 3.NF.A.2 | post-mvp-2029 | — |
| 3.NF.B.* | post-mvp-2029 | — |
| 4.NF.*, 5.NF.* | post-mvp-2029 | — |

---

## 8. Audit Checklist (For Future Authoring)

When a new question template is authored, the author confirms:

1. [ ] The template's `skillIds` are declared in `levels/level-NN.md`.
2. [ ] Each skill traces to at least one CCSS standard listed above.
3. [ ] The standard listed is in the **full** or **partial** coverage tier — not `post-mvp-2029`.
4. [ ] If the template introduces a denominator family not covered by the level's `fractionPoolIds`, **stop** — this likely violates C8 (linear denominator progression).
5. [ ] If the template references mixed numbers, decimals, or operations, **stop** — this is out of MVP scope per C3.

---

## 9. Last-Reviewed Note

Standards revisions: CCSS revision is rumored for 2027. This map will be re-audited at that time. State-standard alignment (TEKS, Virginia SOL, California Framework) is informational only and lives in the parking lot until post-MVP.

Last reviewed: 2026-04-25. (audit §1.1 fix: SK-NN references updated to canonical IDs per skills.md)
