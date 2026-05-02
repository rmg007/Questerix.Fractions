---
title: Curriculum Roadmap — Complete Topic Map
status: reference
owner: solo
last_reviewed: 2026-05-02
applies_to: [mvp, post-mvp]
constraint_refs: [C3, C8]
---

# Curriculum Roadmap — Complete Topic Map

This document maps **all fraction concepts** from the Topics.docx reference, organized by progression and MVP status.

**Legend:**
- ✅ **In MVP (L1–L9)** — Implemented and validated
- 🟡 **Post-MVP** — Planned for future releases (Grade 3+)
- ⚠️ **Blocked** — Requires infrastructure not yet built

---

## Part 1: Equal Parts & Basic Identification (K–1)

### ✅ Equal Parts (Foundation)
- [ ] Equal parts: identify when shapes are divided equally
- [ ] Equal parts: 2 and 4 equal parts
- [ ] Equal parts: 2, 3, and 4 equal parts
- [ ] Identify equal parts (validation/discrimination)

**Archetypes in use:** `identify`, `partition`  
**Current coverage:** L1–L2 (7–6 questions)

### ✅ Identify Halves
- [x] Identify halves: basic (1/2 of a shape)
- [x] Identify halves: pizza/sandwich context
- [x] Identify halves: shade 1/2 of a shape
- [ ] Identify halves: across multiple shape families

**Archetypes in use:** `identify`  
**Current coverage:** L1 (3 questions)

### ✅ Identify Thirds & Fourths
- [x] Identify thirds: candy bar, basic context
- [x] Identify fourths: basic context
- [ ] Identify thirds: model-based
- [ ] Identify fourths: model-based

**Archetypes in use:** `identify`  
**Current coverage:** L2–L3 (3 questions in L2)

### ✅ Identify Eighths
- [ ] Identify eighths: pizza slices, 1/8 fraction
- [ ] Identify eighths: word problems (e.g., 3 of 8 eaten)

**Archetypes in use:** `identify`  
**Current coverage:** Not yet implemented

### ✅ Combined Identification
- [x] Identify halves, thirds, and fourths (L3)
- [ ] Identify halves, fourths, and eighths
- [ ] Sort pictures into halves, thirds, fourths
- [ ] Match each model to 1/2, 1/4, or 1/8

**Archetypes in use:** `identify`, `equal_or_not`  
**Current coverage:** L3 (4 equal_or_not questions with `shapeType` validation issue)

---

## Part 2: Making/Partitioning (1–2)

### ✅ Make Halves
- [x] Make halves: draw a line to split a shape into 2 equal parts
- [x] Make halves: fold-and-draw mechanics
- [x] Make halves: line of symmetry

**Archetypes in use:** `partition`, `make`  
**Current coverage:** L1 (4 partition questions), L4 (6 make questions)

### ✅ Make Thirds & Fourths
- [x] Make thirds: partition into 3 equal strips
- [x] Make fourths: split into 4 equal parts (various arrangements)
- [ ] Make thirds: two different ways
- [ ] Make fourths: two different ways

**Archetypes in use:** `partition`, `make`  
**Current coverage:** L4 (make halves only), pending L5

### ✅ Make Eighths
- [ ] Make eighths: partition into 8 equal boxes
- [ ] Shade 5/8 of a strip divided into eighths
- [ ] Show two different ways to make 8 equal parts

**Archetypes in use:** `make`  
**Current coverage:** Not yet implemented

### ✅ Make in Different Ways
- [ ] Make halves/thirds/fourths using different orientations (vertical vs. horizontal)
- [ ] Make eighths by splitting fourths in half
- [ ] Make eighths using 7 equally spaced vertical lines

**Archetypes in use:** `make`  
**Current coverage:** Planned for L5+

---

## Part 3: Labeling & Notation (1–2)

