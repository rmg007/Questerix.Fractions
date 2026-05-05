# Audit & Pilot Protocol Documentation

**Generated:** 2026-05-05  
**Scope:** Plan 13 (Content-Archetype Expansion, Phase 1) + Plan 15 (Pilot Protocol, Phases 1–4)  
**Status:** Ready for Round 1 testing

---

## Contents

### 1. Archetype Inventory & Expansion Planning
**File:** `archetype-distribution.json`  
**Purpose:** Audit of current archetype distribution (L1–L9) against expansion targets

**Key findings:**
- **7/9 levels** are archetype-monolithic (only 1 archetype per level)
- **2/9 levels** have 2 archetypes (L2, L3)
- **0/9 levels** meet the 3-archetype minimum target
- **Question depth:** L1–L3 are thin (3–4 q per archetype); L4–L9 meet depth target (5–6 q)

**Expansion priorities:**
- **P1 (Critical):** L1–L3 → expand within archetypes + add 1 new per level
- **P2 (Bottleneck):** L4–L5 → inject compare/snap_match variants to make-focused levels
- **P3 (Capstone):** L6–L9 → ensure 2–3 supporting archetypes per level before L7–L9

---

### 2. Ethical & Consent Framework
**File:** `pilot-protocol-01-consent.md`  
**Purpose:** Legal/ethical foundation for K–2 learner testing

**Includes:**
- Study overview (formative validation, no IRB required)
- Participant eligibility criteria
- Parent/guardian acknowledgment form (opt-in checkboxes)
- Child assent script (read aloud, simple language)
- Educator acknowledgment (if school-based)
- Session-day checklist
- 15-day data retention policy
- COPPA compliance notes

**Preparation checklist:**
- [ ] Print and have parent sign consent form (keep separate from data)
- [ ] Prepare assent script for facilitator
- [ ] Coordinate with school/educator (if applicable)
- [ ] Test device before session
- [ ] Prepare stickers or small rewards
- [ ] Set up screen recording (if applicable, with consent)

---

### 3. Round 1: Friction-Discovery Protocol (Usability Testing)
**File:** `pilot-protocol-02-friction-discovery.md`  
**Purpose:** Identify where K–2 learners hesitate, fail, or abandon L1–L3 tasks

**Session structure:**
- Pre-session assent + no demo (2 min)
- Gameplay L1→L2→L3 (20–22 min)
- Post-gameplay debrief (6–8 min)

**Data captured:**
- **Per-task metrics:** Success/fail, hesitation time, hint given
- **Friction categories:** Interaction, conceptual, motivation, visual, device
- **Verbatim quotes:** Child reasoning & misconceptions
- **Distractor selection logs:** Which wrong answers kids pick (identifies misconception traps)

**Sample size:** 8–12 K–2 learners, 30 min per session

**Decision gate:**
- **GREEN** (≥85% success, ≤8 sec hesitation) → proceed to Protocol 3
- **YELLOW** (70–84% success, 8–15 sec hesitation, 1–2 friction categories) → implement fixes, retest 4–6 kids
- **RED** (<70% success, >15 sec hesitation, 3+ categories, device blockers) → pause, redesign L1–L3

**Observation data sheet includes:**
- Level-by-level friction checklist
- Hesitation thresholds
- Friction category taxonomy
- Misconception probes
- Device-specific notes
- Aggregation template for multi-session analysis

---

### 4. Round 2: Comprehension-Assessment Protocol (Learning Validation)
**File:** `pilot-protocol-03-comprehension-assessment.md`  
**Purpose:** Validate that children achieve fraction mastery, transfer, and misconception resistance after L1–L6

**Session structure:**
- Pre-test baseline (5 min, no screen)
- Gameplay L1→L2→L3→L4→L5→L6 (25 min)
- Post-test comprehension tasks (8–10 min)

