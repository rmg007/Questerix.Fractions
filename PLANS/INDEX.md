# Questerix Fractions — Planning Documents Index

**Last updated:** 2026-05-01
**Status:** Sprint 0 in-flight — gameplay loop edits pending real-browser verification

> **Naming convention:** all plan files must be named `<slug>-YYYY-MM-DD.md` where the date is the day the file was created. Files without a date are non-compliant and must be renamed. Full rules: `docs/00-foundation/git-workflow.md`.

---

## ⭐ Start Here (2026-04-26)

### [master-plan-2026-04-26.md](master-plan-2026-04-26.md) — MASTER BACKLOG

The single backlog of everything left to do for the MVP. Synthesizes the architecture review and visual QA, reflects in-flight work, orders by sprint with exit criteria.

**Use it for:** daily next-action lookup, sprint-by-sprint task tracking, effort roll-up, open decisions awaiting user input.

---

## 🆕 Source Documents (2026-04-27)

### [architecture-review-2026-04-27.md](architecture-review-2026-04-27.md) — MASTER TECHNICAL REVIEW

The authoritative source of truth for the entire project's technical state.

**Covers:**

- 5 readiness dimensions: Gameplay Loop, Learning Engine, Content, Student Experience, Operational
- 28-item gap register with severity and cross-references
- 5-sprint plan with exit criteria per sprint
- Constraint compliance audit (C1–C10)
- "Definition of Done" — 8 items for a classroom pilot

**When to use:**

- Understanding what's built vs. what's wired vs. what's missing
- Deciding which sprint to work on next
- Writing a status update for a stakeholder
- Checking if a constraint is being violated

---

### [qa-visual-report-2026-04-27.md](qa-visual-report-2026-04-27.md) — VISUAL QA WITH SCREENSHOTS

Live browser walkthrough of every reachable screen, with embedded screenshots and per-element pass/fail.

**Covers:**

- 6 screens documented with screenshots (Menu, Level 1, Hint, Check, Back, Settings)
- 14 untested flows (session complete, L2–L9, iPad, offline, TTS, etc.)
- The "happy path" — what a working session should look like step by step
- Bug register with exact symptom + root cause + fix for each
- Readiness score (current: 🔴 NOT READY)

**When to use:**

- Seeing what the app actually looks like today
- Understanding user-facing bugs
- Testing a fix — compare screenshots before/after
- Communicating app state without running the code

---

### [curriculum-update-2026-04-30.md](curriculum-update-2026-04-30.md) — MASTER CURRICULUM PLAN (v2)

The authoritative pedagogical and structural roadmap for the Questerix curriculum.

**Covers:**
- Theory of Action (CPA + Equal-Sharing + Number-Line)
- Learning Architecture (KCs, Prereqs, Misconceptions)
- Item Design Science (8 principles, 6 lenses of quality)
- 8-phase delivery roadmap (A–H)
- Decision log harness (D-NNN)

**When to use:**
- Making any curriculum or content choice
- Reviewing level specifications
- Understanding the BKT/Mastery model requirements
- Validating new item templates

---

## 🆕 Architectural Audit (2026-05-01)

### [code-quality-2026-05-01.md](code-quality-2026-05-01.md) — CODE QUALITY & ARCHITECTURAL HARDENING (v3)

Principal-architect audit across four dimensions plus a cross-cutting pass (security, PWA, i18n, observability, hidden coupling). 56 actionable findings · 16-phase remediation plan · ~115 hr Stage 1 effort. Includes §12 Forensic Synthesis identifying the Original Sin (Phaser Scene as application unit) and proposing a 4-stage migration toward a hexagonal Ideal State.

**Four substantive recommendations:**
- A1 — Sunset `Level01Scene.ts` (resolves D-4); KISS over extracted abstraction.
- A2 — Replace TS↔Python validator parity with single TS executable contract.
- A3 — Enforce engine dependency direction at lint level; ports.ts adoption becomes mandatory.
- A4 — Delete or finish, never scaffold. Half-built abstractions are worse than no abstractions.

**When to use:** structural refactor sequencing, decision D-4 forcing function, complement to `harden-and-polish-2026-04-30.md` (absorbed in Phase 10).

> ⚠️ **Stages 2-4 of §12.6 are SUPERSEDED by `forensic-deep-dive-2026-05-01.md`.** Read both before voting on the migration roadmap.

### [forensic-deep-dive-2026-05-01.md](forensic-deep-dive-2026-05-01.md) — FORENSIC DEEP-DIVE (companion to v3)