### ✅ Label Fractions
- [x] Label fractions: name parts (half, third, fourth, etc.)
- [ ] Label fractions: write numerator and denominator
- [ ] Label fractions: mixed models (2/3 shaded, etc.)

**Archetypes in use:** `label`  
**Current coverage:** L3 (2 label questions)

### 🟡 Write Fractions Using Words & Numbers
- [ ] Write "three fourths" as a fraction (3/4)
- [ ] Write 5/8 in words
- [ ] Write fractions in lowest terms / simplify

**Archetypes in use:** `label`  
**Current coverage:** Post-MVP (Grade 2+)

---

## Part 4: Equivalence (2–3)

### 🟡 Find Equivalent Fractions (Using Models)
- [ ] Use fraction strips to show 1/2 = 3/6
- [ ] Use area models: partition-and-split (e.g., 2/4 → 4/8)
- [ ] One model approach: split each part further
- [ ] Identify equivalent fractions on number lines

**Archetypes in use:** `benchmark`, visual models  
**Current coverage:** Post-MVP (L8 benchmark partially covers this)

### 🟡 Equivalent Fractions (Symbolic)
- [ ] Find equivalent fractions using multiplication/division
- [ ] Complete: 3/4 = ?/12 (missing numerator)
- [ ] Complete: 5/? = 15/24 (missing denominator)
- [ ] Patterns of equivalent fractions (1/2 = 2/4 = 3/6 = 4/8)
- [ ] Fractions with denominators 10 and 100

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Simplify to Lowest Terms
- [ ] Simplify 6/10 → 3/5
- [ ] Simplify 18/24 → 3/4
- [ ] Write in simplest form

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Fractions Equivalent to Whole Numbers
- [ ] Identify fractions equal to 1 (7/7, 8/8, etc.)
- [ ] Identify fractions equal to 2 (6/3, 10/5, etc.)
- [ ] Use models to show 8/8 = 1

**Archetypes in use:** Benchmarking  
**Current coverage:** Post-MVP

---

## Part 5: Snap & Match / Correspondence (1–2)

### ✅ Snap & Match
- [x] Match fractions to models (equal_or_not, identify patterns)
- [x] Snap matching: correspondence between partitions

**Archetypes in use:** `snap_match`  
**Current coverage:** L5 (5 snap_match questions)

---

## Part 6: Comparing Fractions (2–3)

### ✅ Compare With Like Denominators
- [x] Use models: 3/8 vs. 5/8 (fraction bars)
- [x] Graph on number lines: plot 1/7 and 5/7; which is greater?
- [x] Symbolic: 7/9 > 4/9

**Archetypes in use:** `compare`  
**Current coverage:** L6 (6 compare questions, same denominator)

### ✅ Compare With Like Numerators
- [ ] Use models: 3/4 vs. 3/8 (area models)
- [ ] Graph on number lines: 2/3 vs. 2/5; which is larger?
- [ ] Symbolic: 5/12 < 5/9

**Archetypes in use:** `compare`  
**Current coverage:** L7 (6 compare questions, same numerator)

### ✅ Compare With Unlike Denominators & Numerators
- [ ] Use models: 3/5 vs. 1/2 (fraction bars)
- [ ] Use benchmarks: 4/9 vs. 1/2 (using 1/2 as reference)
- [ ] Graph on number lines: 2/3 vs. 3/4
- [ ] Symbolic: 7/12 vs. 5/8

**Archetypes in use:** `compare`, `benchmark`  
**Current coverage:** L6–L7 (partial); L8 benchmark helps with reference points

### 🟡 Compare in Real-World Contexts
- [ ] Recipe comparison: 2/3 cup sugar vs. 3/4 cup (which uses more?)
- [ ] Measurement: 5/8 cup vs. 2/3 cup flour
- [ ] Distance/time problems

**Archetypes in use:** `compare`  
**Current coverage:** Post-MVP (word problems)

---

## Part 7: Ordering (2–3)

