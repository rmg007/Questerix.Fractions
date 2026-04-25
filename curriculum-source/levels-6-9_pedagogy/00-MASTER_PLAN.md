# Questerix Fractions — Grade 2 Module: Comparing & Ordering Fractions
## Master Plan

**Document Status:** Draft v1.0
**Date:** 2026-04-24
**Audience:** Product, Engineering, Curriculum, QA

---

## 1. Executive Summary

### What This Module Teaches

The Grade 2 Comparing & Ordering Fractions module gives students the conceptual foundation to reason about fraction magnitude before they encounter formal fraction arithmetic. Students develop number sense about fractions as quantities — not just symbols — by comparing, ordering, and placing fractions on number lines using multiple representations: area models, length models, set models, and symbolic notation.

By the end of this module, students can:
- Identify and generate fractions with denominators 2, 3, 4, 6, and 8
- Compare two fractions with the same numerator or the same denominator using <, =, >
- Order three or more fractions from least to greatest and greatest to least
- Recognize simple equivalent fractions (1/2 = 2/4 = 3/6) using visual models
- Explain their reasoning using benchmark fractions (0, 1/2, 1)
- Apply fraction comparison to real-world contexts (sharing, measuring, cooking)

### CCSS Standards Addressed

| Standard | Description | Coverage |
|----------|-------------|----------|
| **2.NF.1** | Understand a fraction 1/b as the quantity formed by 1 part when a whole is partitioned into b equal parts; understand a fraction a/b as the quantity formed by a parts of size 1/b | Primary |
| **2.NF.2** | Understand a fraction as a number on the number line; represent fractions on a number line diagram | Primary |
| **3.NF.3** | Explain equivalence of fractions in special cases, and compare fractions by reasoning about their size (same denominator, same numerator, benchmark comparisons) | Extension / Enrichment |

> **Note on 3.NF.3:** While technically a Grade 3 standard, comparative fraction reasoning emerges in Grade 2 enrichment contexts. Activities that target 3.NF.3 are gated behind a mastery check and labeled "Challenge" for students who complete the core sequence.

### Module Scope and Non-Goals

**In scope:**
- Fractions with denominators 2, 3, 4, 6, 8
- Unit fractions and non-unit fractions with numerators up to the denominator
- Visual models (pie, bar, number line, set)
- Benchmark reasoning (closer to 0, closer to 1/2, closer to 1)
- Simple equivalence (same-family fractions)

**Out of scope for this module:**
- Mixed numbers and improper fractions
- Adding or subtracting fractions
- Denominators beyond 8
- Fraction multiplication or division
- Converting fractions to decimals or percentages

---

## 2. Curriculum Architecture

### Core Activity Tree (5 Activities)

```
GRADE 2: COMPARING & ORDERING FRACTIONS
│
├── 01 — Fraction Magnitude Scales
│         Students place fractions on a balance scale to determine which is larger,
│         building intuition for fraction size through physical comparison metaphors.
│
├── 02 — Fraction Benchmark Battle
│         Students sort fractions into three zones (closer to 0 / closer to 1/2 /
│         closer to 1) using a drag-and-drop number line, racing against a soft timer.
│
├── 03 — Fraction Ordering Tournament
│         Students arrange 3–5 fractions from least to greatest in a bracket-style
│         tournament where each "match" is a pairwise comparison step.
│
├── 04 — Fraction Story Problems
│         Students apply comparison skills to narrative word problems involving
│         real-world contexts: recipes, distances, sharing, and measuring.
│
└── 05 — Fraction Snap
          Students play a rapid-fire matching game, snapping together equivalent
          fractions from a shuffled hand of cards before the timer expires.
```

### Extension Activity Tree (8 Activities — in EXTENSION_ACTIVITIES.md)