Deeper audit answering three questions v3 only partly addressed: (1) when did the Original Sin happen and was it deliberate; (2) what is the codebase's actual concurrency contract; (3) is v3's hexagonal+event-sourced Ideal State the right tool for this K-2 single-user offline app, or pattern-matching from a different domain. Includes substantive intellectual pushback against v3's own proposal.

**Key conclusions:**
- Original Sin was **deliberate**, not accidental — D-08 (2026-04-24) deferred architecture; bifurcation locked in at commit `4e10460` (2026-04-26).
- The worst defensive bug in the codebase is **feedback-before-persist** at `Level01Scene.ts:949-950` — fixable in one line.
- v3 Ideal State is **partially overkill**: event log is canonical for problems C1-C10 forbid; Domain layer is over-abstraction for 9 levels with C3 cap; 8-state FSM is imposed not observed.
- A `SessionService` pivot (~30 hr) captures ~80% of the structural value of v3's Stage 2 (Domain layer, ~60 hr) and Stage 3 (event log, ~40 hr).

**When to use:** before voting on Stage 2 of the migration. Preserves the v3 diagnosis, replaces the prescription.

---

## 🆕 Active Work Queue (2026-04-30)

### [work-queue-2026-04-30.md](work-queue-2026-04-30.md) — CURRENT AGENT WORK QUEUE

Ordered list of everything to implement next, with exact file references, approach, and done criteria.

**Sections:**
1. P1 — OTel/Sentry lazy imports (bundle trim, 50–100 KB gzip reduction)
2. P2 — Sprint 0 bugs (BUG-01, BUG-02, BUG-04, G-E1, G-C7)
3. P3 — CI/infra quick wins (agent-doctor in CI, Lighthouse node fix, CHANGELOG, decision log)
4. P4 — C5 localStorage → Dexie migration

**Gate:** Sprint 0 exit — student completes 5-question session in browser.

---

## 🔴 Critical Blockers (Fix In This Order)

| #   | Blocker                                                                       | File              | Effort   |
| --- | ----------------------------------------------------------------------------- | ----------------- | -------- |
| 1   | **BUG-01** — Wrong prompt ("identify" archetype on a "partition" scene)       | `Level01Scene.ts` | 2 min    |
| 2   | **BUG-02** — Validation never passes, progress stuck at 0/5 forever           | `Level01Scene.ts` | ~30 min  |
| 3   | **BUG-04** — Hint tiers never advance past Tier 1                             | `Level01Scene.ts` | 15 min   |
| 4   | **BUG-05** — Settings gear routing (likely resolved — retest in real browser) | `MenuScene.ts`    | 15 min   |
| 5   | **G-C3** — No UI route to Level 2–9. Adventure map is decorative.             | `MenuScene.ts`    | Sprint 2 |
| 6   | **G-C7** — "Keep going" loops Level 1 instead of advancing to Level 2         | `LevelScene.ts`   | 30 min   |
| 7   | **G-E1** — BKT `updateMastery()` never called. Zero learning signal.          | `Level01Scene.ts` | Sprint 1 |

**Sprint 0 exit criteria:** Student completes a 5-question session in a real browser tab at `localhost:5002`.

**Why the app doesn’t feel smart:** BKT is fully built but never called. Every answer goes into a void. No mastery states change. No difficulty adjusts. No misconception feedback escalates. This is the primary work of Sprint 1.

**Removed from planning:** Multi-student / parental view (⏸️ parked — future milestone). Onboarding (⛔ deprioritised — not MVP).

---

## Phase 3 Planning Documents (2026-04-25)

## Document Map

### Core Planning Documents

#### 1. README.md (133 lines) — START HERE

Entry point for the planning suite with quick navigation guide, file locations, test commands per gate, and effort breakdown.

**When to use:**

- First time orientation
- Quick reference
- Looking for test commands

---

#### 2. phase-3-checkpoint.md (308 lines) — CURRENT STATE AUDIT

What exists (Phases 1–2), what's missing (Phase 3), LevelScene enhancements, files to create/modify, implementation sequence, and risk summary.

**When to use:**

- Understanding codebase status
- Planning what to build next
- Checking dependencies

---

#### 3. phase-3-implementation.md (720 lines) — MASTER CHECKLIST

Complete task breakdown, wall-clock timeline, 4 phase gates, detailed checklists for each component, testing plan, parallel work, effort breakdown, and risk mitigations.

**When to use:**

- Daily task tracking
- Gate verification
- Full scope understanding
- Effort estimation

---

#### 4. phase-3-technical-specs.md (976 lines) — CODE REFERENCE

Detailed pseudocode for all components: SymbolicFractionDisplay, 4 misconception detectors, BenchmarkInteraction, OrderInteraction, data schema, test fixtures, and integration checklist.