### ✅ Order Fractions (Same Denominator)
- [ ] Order 3/10, 7/10, 1/10, 9/10
- [ ] Order 5/12, 11/12, 2/12 (increasing)

**Archetypes in use:** `order`  
**Current coverage:** L9 (6 order questions, mixed)

### ✅ Order Fractions (Same Numerator)
- [ ] Order 3/4, 3/5, 3/8 (least to greatest)
- [ ] Order 7/9, 7/10, 7/6 (greatest to least)

**Archetypes in use:** `order`  
**Current coverage:** L9 (covered in mixed questions)

### ✅ Order Fractions (Unlike Denominators & Numerators)
- [ ] Order 2/3, 5/8, 3/4
- [ ] Order 7/6, 9/8, 5/4 (mixed numbers)
- [ ] Graph and order on number lines

**Archetypes in use:** `order`  
**Current coverage:** L9 (6 order questions, capstone)

### 🟡 Order Mixed Numbers
- [ ] Compare 2 1/3 and 2 1/5 using < or >
- [ ] Compare 3 3/4 vs. 3 5/8

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

---

## Part 8: Number Lines & Benchmarking (2–3)

### ✅ Fractions on Number Lines (Unit Fractions)
- [ ] Divide 0–1 into 6 equal parts; label 1/6
- [ ] Identify 1/8 on a 0–1 line marked in eighths

**Archetypes in use:** Visual placement (no drag yet)  
**Current coverage:** L8 benchmark (reference points: 0, 1/2, 1)

### ✅ Fractions on Number Lines (Non-Unit)
- [ ] Split 0–1 into 5 parts, label 2/5
- [ ] Mark 7/6 on a line, write as mixed number
- [ ] Locate 3/8 on a line marked in eighths

**Archetypes in use:** Visual / placement  
**Current coverage:** L8 (conceptually); placement archetype not yet implemented

### ✅ Benchmark Fractions
- [x] Recognize 1/2 as a benchmark (closer to 0, 1/2, or 1?)
- [x] Use benchmarks for comparison: 4/9 vs. 1/2 using 1/2

**Archetypes in use:** `benchmark`  
**Current coverage:** L8 (6 benchmark questions: 0, 1/2, 1)

### 🟡 Graph Fractions on Number Lines
- [ ] Plot 1/6, 3/8, 1/2 on the same line
- [ ] Plot 9/4 and 5/4; compare
- [ ] Plot 7/6 between 2 and 3

**Archetypes in use:** `placement` (drag to position)  
**Current coverage:** Post-MVP (archetype not yet built)

### 🟡 Identify Fractions on Number Lines
- [ ] Identify 1/4 on a 0–1 line split into 4 parts
- [ ] Identify the point at 5/8 on a marked line
- [ ] Identify what fraction corresponds to a marked point

**Archetypes in use:** `identify`  
**Current coverage:** Post-MVP (number-line variant of identify)

---

## Part 9: Decomposition (2–3)

### 🟡 Decompose Fractions (Unit Fractions)
- [ ] Write 3/5 as 1/5 + 1/5 + 1/5 (using models)
- [ ] Decompose 7/4 into unit fractions + mixed number

**Archetypes in use:** Visual decomposition  
**Current coverage:** Post-MVP

### 🟡 Decompose Fractions (Mixed)
- [ ] Decompose 11/6 as 6/6 + 5/6
- [ ] Decompose 8/3 as 1 + 1 + 2/3
- [ ] Show 7/4 as 1 + 3/4 and also as 1/4 × 7

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

---

## Part 10: Mixed Numbers (2–3)

### 🟡 Identify Mixed Numbers
- [ ] Recognize 1 3/5 as a mixed number
- [ ] Match pictures (2 wholes + 1/4) to 2 1/4

**Archetypes in use:** `identify`  
**Current coverage:** Post-MVP

