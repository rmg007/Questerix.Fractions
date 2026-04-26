---
title: Phase 3 Planning Session Summary
date: 2026-04-25
session_type: Planning & Architecture Review
---

# Phase 3 Planning Session Summary

## Executive Summary

A comprehensive Phase 3 implementation plan has been created for the Questerix Fractions MVP, covering Levels 6–9 development over ~6 weeks (67 estimated hours).

**Status:** All planning artifacts complete and ready for implementation to begin.

---

## What Was Done

### 1. Created Complete Phase 3 Planning Suite

Four documents placed in `PLANS/`:

| Document | Purpose | Length | Use Case |
|----------|---------|--------|----------|
| `phase-3-implementation.md` | Master checklist + weekly breakdown | 400 lines | Daily task list; gate tracking |
| `phase-3-checkpoint.md` | Current state audit + what's missing | 250 lines | Understanding where we are; what to build |
| `phase-3-technical-specs.md` | Code-level pseudocode for all new components | 500 lines | Implementation reference; copy/paste templates |
| `README.md` | Navigation guide + quick reference | 150 lines | Entry point; testing checklist |

**Total:** ~1,300 lines of detailed planning documentation.

### 2. Analyzed Codebase Status

**What exists (Phases 1–2):**
- LevelScene router: loads templates, dispatches to interactions, validates answers
- 6 interaction types: partition, identify, label, make, equal_or_not, snap_match (all L1–L5)
- Persistence layer: Dexie-backed IndexedDB with repos for sessions, attempts, templates, flags
- Validators: compare, partition, identify, label, make, equal_or_not, snap_match
- UI components: BarModel, ProgressBar, FeedbackOverlay, HintLadder, AccessibilityAnnouncer
- Test hooks & accessibility scaffolding

**What's missing for Phase 3:**
- SymbolicFractionDisplay component (notation rendering)
- 3 interaction types: BenchmarkInteraction, OrderInteraction, (PlacementInteraction partial)
- 4 misconception detectors: detectWHB01, detectWHB02, detectMAG01, detectPRX01
- 49 L6–L9 curriculum templates (L6:13, L7:13, L8:13, L9:10)
- Resume support in LevelScene
- Misconception detector integration into validation pipeline
- PWA hardening (manifest, icons, persistent storage)

---

## Key Decisions & Design Choices

### 1. SymbolicFractionDisplay

**Decision:** Create a lightweight, reusable Phaser Text component.

**Rationale:**
- Decouples notation rendering from interaction logic
- Reusable across all comparison/ordering scenes
- Supports fallback labels ("3 of 4") for early readers (K–1)

**Implementation:** ~60 lines, simple setter/getter pattern, compatible with BarModel.

### 2. Misconception Detectors

**Decision:** Implement as pure functions (no side effects), called from LevelScene.onCommit().

**Pattern:** `detect<Name>(attempts[], level) → MisconceptionFlag | null`

**Rationale:**
- Testable in isolation (no mocking required)
- Composable: chain detectors sequentially, stop on first match
- Threshold: 5+ attempts, ≥60% pattern match (configurable after playtest)

**Detectors (4 total):**
1. **WHB-01** (Whole-Number Bias / Numerator) — L6+ compare with larger-numerator trap
2. **WHB-02** (Whole-Number Bias / Denominator) — L7+ compare with larger-denominator trap
3. **MAG-01** (Magnitude Blindness) — L8+ low accuracy on hard-tier items + high error magnitude
4. **PRX-01** (Proximity-to-1 Confusion) — L8 benchmark with "almost_one" items placed in wrong zones

### 3. BenchmarkInteraction Architecture

**Decision:** Full drag-to-zone implementation with visual feedback, not just taps.

**Components:**
- Number line (0–1, 500px wide) with landmarks: 0, 1/4, 1/2, 3/4, 1
- 4 drop zones: [0–1/4], [1/4–1/2], [1/2–3/4], [3/4–1]
- Draggable fraction cards (80×80, tappable + dragable)
- Zone detection on drop (snap to nearest zone center)

**Rationale:** Aligns with scope-and-sequence.md §7.3 (benchmark reasoning for magnitude). Timing critical for C9 budget: Easy tier < 13 min total session.