**When to use:**

- Implementing new components
- Writing unit tests
- Copy/paste pseudocode as template
- Understanding API contracts

---

#### 5. PLANNING-SESSION-SUMMARY.md (306 lines) — SESSION DEBRIEF

What was done, codebase analysis, key design decisions, architecture decisions, risk assessment, parallel work, next steps, and success criteria.

**When to use:**

- Understanding design decisions
- Risk context
- Immediate actions
- Project overview

---

## Quick Access by Task

### Starting Week 1

1. Read README.md (5 min)
2. Skim phase-3-checkpoint.md sections 1-3 (10 min)
3. Open phase-3-implementation.md section 2.1-2.3 (Week 1 checklist)
4. Start coding per checklist

### Building SymbolicFractionDisplay

1. Check spec in phase-3-implementation.md section 2.2
2. Copy pseudocode from phase-3-technical-specs.md section 1
3. Implement and test
4. Verify on iPad and 360px

### Building Misconception Detector

1. Read phase-3-checkpoint.md section 2.3
2. Open docs/10-curriculum/misconceptions.md (pattern definition)
3. Copy pseudocode from phase-3-technical-specs.md section 2
4. Implement and unit test
5. Integrate into LevelScene

### At a Phase Gate (W2/W3/W4/W5)

1. Check phase-3-implementation.md section 1.2 for criteria
2. Verify all checklist items complete
3. Run test commands from README.md
4. Document results
5. Proceed to next gate

### Debugging a Failure

1. Check risks in phase-3-implementation.md section 8
2. Look up mitigation strategy
3. Check phase-3-checkpoint.md for context
4. Consult phase-3-implementation.md for specific guidance

### Understanding Design Choices

1. Open PLANNING-SESSION-SUMMARY.md section 3 (decisions)
2. Check architecture section 4
3. Review risk assessment section 5

---

## Key Files Referenced

### Codebase Files

- src/scenes/LevelScene.ts — router, resume, detector integration
- src/scenes/interactions/CompareInteraction.ts — notation rendering
- src/scenes/interactions/BenchmarkInteraction.ts — new component
- src/scenes/interactions/OrderInteraction.ts — new component
- src/components/SymbolicFractionDisplay.ts — new component
- src/engine/misconceptionDetectors.ts — new component
- src/types/index.ts — schema additions
- public/manifest.json — PWA configuration

### External Documents

- docs/50-roadmap/mvp-l1-l9.md — phase roadmap
- docs/20-mechanic/activity-archetypes.md — mechanic specs
- docs/10-curriculum/misconceptions.md — detector patterns
- docs/10-curriculum/scope-and-sequence.md — curriculum context

---

## Phase 3 Gates

| Gate    | Week | Criteria                                             | Status  |
| ------- | ---- | ---------------------------------------------------- | ------- |
| L6-L7   | 2    | Compare scenes, notation, WHB detectors tested       | PENDING |
| L8      | 3    | Benchmark-sort works, Easy <13min, MAG/PRX detectors | PENDING |
| L9      | 4    | Ordering works, all templates seeded                 | PENDING |
| Cycle B | 5    | PWA installs, data persists, app deployed            | PENDING |

---

## Effort Summary

**Estimated total:** 67 hours (roadmap budget: 50h)

| Week   | Task                                                 | Hours |
| ------ | ---------------------------------------------------- | ----- |
| 1      | SymbolicFractionDisplay, WHB detectors, L6-L7 stubs  | 11    |
| 2      | L6-L7 scenes, misconception integration, tests       | 16    |
| 3      | BenchmarkInteraction, MAG/PRX detectors, timing test | 15    |
| 4      | OrderInteraction, L9 scenes, integration tests       | 12    |
| 5      | PWA hardening, deploy, Cycle B prep                  | 10    |
| Buffer | Debugging / edge cases                               | 3     |

---

## How to Track Progress

1. Log actual hours weekly vs. estimate
2. Update checklists as items complete
3. Document risk materializations
4. At phase exit, write summary of results

---

## Support & References

**Need to understand misconceptions?** → docs/10-curriculum/misconceptions.md  
**Need mechanics specs?** → docs/20-mechanic/activity-archetypes.md  
**Need implementation code?** → phase-3-technical-specs.md  
**Need current status?** → phase-3-checkpoint.md  
**Need task list?** → phase-3-implementation.md  
**Need design rationale?** → PLANNING-SESSION-SUMMARY.md

---

**Created:** 2026-04-25  
**Status:** ACTIVE  
**Ready for implementation**
