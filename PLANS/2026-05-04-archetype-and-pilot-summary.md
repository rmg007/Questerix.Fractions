# Plan 13 Phase 1 + Plan 15 Phases 1–4 Summary

**Completed:** 2026-05-05  
**Status:** Audit complete; all protocol documents ready for Round 1 testing  
**Output Files:**
- `audit/archetype-distribution.json` — content inventory and expansion priorities
- `audit/pilot-protocol-01-consent.md` — participant consent & parent/educator acknowledgment
- `audit/pilot-protocol-02-friction-discovery.md` — Round 1 usability testing (L1–L3)
- `audit/pilot-protocol-03-comprehension-assessment.md` — Round 2 mastery validation (L1–L6)
- `audit/pilot-protocol-04-retention-assessment.md` — Round 3 durability testing (1–3 week follow-up)

---

## Plan 13: Content-Archetype Expansion (Phase 1 Complete)

### Findings

**Current state:** ALL 9 levels are archetype-thin.
- **7 levels** (L4–L9) have **1 archetype only**
- **2 levels** (L2–L3) have **2 archetypes**
- **0 levels** meet the target of **3+ archetypes**
- **Question depth:** L1–L3 have 3–4 questions per archetype (target: 5+); L4–L9 meet the 5–6 question target

**Gap prioritization:**

| Priority | Levels | Action | Expansion Scope |
|----------|--------|--------|---|
| **P1 (Critical)** | L1–L3 | Expand within existing archetypes + inject 1 new archetype per level | +5–8 questions per level |
| **P2 (Bottleneck)** | L4–L5 | Add snap_match and compare variants to make-focused levels | +3–5 questions per archetype |
| **P3 (Capstone)** | L6–L9 | Ensure each level has 2–3 supporting archetypes before capstone | +2–4 archetypes per level |

**Next steps:**
1. Use friction-discovery results (Protocol 2) to identify which new archetypes should be prioritized in L1–L3
2. Use comprehension-assessment results (Protocol 3) to confirm that content expansions transfer (partition skill → identify task, etc.)
3. Use retention-assessment (Protocol 4) to validate that expanded content sticks

---

## Plan 15: Pilot Protocol (Phases 1–4 Complete)

### Four Protocols, Two Validation Loops

**Protocol 1 (Consent & Assent):** Legal/ethical framework
- **Scope:** K–2 learner, parent/guardian, educator acknowledgment
- **No IRB required:** Formative validation study, no RCT, no sensitive data
- **Key features:** Opt-in checkboxes, child assent script, 15-day data retention, COPPA compliance
- **Output:** Signed forms (deidentified) + session-day checklist

**Protocol 2 (Friction Discovery):** Usability validation loop
- **Round 1 cohort:** 8–12 K–2 learners, 30 min per session
- **Focus:** L1–L3 interactions; where do kids hesitate, fail, abandon?
- **Data:** Observation sheet with friction categories (interaction, conceptual, motivation, visual, device)
- **Gate:** GREEN (≥85% success, <10 sec avg hesitation) → proceed to Protocol 3
- **Exit condition:** If YELLOW, implement UI/pedagogy fixes; if RED, pause expansion and redesign

**Protocol 3 (Comprehension Assessment):** Learning validation loop
- **Round 2 cohort:** 10–15 learners (ideally same cohort as Round 1), 40 min per session
- **Focus:** L1–L6; do children demonstrate mastery, transfer, misconception resistance?
- **Data:** Pre-test + gameplay observations + post-test comprehension tasks + misconception probes
- **Gate:** GREEN (≥75% post-test, <20% misconception) → proceed to Protocol 4 + L7–L9 expansion
- **Exit condition:** If YELLOW, add scaffolding; if RED, redesign L1–L6