```
EXTENSIONS (unlock after core mastery)
│
├── 06 — Fraction Snap Battle (multiplayer Snap, up to 4 players)
├── 07 — Fraction Number Line Sprint (place 8 fractions on number line, timed)
├── 08 — Fraction Chef (apply ordering to recipe scaling scenarios)
├── 09 — Fraction Treasure Map (navigate a grid using fraction distances)
├── 10 — Mystery Fraction (guess a hidden fraction using comparison clues)
├── 11 — Fraction Dominoes (chain-matching game for equivalent fractions)
├── 12 — Build-a-Whole Workshop (combine fractions to fill a whole, creative sandbox)
└── 13 — Fraction Word Problem Creator (students author their own problems)
```

---

## 3. Learning Sequence Map

### Prerequisites Before This Module
- Student can count to 100
- Student understands equal parts / fair sharing (Grade 1 geometry standard 1.G.3)
- Student can use < > = with whole numbers
- Student has completed Questerix Fractions "Foundations" module (naming fractions)

### Unlock Tree

```
[FOUNDATIONS MODULE]
        |
        v
   [01 Magnitude Scales]  ←── Entry point. No prerequisites within this module.
        |
        v
   [02 Benchmark Battle]  ←── Requires: 01 with ≥75% accuracy on Level 3+
        |
        v
   [03 Ordering Tournament] ←── Requires: 02 with ≥70% accuracy on Level 3+
        |
   ─────┴────────────────
   |                    |
   v                    v
[04 Story Problems]  [05 Fraction Snap]
Requires: 03 ≥70%   Requires: 02 ≥75%
   |                    |
   └────────┬───────────┘
            v
     [MODULE COMPLETE — Core Badge]
            |
            v
     [Extension Activities Unlock]
```

### Recommended Classroom Sequence

| Week | Activity | Sessions | Goal |
|------|----------|----------|------|
| 1 | 01 Magnitude Scales, Levels 1–3 | 3 × 20 min | Same-denominator comparison with visual model |
| 2 | 01 Magnitude Scales, Levels 4–5 + 02 Benchmark Battle intro | 3 × 20 min | Same-numerator comparison; introduce benchmarks |
| 3 | 02 Benchmark Battle, Levels 1–4 | 3 × 20 min | Benchmark sorting fluency |
| 4 | 03 Ordering Tournament, Levels 1–3 | 3 × 20 min | 3-fraction ordering |
| 5 | 04 Story Problems + 05 Fraction Snap | 3 × 20 min | Applied comparison + equivalence snap |
| 6 | Review + Extension unlock | 2 × 20 min | Enrichment and consolidation |

---

## 4. Skill Taxonomy

Comparing fractions decomposes into the following 14 micro-skills. Each activity targets a subset; the full taxonomy is covered across the module.

| ID | Micro-Skill | Description | Primary Activity |
|----|-------------|-------------|-----------------|
| SK-01 | Equal parts identification | Recognize whether a shape is divided into equal parts | 01 |
| SK-02 | Fraction name ↔ symbol | Connect "three-fourths" to 3/4 and to the visual | 01, 05 |
| SK-03 | Same-denominator comparison | When denominators match, larger numerator = larger fraction | 01, 02 |
| SK-04 | Same-numerator comparison | When numerators match, larger denominator = smaller fraction | 01, 02 |
| SK-05 | Unit fraction ordering | 1/8 < 1/6 < 1/4 < 1/3 < 1/2 — understand inverse relationship | 01, 03 |
| SK-06 | Benchmark 0 proximity | Identify fractions close to zero | 02 |
| SK-07 | Benchmark 1/2 proximity | Identify fractions close to one-half | 02 |
| SK-08 | Benchmark 1 proximity | Identify fractions close to one whole | 02 |
| SK-09 | Number line placement | Place a fraction at the correct position on a number line | 02, 07 |
| SK-10 | 3-fraction ordering | Sort three fractions least-to-greatest | 03 |
| SK-11 | 5-fraction ordering | Sort five or more fractions | 03 |
| SK-12 | Equivalent fraction recognition | Identify 1/2 = 2/4 = 3/6 using visual models | 05 |
| SK-13 | Contextual comparison | Apply comparison to a real-world scenario | 04 |
| SK-14 | Comparison explanation | Articulate why one fraction is larger using a rule or model | 04 |