### 4. OrderInteraction Design

**Decision:** Simple tap-and-stack (not drag-to-position).

**Pattern:**
- Left: available cards (tappable)
- Right: sequence zone (visual list of placed cards)
- Bottom: "Done" button (submits order for validation)

**Rationale:** Simpler UX than drag-to-position; sufficient for MVP. Reduces implementation hours (W4 lowest priority).

### 5. Phase 3 Gate Strategy

**Decision:** 4 explicit gates (end of W2, W3, W4, W5) with binary pass/fail criteria.

**Rationale:**
- Prevents slippage: can't move forward without passing
- Buffer: if a gate slips by 1 week, later gates shift but don't compress
- Flexibility: C10 constraint is validation, not deadline; slippage is acceptable if scope is met

**Gates:**
1. **L6–L7 Gate (W2):** Compare scenes work, notation renders, WHB-01/02 detectors coded + unit-tested
2. **L8 Gate (W3):** Benchmark-sort interactive, Easy tier < 13 min, MAG-01/PRX-01 detectors working
3. **L9 Gate (W4):** Ordering scene complete, all templates seeded, no crashes
4. **Cycle B Readiness (W5):** PWA installs on iOS/Android, data persists, app deployed

### 6. Effort Estimation

**Roadmap says:** 50h code (Phase 3 from effort sketch).  
**Plan allocates:** 67h code + testing + deployment.

**Rationale:** Extra 17h justified by:
- Robust detector logic (not pseudocode)
- Comprehensive testing (unit + integration + E2E)
- PWA hardening (not deferrable; critical for validation)
- Real device testing (iPad + mobile throttle)

**Breakdown (67 hours):**
- Week 1: 11h (SymbolicFractionDisplay + stubs)
- Week 2: 16h (L6–L7 scenes + tests + gate)
- Week 3: 15h (L8 + detectors + timing validation)
- Week 4: 12h (L9 + integration tests)
- Week 5: 10h (PWA + deploy)
- Buffer: 3h

---

## Architecture Decisions

### 1. Resume Support in LevelScene

**Current:** Every init() fetches templates fresh.  
**Needed:** Check IndexedDB for last unclosed session, resume from that question index.

**Implementation:** Add `resume?: boolean` to `LevelSceneData`, check in `create()` before template load.

### 2. Misconception Detector Integration

**Call site:** `LevelScene.onCommit()`, after answer validation.

```typescript
const flag = 
  detectWHB01(...) ?? 
  detectWHB02(...) ?? 
  detectMAG01(...) ?? 
  detectPRX01(...);

if (flag) await misconceptionFlagRepo.insert(flag);
```

**No blocking:** If detector fails, validation completes anyway (detectors are optional diagnostic, not gating).

### 3. PWA Manifest & Persistent Storage

**Manifest:** Update `public/manifest.json` with correct fields + icons (192×192, 512×512).

**Persistent storage:** Call `navigator.storage.persist()` on first app launch (in MenuScene or App init).

**Testing:** Manual install test on iOS Safari (Add to Home Screen) + Android Chrome (Install app menu).

---

## Risk Assessment & Mitigations