**Protocol 4 (Retention Assessment):** Durability validation loop
- **Round 3 cohort:** 8–12 learners (same as Rounds 1–2), follow-up 1–3 weeks later
- **Focus:** Concept persistence; do children retain partition/identify/compare without re-playing?
- **Data:** Repeat post-test items + novel-context transfer tasks + misconception re-emergence probes
- **Gate:** GREEN (≥70% retention, ≤30% decay) → full-scale L7–L9 expansion
- **Exit condition:** If YELLOW, add spaced-repetition features in L7–L9; if RED, pause and consolidate with classroom review

---

## Timeline & Cohort Management

### Sequential Phases

```
Phase 1 (Week 1–2):  Protocol 2 (friction discovery, L1–L3)
  └─ 8–12 kids, 30 min each
  └─ Analysis + decision gate (GREEN/YELLOW/RED)
  └─ If YELLOW: implement fixes, retest 4–6 kids
  
Phase 2 (Week 3–4):  Phase 1 content expansion + Protocol 3 (comprehension, L1–L6)
  └─ Same cohort + new cohort (10–15 total)
  └─ 40 min per session
  └─ Analysis + decision gate
  └─ If YELLOW: add scaffolding, retest 5–7 kids
  
Phase 3 (Week 5–6):  Phase 2 content expansion + L7–L9 build
  
Phase 4 (Week 7–9):  Protocol 4 (retention, L1–L9)
  └─ Same cohort from Phase 2 (or subset), 1–3 weeks post-Phase 2 session
  └─ 30 min per session
  └─ Analysis + decision gate
  └─ If GREEN: full-scale; if YELLOW: add spaced-repetition; if RED: pause
```

### Cohort Tracking

**Ideal model:**
- **Core cohort:** 8–10 kids (rounds 1–3); strongest signals for content sticking
- **Expansion cohort:** 5–7 new kids in Round 2 (comprehension) to validate content with fresh learners
- **Device matrix:** Balance tablet (N=6), laptop/desktop (N=6–8) across rounds for device robustness

**Data integrity:**
- Deidentify all notes and recordings immediately (Participant-001 format)
- 15-day retention policy (auto-delete video + identifiable notes)
- Aggregate summary maintained long-term (e.g., "L1 partition: 10/12 succeeded")

---

## Decision Gates & Escalation Logic

### Green Conditions (All Protocols)

- **Protocol 2:** ≥85% success, avg hesitation ≤8 sec, no systemic device blockers
- **Protocol 3:** ≥75% post-test, learning gain ≥2/3, <20% misconception re-emergence, smooth transitions
- **Protocol 4:** ≥70% retention, ≤30% decay, ≥75% of cohort show no re-emerging misconceptions

→ **Action:** Proceed to next phase; no rework needed

### Yellow Conditions (All Protocols)

- **Protocol 2:** 70–84% success, 8–15 sec hesitation, 1–2 friction categories, device workaround exists
- **Protocol 3:** 60–74% post-test, learning gain 1–2/3, 20–35% misconception, 1–2 bottleneck transitions
- **Protocol 4:** 50–69% retention, 30–50% decay, 50–74% of cohort with no re-emergence

→ **Action:** Implement targeted fixes (hint ladder, visual feedback, clearer transitions); retest with 4–7 kids; re-gate before proceeding

### Red Conditions (All Protocols)

- **Protocol 2:** <70% success, >15 sec hesitation, 3+ friction categories, systemic device failure
- **Protocol 3:** <60% post-test, learning gain <1/3, >35% misconception, 3+ bottleneck transitions
- **Protocol 4:** <50% retention, >50% decay, <50% of cohort stable

→ **Action:** PAUSE expansion phase; conduct UX/content audit; redesign; retest before proceeding

---

## Misconception Tracking

**Four key misconceptions** flagged for monitoring across protocols:

| ID | Name | Example | Where Trapped | How to Detect |
|---|---|---|---|---|
| **MC-WHB-01** | Whole-is-biggest bias | "Longer piece ≠ equal to shorter" (confuse perimeter/area) | L1–L3, equal-or-not | Show two different-shape halves; ask "equal?" |
| **MC-EOL-01** | End-of-list bias | "I picked the last option because it looked shaded" | L2–L3, identify | Present correct answer NOT in final position |
| **MC-WHB-02** | Denominator size drives comparison | "1/8 > 1/4 because 8 > 4" | L6–L9, compare/benchmark | Compare 1/8 vs. 1/4; ask which is bigger |
| **MC-PRX-01** | Proximity = equality | "Two pieces are equal because they touch" | L3, equal-or-not | Show unequal pieces in contact |