### 🟡 Convert Between Mixed & Improper
- [ ] Convert 2 3/5 to 13/5
- [ ] Convert 11/4 to 2 3/4

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Add/Subtract Mixed Numbers
- [ ] Compute 2 3/8 + 1 2/8 (like denominators)
- [ ] Compute 5 3/4 − 2 1/8 (unlike denominators)
- [ ] Word problems: rope, hikers, recipes

**Archetypes in use:** `compare` (indirectly)  
**Current coverage:** Post-MVP

---

## Part 11: Addition & Subtraction (2–3)

### 🟡 Add/Subtract With Like Denominators
- [ ] Use models: 2/8 + 3/8 (area or strip model)
- [ ] Use number lines: 3/8 + 2/8 (hop forward)
- [ ] Symbolic: 5/9 + 2/9 = 7/9
- [ ] Subtract: 5/6 − 2/6 = 3/6

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Add/Subtract With Unlike Denominators
- [ ] Use models: 1/2 + 1/4 (show 1/2 = 2/4)
- [ ] Find LCD: 1/3 + 1/4
- [ ] Subtract: 5/6 − 1/4

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Add 3+ Fractions
- [ ] Compute 1/6 + 2/6 + 3/6
- [ ] Compute 1/2 + 1/3 + 1/6

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Add/Subtract Word Problems
- [ ] Noah biked 3/8 + 2/8 mile total
- [ ] A pitcher had 7/10 L; poured out 3/10 L; how much left?
- [ ] Recipe uses 3/4 cup sugar + 2/8 cup water; total liquid?

**Archetypes in use:** Computational + word problems  
**Current coverage:** Post-MVP

---

## Part 12: Multiplication (3+)

### 🟡 Multiply Unit Fractions by Whole Numbers
- [ ] Use models: 3 × 1/4 = 3/4
- [ ] Use number lines: 4 jumps of 1/5
- [ ] Compute: 9 × 1/7

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Multiply Fractions by Whole Numbers
- [ ] Use models: 3 × 2/5
- [ ] Use number lines: 3 jumps of 2/5
- [ ] Compute: 6 × 5/12

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Multiply Two Fractions
- [ ] Use area models: 2/3 × 3/4
- [ ] Compute: 4/5 × 3/7
- [ ] Simplify: 9/10 × 5/6

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Fractions of a Number
- [ ] Find 3/4 of 20 (model and compute)
- [ ] Find 2/5 of 50

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP (connects to division)

### 🟡 Multiply Mixed Numbers
- [ ] Compute 3 × 1 1/4
- [ ] Compute 1 1/2 × 2 1/3

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Multiply Word Problems
- [ ] Each lap is 3/8 mile; 6 laps = ? miles
- [ ] Recipe uses 2/3 cup per batch; 4 batches = ? cups

**Archetypes in use:** Computational + word problems  
**Current coverage:** Post-MVP

---

## Part 13: Division (3+)

### 🟡 Divide Unit Fractions by Whole Numbers
- [ ] Use models: (1/2) ÷ 3
- [ ] Use area models: (1/3) ÷ 2
- [ ] Compute: (1/6) ÷ 3

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Divide Whole Numbers by Unit Fractions
- [ ] Model 3 ÷ 1/2 (how many halves in 3?)
- [ ] Use area models: 2 ÷ 1/3
- [ ] Compute: 4 ÷ 1/8

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Divide Fractions by Fractions
- [ ] Use models: (1/2) ÷ (1/4)
- [ ] Compute: 3/5 ÷ 2/3
- [ ] Compute: 7/8 ÷ 1/4

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Divide Fractions Word Problems
- [ ] You have 3/4 cup juice split into 3 cups; how much per cup?
- [ ] How many 1/3-cup servings in 4 cups?
- [ ] A 2 1/2-lb bag split into 5 equal bags; pounds per bag?

**Archetypes in use:** Computational + word problems  
**Current coverage:** Post-MVP

### 🟡 Reciprocals & Multiplicative Inverses
- [ ] Find reciprocal of 3/5
- [ ] Find reciprocal of 2 1/3
- [ ] Which number makes (4/7) × __ = 1?

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