### Skill Progression Per Activity

```
Activity 01 covers: SK-01, SK-02, SK-03, SK-04, SK-05
Activity 02 covers: SK-06, SK-07, SK-08, SK-09, SK-03, SK-04
Activity 03 covers: SK-10, SK-11, SK-03, SK-04, SK-05
Activity 04 covers: SK-13, SK-14, SK-07, SK-08
Activity 05 covers: SK-12, SK-02
```

---

## 5. Difficulty Progression Matrix

Each activity has 10 difficulty levels. Levels 1–5 are the "core" levels. Levels 6–10 are unlocked for enrichment or high-performing students.

### Global Difficulty Parameters

| Level | Fractions Available | Model Support | Timer | Hint Budget | Notes |
|-------|--------------------|--------------|----|-------------|-------|
| 1 | 1/2, 1/4 only | Full visual model always shown | None | Unlimited | Onboarding / intro |
| 2 | 1/2, 1/3, 1/4 | Full visual model | None | 5 per session | Solidify halves/thirds/fourths |
| 3 | 1/2, 1/3, 1/4, 2/4, 3/4 | Visual model available on request | Soft (no penalty) | 4 per session | Introduce non-unit fractions |
| 4 | All denom 2,3,4 | Visual model on request | Soft (+10s penalty for hint) | 3 per session | Same-num comparison introduced |
| 5 | Denom 2,3,4,6 | Symbolic only; visual on hint | Moderate (90s total) | 2 per session | Sixths introduced |
| 6 | Denom 2,3,4,6,8 | Symbolic only | Moderate (75s total) | 2 per session | Eighths introduced |
| 7 | Denom 2,3,4,6,8 | None | Strict (60s total) | 1 per session | No model scaffold |
| 8 | Denom 2,3,4,6,8 (mixed) | None | Strict (45s) | 1 per session | Mixed comparison types |
| 9 | Any denom ≤12 | None | Speed (30s) | 0 | Expert fluency |
| 10 | Any denom ≤12 + equivalence | None | Speed (30s) | 0 | Mastery challenge |

### Fraction Set by Activity and Level

```
Magnitude Scales — Level 1: Compare (1/2, 1/4) with identical denominators
Magnitude Scales — Level 2: Compare (1/3, 2/3), (1/4, 3/4)
Magnitude Scales — Level 3: Compare (2/4, 3/4), (1/3, 2/3)
Magnitude Scales — Level 4: Compare across denominators (1/2 vs 2/3)
Magnitude Scales — Level 5: Compare (3/8 vs 1/2), (2/6 vs 1/3)

Benchmark Battle — Level 1: Sort {1/4, 3/4, 1/2} into 3 zones
Benchmark Battle — Level 2: Sort 5 unit fractions
Benchmark Battle — Level 3: Sort 5 non-unit fractions, denom 2/3/4
Benchmark Battle — Level 4: Sort 6 fractions, include sixths
Benchmark Battle — Level 5: Sort 7 fractions, eighths introduced, 90s timer

Ordering Tournament — Level 1: Order 3 fractions, same denominator
Ordering Tournament — Level 2: Order 3 fractions, mixed denominators (2,4 family)
Ordering Tournament — Level 3: Order 4 fractions, denom 2,3,4
Ordering Tournament — Level 4: Order 4 fractions, denom 2,3,4,6
Ordering Tournament — Level 5: Order 5 fractions, all denom ≤8, timed
```

### Adaptive Difficulty Triggers

```typescript
// Pseudocode: difficulty adjustment logic
function adjustDifficulty(session: SessionResult): DifficultyDelta {
  if (session.accuracy >= 0.90 && session.hintsUsed === 0) {
    return +1;               // accelerate
  }
  if (session.accuracy >= 0.80 && session.hintsUsed <= 1) {
    return 0;                // stay, consolidate
  }
  if (session.accuracy < 0.65 || session.frustrationSignals > 2) {
    return -1;               // step down
  }
  if (session.accuracy < 0.50) {
    return -2;               // major step down + scaffold reset
  }
  return 0;
}
```