**Protocol 2 focus:** Identify trap rates (% of cohort selecting distractors)  
**Protocol 3 focus:** Verify misconceptions don't persist after teaching  
**Protocol 4 focus:** Confirm misconceptions don't re-emerge after delay  

→ **If re-emergence >20% in any protocol:** Recommend visual feedback or misconception-explicit scaffolding in game

---

## Next Steps After Phase 1 (Archetype Audit) & Phases 1–4 (Protocols)

### Immediate (Week 1–2)
- [ ] Recruit 8–12 K–2 learners for Protocol 2 (friction discovery)
- [ ] Conduct 8–12 sessions (30 min each)
- [ ] Analyze friction categories; compile decision gate summary
- [ ] Implement fixes (if YELLOW) or proceed (if GREEN)

### Short-term (Week 3–6)
- [ ] Implement Phase 1 archetype expansion based on friction findings
- [ ] Conduct Protocol 3 (comprehension) with expanded L1–L6 content
- [ ] Build L7–L9 in parallel (pending Protocol 3 gate)
- [ ] Analyze learning gains and misconception traps

### Medium-term (Week 7–9)
- [ ] Conduct Protocol 4 (retention, 1–3 week follow-up) on same cohort
- [ ] Analyze retention decay by archetype
- [ ] Finalize L7–L9 content (incorporating spaced-repetition if YELLOW)
- [ ] Decision gate for full-scale rollout

### Scaling (Week 10+)
- [ ] Green: Build L7–L9 capstone; conduct full 1–9 validation
- [ ] Yellow: Add spaced-repetition review loops to L7–L9; retest L7 with 8–10 kids
- [ ] Red: Redesign L1–L6 based on retention data; retest before advancing

---

## Deidentification & Privacy Checklist

- [ ] All notes use Participant-001 format (no names)
- [ ] Screen recordings show game screen only (no camera, no audio)
- [ ] Recordings automatically deleted after 15 days
- [ ] Aggregate summary (e.g., "L1 partition: 10/12 success") retained indefinitely
- [ ] No email addresses, addresses, or birth dates in any record
- [ ] COPPA compliance verified (no accounts, no tracking)
- [ ] Parent/educator consent forms signed and stored separately from data

---

## Success Metrics (Entire Validation Loop)

| Metric | Target | Data Source |
|--------|--------|---|
| Friction-free interaction rate (L1–L3) | ≥85% | Protocol 2 |
| Learning gain (Protocol 3 pre→post) | ≥2/3 average | Protocol 3 |
| Misconception persistence <20% | ≥75% of cohort | Protocol 3 |
| Concept retention (1–3 week) | ≥70% | Protocol 4 |
| Smooth transitions between archetypes | ≥80% of cohort | Protocols 2–3 |
| Device robustness (tablet + desktop) | ≥90% usability | Protocols 2–3 |
| Educator + parent satisfaction | ≥80% confidence | Consent forms + debrief |

---

## References

- `audit/archetype-distribution.json` — current content inventory
- `audit/pilot-protocol-01-consent.md` — ethics & consent framework
- `audit/pilot-protocol-02-friction-discovery.md` — usability protocol
- `audit/pilot-protocol-03-comprehension-assessment.md` — mastery validation protocol
- `audit/pilot-protocol-04-retention-assessment.md` — durability protocol
- `docs/10-curriculum/levels/` — per-level specs
- `PLANS/2026-05-04-content-archetype-expansion.md` — Plan 13 full scope
- `PLANS/2026-05-04-pilot-protocol.md` — Plan 15 full scope

---

**Approved by:** Questerix Learning Team  
**Last updated:** 2026-05-05