---

## Part 14: Fractions of Groups/Sets (2–3)

### 🟡 Fractions of a Group
- [ ] 1/3 of 12 apples = ? apples
- [ ] 3/5 of 25 marbles = ? marbles (how many are red?)
- [ ] 2/3 of 18 students bring lunch = ? students

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Fractions of a Group Word Problems
- [ ] A class has 30 students; 2/5 are in band; how many?
- [ ] You spend 3/10 of a 24-hour day reading; how many hours?

**Archetypes in use:** Computational + word problems  
**Current coverage:** Post-MVP

---

## Part 15: Connections to Decimals (3+)

### 🟡 Fractions to Decimals (Denominators 10 & 100)
- [ ] Convert 3/10 to 0.3
- [ ] Convert 47/100 to 0.47
- [ ] Convert 2 3/10 to 2.3

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Fractions to Decimals (General)
- [ ] Convert 5/8 to a decimal
- [ ] Convert 3 1/5 to a decimal

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Decimals to Fractions
- [ ] Convert 0.62 to a fraction
- [ ] Convert 1.4 to a mixed number

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Compare Decimals & Fractions
- [ ] Which is greater: 0.6 or 5/8?
- [ ] Order 3/4, 0.7, 2/3

**Archetypes in use:** `compare`  
**Current coverage:** Post-MVP

### 🟡 Repeating Decimals & Fractions
- [ ] Convert 0.3̄ to 1/3
- [ ] Convert 0.2̄7̄ to a fraction

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

---

## Part 16: Percentages (3+)

### 🟡 Percents as Fractions
- [ ] Convert 35% to 7/20
- [ ] Convert 3/8 to 37.5%
- [ ] Represent 62% as fraction + decimal

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Compare Percents & Fractions
- [ ] Which is greater: 45% or 1/2?
- [ ] Compare 30% and 2/5

**Archetypes in use:** `compare`  
**Current coverage:** Post-MVP

---

## Part 17: Data & Graphing (2–3)

### 🟡 Line Plots With Fractions
- [ ] Create a line plot: 1/4, 1/2, 3/4, 1/2, 1/4
- [ ] Interpret: 3 points at 3/8 means what?
- [ ] Find differences: greatest − least

**Archetypes in use:** Data collection + visualization  
**Current coverage:** Post-MVP

### 🟡 Fractions & Measurement
- [ ] 1/4 of an hour = ? minutes
- [ ] A 2 1/2-hour movie = ? minutes
- [ ] A ribbon is 3 1/4 ft; cut off 2/3 ft; how much remains?

**Archetypes in use:** Measurement + computational  
**Current coverage:** Post-MVP

---

## Part 18: Geometry & Area (3+)

### 🟡 Area With Fractions
- [ ] Rectangle: 3/4 ft × 2/3 ft = ? sq ft
- [ ] Rectangle: 1 1/2 m × 2/3 m = ? sq m

**Archetypes in use:** Computational (geometry)  
**Current coverage:** Post-MVP

### 🟡 Volume With Fractions
- [ ] Box: 1/2 ft × 2/3 ft × 3/4 ft = ? cu ft
- [ ] Box: 1 1/2 m × 2/3 m × 1/4 m = ? cu m

**Archetypes in use:** Computational (geometry)  
**Current coverage:** Post-MVP

---

## Part 19: Negative Fractions & Rational Numbers (3+)

### 🟡 Rational Numbers on Number Lines
- [ ] Plot −3/4 and 1/2 on same line
- [ ] Order −1/2, 0.3, 1/4

**Archetypes in use:** Number line / placement  
**Current coverage:** Post-MVP (Grade 3+)

### 🟡 Absolute Value
- [ ] |−2/5| = 2/5
- [ ] |1.75| and |−1.75|

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Add/Subtract Rational Numbers
- [ ] 3/4 + (−2/3)
- [ ] −5/6 − 1/4

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