---

## 6. Student Journey Narrative — Maya

### Background

Maya is a 7-year-old in a mixed-ability Grade 2 classroom. She's strong at whole-number arithmetic but has limited exposure to fractions beyond "half." Her teacher uses Questerix Fractions three times a week for 20-minute independent practice sessions.

### Week 1: First Contact — Magnitude Scales

Maya launches the app and meets Quex, the dragon mascot. The game opens with a giant balance scale. On one side sits a pizza cut into 2 equal slices. On the other, a pizza cut into 4 slices. Quex asks: "Which piece is bigger — one of these two pieces, or one of these four pieces?"

Maya taps the half-pizza, and the scale tips dramatically. A cheer plays. She's right. The game shows an animation of the halves being bigger and explains: "When the bottom number is smaller, each piece is bigger." Maya plays 8 more rounds at Level 1, getting 7 of 9 correct. The system detects she's ready and nudges her to Level 2.

At Level 2, thirds appear for the first time. Maya gets confused when comparing 1/3 vs 1/4 — she guesses 1/4 is bigger because "4 is bigger than 3." She triggers the hint, and the visual model shows both pizzas side by side. The third-pizza slice is visibly larger. Maya says "oh!" and gets the next three correct. The system notes this misconception (larger denominator = larger fraction) and flags it for her teacher's dashboard.

### Week 2: Building Confidence — Benchmark Battle

Maya unlocks Benchmark Battle. Three zones appear on the screen labeled "Almost 0," "Almost Half," and "Almost 1." Fractions rain down from the top. She has to drag each one into the right zone before it hits the ground.

At first she is slow and misses several. But she notices that 7/8 always goes in "Almost 1" and 1/8 always goes in "Almost 0." The middle zone is harder. She starts to realize that fractions close to 1/2 need more thought. By the end of week 2 she is at Level 3 with 81% accuracy.

### Week 3: Challenge — Ordering Tournament

Maya encounters 3-fraction ordering for the first time. The game frames it as a race: three fraction-creatures are about to run a track, and Maya must line them up smallest-to-largest before the starting gun fires.

She struggles with {1/3, 1/2, 3/4}. Her instinct is to order them by numerator, getting {1/3, 1/2, 3/4} correct by luck. But when the next set is {2/3, 3/4, 1/2}, she puts them in the wrong order. The hint system shows a quick number line and places each fraction. She recalibrates.

By Session 3 of week 3 she is reliably ordering three same-family fractions and beginning to succeed with mixed denominators.

### Week 4–5: Application and Snap

Story Problems introduces Maya to fraction comparison through narrative. A recipe needs 3/4 cup of flour; Maya only has a 1/2 cup scoop. Does she need more or less than one scoop? She correctly identifies she needs more and must scoop more than once. Real-world context anchors the abstract symbols.

Fraction Snap is Maya's favorite. It feels like a card game. She flips pairs of equivalent fractions — matching 2/4 to 1/2, matching 3/6 to 1/2. Her reaction time improves from ~4 seconds per match in week 1 to ~1.8 seconds by week 5.

### Week 6: Mastery and Extension

Maya earns the Core Module badge. She unlocks Fraction Snap Battle and invites a classmate to play. She wins the first match 7–5 and earns the "Snap Champion" trophy. Her teacher's dashboard shows consistent 85%+ accuracy across all five core activities, zero outstanding misconceptions, and hint usage declining to near zero over the last two sessions.

---

## 7. System Components

### 7.1 Search & Discovery Engine

The Search & Discovery Engine indexes all fraction problems, activities, and hint content. It powers:
- In-game hint retrieval: given a student's wrong answer and current fraction pair, retrieve the most relevant worked example
- Teacher search: query by standard, skill, or misconception to find relevant activities
- Curriculum alignment: map any problem to its CCSS standard and micro-skill