**Data captured:**
- **Pre-test:** Baseline fraction knowledge (yes/no, explain)
- **Gameplay:** Success per level, hints, time, transfer observations
- **Post-test comprehension:**
  - Concept verification (equal parts, identification, comparison reasoning)
  - Visual transfer tasks (free partition, identify on new shapes, compare without number line)
  - Misconception probes (MC-WHB-01, MC-EOL-01, MC-WHB-02, MC-PRX-01)
- **Learning gain:** Protocol 3 pre→post accuracy gain

**Sample size:** 10–15 K–2 learners (ideally same cohort as Protocol 2), 40 min per session

**Decision gate:**
- **GREEN** (≥75% post-test, learning gain ≥2/3, <20% misconception persistence, smooth transitions) → proceed to Protocol 4 + L7–L9 expansion
- **YELLOW** (60–74% post-test, 20–35% misconception, 1–2 bottleneck transitions) → add scaffolding (hint ladder, visual feedback), retest 5–7 kids
- **RED** (<60% post-test, >35% misconception, 3+ bottlenecks) → pause, redesign L1–L6

**Mastery levels:**
- **Mastered** (80%+ post-test, no misconceptions) → ready for L7–L9
- **Proficient** (70–79%, <20% misconception) → ready with reinforcement
- **Developing** (60–69%, 20–35% misconception) → needs practice
- **Beginning** (<60%, >35% misconception) → needs reteaching

---

### 5. Round 3: Retention-Assessment Protocol (Durability Testing)
**File:** `pilot-protocol-04-retention-assessment.md`  
**Purpose:** Validate that fraction concepts stick 1–3 weeks post-gameplay (no drift to baseline)

**Session structure:**
- Greeting + reassurance (1 min, no screen shown)
- Retention test (25 min, paper-based)
- Exit interview (3 min)

**Data captured:**
- **Repeat items:** Same 3 comprehension questions from Protocol 3 (compare answers)
- **Novel-context transfer:** Tasks with 1/6, 1/8, not explicitly taught (measures generalization)
- **Misconception re-emergence probes:** Do MC-WHB-01, MC-EOL-01, etc. reappear?
- **Retention index:** (Protocol 4 score − Protocol 3 score) / Protocol 3 score
  - ≥0.70: strong retention (decay <30%)
  - 0.50–0.69: moderate (30–50% decay)
  - <0.50: weak (>50% decay)

**Sample size:** 8–12 K–2 learners (same cohort as Protocols 2–3), 30 min per session, **1–3 weeks after Protocol 3**

**Decision gate:**
- **GREEN** (≥70% retention, ≤30% decay, ≥75% with 0 re-emerging misconceptions) → full-scale L7–L9 expansion
- **YELLOW** (50–69% retention, 30–50% decay, 50–74% stable) → add spaced-repetition features to L7–L9 (e.g., denominators revisited in benchmarks); retest L7 with 8–10 kids
- **RED** (<50% retention, >50% decay, <50% of cohort stable) → pause L7–L9 expansion; recommend classroom consolidation review; retest after classroom reinforcement

**Mastery re-assessment:**
- Update per-child mastery level from Protocol 3
- Categorize as: Strong (no decay), Moderate (mild decay), Weak (>30% decay)
- Recommend readiness for L7–L9: Ready, Ready with review, Not ready

---

## File Guide for Facilitators

### Before Round 1 (Protocol 2 Setup)
1. Read `pilot-protocol-01-consent.md` → prepare consent forms, assent script, checklist
2. Read `pilot-protocol-02-friction-discovery.md` → understand observation data sheet
3. Print observation forms (or use digital tablet)
4. Test device (tablet/laptop), screen recording software (if applicable)
5. Prepare stickers or small rewards
6. Recruit 8–12 K–2 learners via school, after-school program, or family referral

### During Round 1 (L1–L3 usability testing)
- Follow session structure: assent → gameplay → debrief
- Fill observation data sheet per child
- Collect friction categories and verbatim quotes
- After 8–12 sessions, aggregate and gate