### 🟡 Multiply/Divide Rational Numbers
- [ ] (−2/3) × (3/4)
- [ ] (5/6) ÷ (−1/3)

**Archetypes in use:** Computational  
**Current coverage:** Post-MVP

---

## MVP Summary

**Currently Implemented (L1–L9):**
- ✅ L1: Identify halves + partition introduction (7 questions)
- ✅ L2: Identify halves depth + partition (6 questions)
- ✅ L3: Equal/not equal + label (6 questions) ⚠️ *validation bug: missing shapeType*
- ✅ L4: Make halves (6 questions)
- ✅ L5: Snap & match (5 questions)
- ✅ L6: Compare same denominator (6 questions)
- ✅ L7: Compare same numerator (6 questions)
- ✅ L8: Benchmark (0, 1/2, 1) (6 questions)
- ✅ L9: Order fractions (6 questions)

**Total:** 54 questions across 9 levels

**Post-MVP Topics (Grade 3+):**
- Equivalence (all forms: models, number lines, symbolic)
- Addition & subtraction (like & unlike denominators)
- Multiplication (whole × fraction, fraction × fraction)
- Division (fractions ÷ fractions)
- Mixed numbers (identification, conversion, arithmetic)
- Fractions of groups/sets
- Decimals & percent conversions
- Rational numbers (negative fractions)
- Geometry (area, volume with fractions)
- Data & measurement

**Blocked/Future Archetypes:**
- `placement` — number-line drag (needs UI implementation)
- `explain_your_order` — open-ended reasoning (needs ML/teacher review)

---

## Gaps vs. Grade-Level Standards

### CCSS.1.G & CCSS.2.G Coverage
- ✅ **CCSS.1.G.A.3** (halves, partition): L1, L4
- ✅ **CCSS.2.G.A.3** (equal shares, rotation): L1–L2, L4
- 🟡 **CCSS.3.NF.A.1** (unit fractions): L1–L3 (basic), post-MVP (advanced)
- 🟡 **CCSS.3.NF.A.2** (fractions on number line): L8 (benchmark), post-MVP (placement)
- 🟡 **CCSS.3.NF.A.3** (equivalence): Post-MVP
- 🟡 **CCSS.3.NF.A.4** (addition/subtraction): Post-MVP

### K–1 (MVP)
Covers: partition, identify, label, make, benchmark (0, 1/2, 1), order

### 2–3 (Post-MVP Phase 1)
Covers: equivalence, compare (all types), add/subtract, multiply

### 3+ (Post-MVP Phase 2+)
Covers: division, mixed numbers, fractions of groups, decimals, negative numbers

---

## Implementation Readiness

| Topic | Archetype | Model(s) | Status |
|-------|-----------|----------|--------|
| Identify | `identify` | Area, set | ✅ Ready |
| Partition | `partition` | Area (drag) | ✅ Ready |
| Make | `make` | Area (drag) | ✅ Ready |
| Label | `label` | Text + area | ✅ Ready |
| Equal/Not | `equal_or_not` | Comparison | ⚠️ Validation bug |
| Snap Match | `snap_match` | Correspondence | ✅ Ready |
| Compare | `compare` | Area + symbols | ✅ Ready |
| Benchmark | `benchmark` | Number line | ✅ Ready |
| Order | `order` | Symbols | ✅ Ready |
| Placement | `placement` | Number line (drag) | 🔴 Not built |
| Explain | `explain_your_order` | Open-ended | 🔴 Not built |

---

## Notes

- **C3 constraint:** Levels 1–9 only (no Grade 3+ topics in MVP)
- **C8 constraint:** Linear denominator progression (halves → thirds → fourths)
- All post-MVP topics align with Grade 3–5 Common Core but are out of scope until Phase 3+
- Topics.docx represents ~3 years of educational design; current MVP covers ~6 weeks of instruction (Grades K–1)