**Key design detail:** Search is semantic (embedding-based), not keyword-based. This handles student queries like "why is one-quarter less than one-half?" even without exact keyword matches.

See: `SEARCH_DISCOVERY_ENGINE.md`

### 7.2 Progression Engine

The Progression Engine tracks skill mastery across sessions and drives all difficulty adjustments. It maintains:
- Per-skill mastery estimate (0.0–1.0) using a modified Bayesian Knowledge Tracing model
- Session-level performance metrics (accuracy, hint usage, time-on-task, frustration signals)
- Cross-activity skill transfer (correct performance in Activity 01 boosts prior in Activity 02)

```typescript
interface StudentSkillState {
  skillId: string;         // e.g. "SK-03"
  masteryEstimate: number; // 0.0 to 1.0
  totalAttempts: number;
  correctAttempts: number;
  lastAttemptAt: Date;
  masteredAt?: Date;       // set when masteryEstimate >= 0.85
}
```

See: `PROGRESSION_ENGINE.md`

### 7.3 Adaptive Scaffolding System

The Adaptive Scaffolding System decides when and how to show hints, visual models, and worked examples. It uses three scaffolding levels:

- **Level A (Full):** Visual model always visible, no timer, unlimited hints
- **Level B (Prompted):** Visual model appears after one wrong answer or hint request
- **Level C (Minimal):** No automatic model; student must explicitly request, with hint budget

Scaffolding level is set independently from difficulty level and can diverge. A student might be at Difficulty Level 5 with Scaffolding Level B if they are accurate but rely heavily on visuals.

See: `PROGRESSION_ENGINE.md` Section 4

### 7.4 Teacher Dashboard

The Teacher Dashboard gives teachers:
- Class-level heatmap of skill mastery across all 14 micro-skills
- Individual student progress timelines with misconception flags
- Printable intervention suggestions keyed to specific misconceptions (e.g., "5 students confuse same-numerator rule; here are three targeted activities")
- Standards coverage report aligned to 2.NF.1, 2.NF.2, 3.NF.3
- Assignment creation: assign specific activities to individual students or groups

See: `TEACHER_DASHBOARD.md`

### 7.5 Parent Portal

The Parent Portal provides a simplified view for families:
- Weekly "fraction adventures" summary (activities played, skills earned, time spent)
- One-sentence explanation of what each badge means in plain language
- 3 suggested "kitchen table" activities to reinforce each week's learning
- No grades or scores shown — progress framed as exploration and growth

See: `TEACHER_DASHBOARD.md` Section 5 (Parent view)

### 7.6 Assessment Framework

The Assessment Framework distinguishes four assessment modes:
- **Embedded formative:** Every problem response is an assessment event; no student-visible score
- **Session summary:** Post-session skill update; teacher-visible only
- **Milestone check:** Gated skill check before activity unlock (5 problems, 4/5 required to pass)
- **Portfolio evidence:** Periodic "showcase" problems the student solves with explanation; saved to portfolio for parent/teacher review

See: `ASSESSMENT_FRAMEWORK.md`

### 7.7 Narrative Design Engine

The Narrative Design Engine manages the story layer — Quex the dragon, the quest framing, the world map, and the celebration moments. It ensures that:
- Every mastery event has a corresponding narrative beat (badge ceremony, Quex dialogue, map reveal)
- Difficulty increases are narrated as story progression, not ability judgments
- Failure states are reframed as "Quex needs your help figuring this out, let's try together"

See: `NARRATIVE_DESIGN.md`

### 7.8 Emotional Design System

The Emotional Design System monitors engagement signals and applies interventions to maintain the flow channel:
- **Boredom signals:** High accuracy + fast response + low engagement time → increase difficulty or suggest extension
- **Frustration signals:** Multiple consecutive errors + increased response time + hint requests → reduce difficulty, add scaffold, show encouragement
- **Flow state:** Balanced accuracy (70–85%) + consistent response time → maintain current parameters

