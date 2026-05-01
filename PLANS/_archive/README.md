# Phase 3 Planning Documents

This directory contains the complete Phase 3 (Levels 6–9) implementation plan for Questerix Fractions.

## Documents

### 1. **phase-3-implementation.md** (START HERE)
Comprehensive 13-section plan covering:
- Roadmap & gates (wall-clock breakdown by week)
- Implementation checklist (LevelScene, SymbolicFractionDisplay, misconception detectors, L6–L9 scenes, PWA)
- Content seeding & integration
- Testing & validation
- Build & deployment
- Risks & mitigations
- Phase 3 exit criteria
- Parallel work (content + recruitment)
- Success metrics
- Effort breakdown (67 hours over 5 weeks)

**Use this:** As your day-to-day task list and gate tracker.

### 2. **phase-3-checkpoint.md**
Current-state assessment (as of 2026-04-25):
- What already exists (Phases 1–2): LevelScene, validators, 6 interactions, persistence layer
- What's missing for Phase 3: 3 interactions (benchmark, order), SymbolicFractionDisplay, 4 misconception detectors, 49 L6–L9 templates
- LevelScene enhancements needed (resume support, detector integration)
- Quick reference: files to create vs. modify
- Implementation order (Week 1–5 sequence)
- Testing checklist
- Risk summary
- Success criteria

**Use this:** To understand what's been done and what needs building.

### 3. **phase-3-technical-specs.md**
Detailed technical specifications for new code:
- SymbolicFractionDisplay class definition + integration
- Misconception detectors: WHB-01, WHB-02, MAG-01, PRX-01 (full implementation pseudocode)
- BenchmarkInteraction (number-line + zones + cards)
- OrderInteraction (tappable cards + sequence zone)
- Data schema additions (MisconceptionFlag, updated AttemptRecord)
- Test fixtures & stubs
- Integration checklist

**Use this:** When implementing new components (copy/paste pseudocode as starting point).

## Quick Navigation

### I'm starting Phase 3 work
1. Read `phase-3-checkpoint.md` §1–3 (10 min) to understand what's there
2. Skim `phase-3-implementation.md` §1–2 (gates + timeline)
3. Start with Week 1 checklist: SymbolicFractionDisplay + detect WHB-01/02

### I'm building a component
1. Look it up in `phase-3-implementation.md` §2.x
2. Get detailed pseudocode from `phase-3-technical-specs.md` §X
3. Copy the template, fill in the gaps, write tests

### I'm at a gate (W2, W3, W4, W5)
1. Check `phase-3-implementation.md` §1.2 (gate checklist)
2. Verify all items are ✓ before proceeding to next phase

### I'm tracking progress
1. Update `phase-3-implementation.md` §2.1–§2.6 checklists daily
2. Log actual hours vs. estimate in §12 (effort breakdown)
3. At phase exit, fill in §3.1 (risks materialized)

## Key Files in Codebase

**To review before starting:**
- `docs/50-roadmap/mvp-l1-l9.md` — phase gates + effort estimates (sections 3, 10.5)
- `docs/20-mechanic/activity-archetypes.md` — archetype specs (§5–8)
- `docs/10-curriculum/misconceptions.md` — misconception families (§3.1–3.4)
- `src/scenes/LevelScene.ts` — router implementation
- `src/scenes/interactions/CompareInteraction.ts` — existing compare logic (extend this)

**To create/modify:**
- `src/components/SymbolicFractionDisplay.ts` (new)
- `src/engine/misconceptionDetectors.ts` (new)
- `src/scenes/interactions/BenchmarkInteraction.ts` (create if missing)
- `src/scenes/interactions/OrderInteraction.ts` (create)
- `src/scenes/LevelScene.ts` (add resume + detector integration)
- `public/manifest.json` (verify + update)

## Testing Before Each Gate

### L6–L7 Gate (end of Week 2)
```bash
npm run test:unit                # SymbolicFractionDisplay, WHB-01, WHB-02
npm run build                    # TypeScript compile
npm run preview                  # Manual: load L6, verify notation renders
```

### L8 Gate (end of Week 3)
```bash
npm run test:unit                # All detectors + BenchmarkInteraction
npm run test:integration         # Zone detection, card placement
npm run preview                  # Manual: iPad, timing validation (< 13 min)
```

### L9 Gate (end of Week 4)
```bash
npm run test:integration         # L6–L9 end-to-end sequence
npm run preview                  # Manual: all levels play
```

### Cycle B Readiness (end of Week 5)
```bash
npm run test                     # All tests
npm run build                    # Final bundle (< 2 MB)
npm run preview                  # Smoke test on localhost
# Manual: iOS Safari + Android Chrome install test
```

## Effort Summary

| Week | Focus | Hours | Gate |
|------|-------|-------|------|
| 1 | SymbolicFractionDisplay, WHB detectors, L6–L7 stubs | 11 | — |
| 2 | L6–L7 scenes, misconception integration, tests | 16 | ✓ L6–L7 |
| 3 | BenchmarkInteraction, MAG/PRX detectors, timing test | 15 | ✓ L8 |
| 4 | OrderInteraction, L9 scenes, integration tests | 12 | ✓ L9 |
| 5 | PWA hardening, deploy, Cycle B prep | 10 | ✓ Cycle B ready |
| — | Buffer / debugging | 3 | — |
| **Total** | | **67 h** | |

**Roadmap budgeted 50h code; plan allocates 67h. The extra 17h covers robust testing + PWA hardening (non-negotiable for validation).**

---

Created: 2026-04-25  
Status: ACTIVE  
Last updated: 2026-04-25