### Before Round 2 (Protocol 3 Setup)
- Analyze Protocol 2 findings; implement fixes if YELLOW
- Prepare comprehension assessment tasks (printed cards, bar pictures)
- Recruit 10–15 K–2 learners (ideally same cohort as Protocol 2)
- Recruit 5–7 new learners (for fresh perspective on expanded content)

### During Round 2 (L1–L6 mastery testing)
- Pre-test: show fraction cards, ask "what does this mean?"
- Gameplay: observe L1→L6, track success/time/transfer
- Post-test: verbal comprehension questions + paper-based visual tasks + misconception probes
- After 10–15 sessions, aggregate, calculate learning gains, gate

### Before Round 3 (Protocol 4 Setup)
- Analyze Protocol 3 findings
- Build L7–L9 content (final decision pending Protocol 3 gate)
- Schedule follow-up sessions 1–3 weeks after each Protocol 3 session

### During Round 3 (L1–L9 retention testing)
- Repeat Protocol 3 post-test items (compare to Protocol 3 answers)
- Administer novel-context transfer tasks (1/6, 1/8, new number line)
- Misconception re-emergence probes
- Calculate retention indices
- After 8–12 sessions, aggregate, gate for full-scale

---

## Key Metrics Summary Table

| Protocol | Sample | Duration | Focus | Success Metric | Gate |
|----------|--------|----------|-------|---|---|
| **Protocol 2** (Friction) | 8–12 kids | 30 min | L1–L3 usability | ≥85% success ≤8 sec hesitation | GREEN/YELLOW/RED |
| **Protocol 3** (Comprehension) | 10–15 kids | 40 min | L1–L6 mastery + transfer | ≥75% post-test <20% misconception | GREEN/YELLOW/RED |
| **Protocol 4** (Retention) | 8–12 kids | 30 min | Concept durability (1–3 wk) | ≥70% retention ≤30% decay | GREEN/YELLOW/RED |

---

## Misconception Tracking Quick Reference

| ID | Name | Example | Detection Method |
|---|---|---|---|
| **MC-WHB-01** | Whole-is-biggest | "Longer piece ≠ equal" (perimeter confusion) | Show two different-shape halves, ask "equal?" |
| **MC-EOL-01** | End-of-list bias | Picks last option because it's shaded | Present correct answer in position 0 or 1, distractor in position 2 |
| **MC-WHB-02** | Denominator drives size | "1/8 > 1/4 because 8 > 4" | Compare 1/8 vs. 1/4, ask which is bigger |
| **MC-PRX-01** | Proximity = equality | "Two pieces are equal because they touch" | Show unequal pieces in contact, ask "equal?" |

---

## Privacy & Deidentification Checklist

- [ ] All notes use Participant-###, no real names
- [ ] Screen recordings show game screen only (no camera, no audio)
- [ ] Video auto-deleted after 15 days
- [ ] Aggregate summary retained indefinitely (e.g., "L1: 10/12 success")
- [ ] No emails, addresses, birthdates in any record
- [ ] Consent forms stored separately from gameplay data
- [ ] No accounts, no email signup, no tracking (COPPA compliant)

---

## Timeline for Execution

```
Week 1–2:  Protocol 2 (8–12 sessions, 30 min each) = ~60 hours of facilitator time
  Decision gate → GREEN/YELLOW/RED

Week 3–4:  Protocol 3 (10–15 sessions, 40 min each) = ~100 hours
  Decision gate → GREEN/YELLOW/RED

Week 5–6:  Phase 2 content expansion + L7–L9 build (based on Protocol 2/3 results)

Week 7–9:  Protocol 4 (8–12 sessions, 30 min each, 1–3 weeks post-Protocol 3)
  Decision gate → full-scale or pause/redesign

Week 10+:  Scale based on all three gates
```

---

## Contact & Questions

**Questerix Learning Team:** questerix.learning@example.com  
**IRC Exemption:** Formative validation, no IRB required (revisit if publishing results)

---

**Last updated:** 2026-05-05  
**Version:** 1.0