See: `EMOTIONAL_DESIGN.md`

---

## 8. Risk Registry

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| R-01 | **Cognitive overload at Level 3+ transitions** | High | High | Introduce each new denominator with a dedicated "first encounter" flow; never introduce two new denominators in one session |
| R-02 | **Over-scaffolding dependency** | Medium | High | Track scaffold usage trends; fade scaffolding automatically when a student uses the same scaffold 3 sessions in a row without error |
| R-03 | **Frustration spirals at same-numerator problems** | High | Medium | Pre-emptively offer the "flip rule" micro-lesson (larger bottom = smaller piece) before any session where same-numerator problems first appear |
| R-04 | **Equivalence misconceptions (1/2 ≠ 2/4)** | Medium | High | Never introduce equivalence without a visual side-by-side; always show the model for equivalence problems until SK-12 is marked mastered |
| R-05 | **Timer anxiety causing avoidance** | Medium | Medium | Timers are soft (feedback only) until Level 6; always provide a no-timer mode accessible from settings for students with IEP/504 accommodations |
| R-06 | **Teacher dashboard overwhelm** | Low | Medium | Default view shows only top 3 flags per class; full data one click away; dashboard UX tested with 12 teachers in pilot |
| R-07 | **Mixed-ability classroom pacing mismatch** | High | Medium | Progression Engine runs per-student, not per-class; teacher can see divergence and assign targeted activities to sub-groups |
| R-08 | **Assessment mode invalidation (students gaming the system)** | Low | Low | Embedded formative is non-announced; students cannot tell which responses are "assessment events"; problem sequence is randomized per session |

---

## 9. Success Metrics

### Student Learning Outcomes

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Post-module accuracy (all 14 skills) | ≥ 80% across class | Embedded formative average |
| Milestone check pass rate | ≥ 85% on first attempt | Milestone check events |
| Hint usage decline | ≥ 40% reduction session 1 → session 10 | Hint event log |
| Time-to-mastery (median) | ≤ 6 weeks at 3 sessions/week | Progression Engine timestamps |
| Misconception resolution rate | ≥ 75% of flagged misconceptions resolved within 2 weeks of flag | Teacher dashboard + skill state |

### Engagement Metrics

| Metric | Target |
|--------|--------|
| Session completion rate | ≥ 90% of started sessions completed |
| Voluntary extension activity usage | ≥ 40% of students who complete core attempt ≥1 extension |
| Return rate (next school day) | ≥ 70% of students return the following session day |

### Teacher Satisfaction

| Metric | Target | Method |
|--------|--------|--------|
| "Useful for differentiation" rating | ≥ 4.2 / 5.0 | Post-pilot survey |
| Dashboard weekly active use | ≥ 60% of licensed teachers | Usage analytics |
| Curriculum alignment confidence | ≥ 85% agree "covers required standards" | Survey item |

### System Performance

| Metric | Target |
|--------|--------|
| Problem load time | < 400ms p95 |
| Progression Engine update latency | < 200ms post-session |
| Search Engine relevance (hint retrieval) | ≥ 80% teacher-rated "correct hint for situation" |

---

## 10. Milestone Roadmap

### Phase 1 — Core Five Activities (Target: 12 weeks from kickoff)

**Deliverables:**
- Activities 01–05 fully playable at Levels 1–5
- Progression Engine with BKT model for all 14 micro-skills
- Basic Teacher Dashboard (skill heatmap, individual timelines)
- Embedded formative assessment (non-visible to students)
- Quex narrative layer (onboarding, celebration moments, level-up dialogue)
- Adaptive Scaffolding at all three levels

**Acceptance Criteria:**
- [ ] All 14 micro-skills assessed across 5 activities
- [ ] Difficulty progression follows matrix in Section 5
- [ ] Teacher dashboard shows accurate per-student skill state within 1 session lag
- [ ] Frustration detection triggers scaffold increase within 2 consecutive error events
- [ ] All activities accessible with keyboard and switch access (accessibility baseline)
- [ ] 20 classroom pilot sessions completed with ≥ 3 teachers; pilot survey NPS ≥ 40