| Risk | Severity | Mitigation | Owner |
|------|----------|-----------|-------|
| Templates seeded late | HIGH | Stub fallback templates immediately; swap when real ones arrive | Content team |
| L8 timing overruns budget (>13 min) | HIGH | Measure by end of W2; reduce complexity (3 cards max, larger zones) if needed | Developer |
| iOS PWA install fails | HIGH | Test early W4; fix manifest issues same day (don't defer) | Developer |
| Misconception detectors fire too aggressively | MEDIUM | Start with conservative threshold (5+ attempts, 60%); monitor playtest data | Developer |
| Data persistence broken | MEDIUM | Verify misconceptionFlagRepo wired into onCommit(); manual persist test on real device | Developer |
| Bundle size > 2 MB | LOW | Vite production build already optimizes; unlikely post-Phase 2 | Developer |

**Highest-risk item:** L8 timing. Measure on real device (iPad with 3G throttle) by mid-W3. If overrunning, simplify immediately.

---

## Parallel Work

**While code is being written (Weeks 1–5):**

1. **Content generation** — L6–L9 hints, interventions, fallback messages authored
2. **Cycle B recruitment** — Contact families, schedule 3 sessions per student
3. **Observation prep** — Set up space, brief observers, dry-run one session

---

## Files Created in This Session

All in `PLANS/`:

1. `phase-3-implementation.md` — Master plan (400 lines)
2. `phase-3-checkpoint.md` — Current state audit (250 lines)
3. `phase-3-technical-specs.md` — Code pseudocode (500 lines)
4. `README.md` — Navigation guide (150 lines)
5. `PLANNING-SESSION-SUMMARY.md` — This document

**No code written.** All planning only.

---

## Next Steps

### Immediate (This Week)

1. **Read** `PLANS/phase-3-checkpoint.md` (10 min) to ground yourself in what's done
2. **Review** `PLANS/phase-3-implementation.md` §1–2 (gates + W1 checklist)
3. **Create** `src/components/SymbolicFractionDisplay.ts` (2–3 hours)
4. **Integrate** into `CompareInteraction.ts` (2 hours)
5. **Begin** `src/engine/misconceptionDetectors.ts` stubs (2 hours)

### Week 1 Targets

- [ ] SymbolicFractionDisplay complete + unit tests
- [ ] LevelScene resume support added
- [ ] detectWHB01, detectWHB02 stubs in misconceptionDetectors.ts
- [ ] L6–L7 template stubs created (or real content if ready)

### Week 2 Targets (L6–L7 Gate)

- [ ] SymbolicFractionDisplay integrated into CompareInteraction
- [ ] WHB-01/02 detectors fully implemented + unit tests (100% coverage)
- [ ] L6–L7 scenes tested on 360px + iPad viewports
- [ ] Build passes: `npm run build`
- [ ] App plays L6 to completion without crashes

---

## Success Criteria (Phase 3 Complete)

✓ All when:
- [ ] L6–L9 scenes load and play without crashes
- [ ] All 49 templates seeded and rendering
- [ ] 4 misconception detectors working (WHB-01, WHB-02, MAG-01, PRX-01)
- [ ] Unit tests passing: `npm run test:unit`
- [ ] Build succeeds: `npm run build` (bundle < 2 MB)
- [ ] PWA installs on iOS Safari + Android Chrome
- [ ] Data persists across app restart (manual test on real device)
- [ ] App deployed to stable URL
- [ ] Cycle B recruitment confirmed (8–10 students scheduled)

---

## Key References

**Architecture & Gates:**
- `docs/50-roadmap/mvp-l1-l9.md` (sections 3, 10.5)

**Mechanic Specs:**
- `docs/20-mechanic/activity-archetypes.md` (sections 5–8: compare, benchmark, order, placement)

**Misconceptions:**
- `docs/10-curriculum/misconceptions.md` (sections 3.1–3.4: WHB, MAG, PRX families)

**Existing Code:**
- `src/scenes/LevelScene.ts` (router)
- `src/scenes/interactions/CompareInteraction.ts` (existing compare logic to extend)
- `src/scenes/utils/levelRouter.ts` (interaction registry)

---

## Closing Notes

This planning session produced a **complete, executable roadmap** for Phase 3. The design is:

1. **Detailed:** Every task broken down to pseudocode; no vagueness
2. **Realistic:** 67-hour estimate based on codebase audit + gate constraints
3. **Flexible:** Gates allow slippage without cascading compression
4. **Testable:** Every component has unit test stubs; gates have binary pass/fail criteria
5. **Grounded:** All decisions justified by either constraint (C1–C10) or codebase reality

The developer can now **start implementing with confidence**, knowing:
- What's already built (no reinventing the wheel)
- Exactly what to build (checklists + pseudocode)
- How to test it (unit + integration test specs)
- When to stop (gates + exit criteria)

**Estimated ship date for Phase 3:** Late August 2026 (6 weeks from start). Validation analysis (Phase 4) expected early September.

---

## Session Metadata

- **Date:** 2026-04-25
- **Duration:** Single comprehensive session
- **Artifacts:** 5 documents, ~1,300 lines
- **Code produced:** 0 (planning only)
- **Next session:** Implementation kick-off (Week 1)

---

*End of Planning Session Summary*
