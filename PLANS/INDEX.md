# Phase 3 Planning Documents — Complete Index

**All files created:** 2026-04-25  
**Total documentation:** ~2,400 lines across 5 files  
**Status:** Ready for implementation

---

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

| Gate | Week | Criteria | Status |
|------|------|----------|--------|
| L6-L7 | 2 | Compare scenes, notation, WHB detectors tested | PENDING |
| L8 | 3 | Benchmark-sort works, Easy <13min, MAG/PRX detectors | PENDING |
| L9 | 4 | Ordering works, all templates seeded | PENDING |
| Cycle B | 5 | PWA installs, data persists, app deployed | PENDING |

---

## Effort Summary

**Estimated total:** 67 hours (roadmap budget: 50h)

| Week | Task | Hours |
|------|------|-------|
| 1 | SymbolicFractionDisplay, WHB detectors, L6-L7 stubs | 11 |
| 2 | L6-L7 scenes, misconception integration, tests | 16 |
| 3 | BenchmarkInteraction, MAG/PRX detectors, timing test | 15 |
| 4 | OrderInteraction, L9 scenes, integration tests | 12 |
| 5 | PWA hardening, deploy, Cycle B prep | 10 |
| Buffer | Debugging / edge cases | 3 |

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