### Phase 2 — Extensions + Multiplayer (Target: 20 weeks from kickoff)

**Deliverables:**
- Extension Activities 06–13 fully playable
- Fraction Snap Battle multiplayer (local 2-player + async challenge mode)
- Teacher assignment workflow (assign to individual or group)
- Parent Portal (weekly summary email + in-app view)
- Full 10-level difficulty unlocked (Levels 6–10)
- Accommodation settings (no-timer mode, high-contrast mode, text-to-speech for all fractions)

**Acceptance Criteria:**
- [ ] Multiplayer session latency < 150ms for local play
- [ ] Extension activities correctly gate on core mastery prerequisites
- [ ] Parent Portal email verified by ≥ 10 parent pilot testers
- [ ] All accommodation modes pass WCAG 2.1 AA audit
- [ ] Pilot expansion: ≥ 8 classrooms, ≥ 150 students

### Phase 3 — AI Recommendations + Full Analytics (Target: 32 weeks from kickoff)

**Deliverables:**
- AI-powered teacher recommendation engine ("3 students ready to move to 3.NF.3 — here's a suggested activity sequence")
- Advanced analytics: class trajectory forecasting, early-warning system for at-risk students
- Student portfolio with shareable evidence of learning
- Curriculum designer tools: problem bank editor, skill taxonomy editor
- Search & Discovery Engine full deployment (semantic search for teachers and students)
- Integration API for district SIS (roster sync, grade passback)

**Acceptance Criteria:**
- [ ] AI recommendations accepted by teacher ≥ 60% of the time (implicit acceptance = following the suggestion within 1 week)
- [ ] Early-warning system flags at-risk students ≥ 2 weeks before milestone check failure (measured retrospectively on pilot data)
- [ ] SIS integration tested with ≥ 2 district SSO providers (Clever, ClassLink)
- [ ] Portfolio evidence rated "useful for parent conferences" by ≥ 80% of pilot teachers
- [ ] Full public launch readiness review passed

---

## Appendix A: Fraction Problem Bank Summary

| Denominator | Unit Fractions | Non-Unit Fractions | Total Unique Problems |
|-------------|---------------|-------------------|----------------------|
| 2 | 1/2 | — | 12 comparison pairs |
| 3 | 1/3 | 2/3 | 18 comparison pairs |
| 4 | 1/4 | 2/4, 3/4 | 32 comparison pairs |
| 6 | 1/6 | 2/6, 3/6, 4/6, 5/6 | 48 comparison pairs |
| 8 | 1/8 | 2/8, 3/8, 4/8, 5/8, 6/8, 7/8 | 72 comparison pairs |
| **Total** | | | **182 unique pairs** |

Each pair is tagged with: same-denominator / same-numerator / cross-denominator / unit-fraction-only / involves-benchmark.

---

## Appendix B: Misconception Taxonomy

| ID | Misconception | Description | Detection Signal | Intervention |
|----|--------------|-------------|-----------------|--------------|
| MC-01 | Larger denominator = larger fraction | Student treats denominator as a size indicator | Errors concentrated on same-numerator pairs | "Flip rule" micro-lesson + visual |
| MC-02 | Numerator-only comparison | Student ignores denominator entirely | Correct on same-denominator, wrong on cross | Side-by-side area model |
| MC-03 | Whole number ordering transfer | Student orders fractions like whole numbers (2/5 < 3/4 only because 2 < 3) | Errors on pairs where larger numerator = smaller fraction | Number line placement task |
| MC-04 | Equivalence as equality of digits | Student thinks 2/4 ≠ 1/2 because the digits differ | Snap errors on equivalent pairs | Area model overlay |
| MC-05 | Benchmark confusion | Student places 3/4 in "almost half" zone | Benchmark Battle errors on fractions near 3/4 | Explicit benchmark anchor cards |

---

*End of Master Plan v1.0*
