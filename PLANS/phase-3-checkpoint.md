---
title: Phase 3 Checkpoint — Current State & Next Steps
status: active
date: 2026-04-25
---

# Phase 3 Checkpoint — Current State Assessment

This document snapshots the state of the codebase as of **2026-04-25** and identifies what exists vs. what needs to be built.

---

## 1. What Already Exists (Phase 1–2 Complete)

### 1.1 Core Infrastructure

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| LevelScene router | `src/scenes/LevelScene.ts` | ✅ Complete | Loads templates, dispatches to interactions, validates via onCommit |
| Interaction registry | `src/scenes/utils/levelRouter.ts` | ✅ Complete | Maps archetype → Interaction class factory |
| Interaction base type | `src/scenes/interactions/types.ts` | ✅ Complete | Interface: mount, unmount, validation callback |
| Persistence layer | `src/persistence/repositories/` | ✅ Complete | Dexie-backed repos for sessions, attempts, templates, flags |
| IndexedDB seeding | `src/curriculum/index.ts` | ✅ Complete | Curriculum → DB on first load |
| Validators | `src/validators/` | ✅ Complete | compare, partition, identify, label, make, equal_or_not, snap_match (all working) |

### 1.2 Existing Interactions (L1–L5)

| Archetype | Interaction File | Status | Levels | Notes |
|-----------|------------------|--------|--------|-------|
| `partition` | `PartitionInteraction.ts` | ✅ L1, L4, L5 | Drag dividers, snap to axis |
| `identify` | `IdentifyInteraction.ts` | ✅ L1, L2, L3 | Tap-select from options |
| `label` | `LabelInteraction.ts` | ✅ L2, L3 | Drag label to region |
| `make` | `MakeInteraction.ts` | ✅ L4, L5 | Partition + select shade |
| `equal_or_not` | `EqualOrNotInteraction.ts` | ✅ L1–L5 | Tap Yes/No on shape pair |
| `snap_match` | `SnapMatchInteraction.ts` | ✅ L3 | Drag-match fraction to region |

### 1.3 Components & Utilities

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| BarModel | `src/scenes/interactions/utils.ts` | ✅ Complete | Renders filled/empty bar sections |
| ProgressBar | `src/components/ProgressBar.ts` | ✅ Complete | Session progress indicator (5-question goal) |
| FeedbackOverlay | `src/components/FeedbackOverlay.ts` | ✅ Complete | EXACT/CLOSE/WRONG animations + text |
| HintLadder | `src/components/HintLadder.ts` | ✅ Complete | 3-level hint system (basic → visual → explicit) |
| AccessibilityAnnouncer | `src/components/AccessibilityAnnouncer.ts` | ✅ Complete | Screen reader announcements |
| TestHooks | `src/scenes/utils/TestHooks.ts` | ✅ Complete | Mount test sentinels + interactive zones |

### 1.4 Data Models & Types

| Domain | File | Status | Notes |
|--------|------|--------|-------|
| Question Templates | `src/types/index.ts` | ✅ Complete | QuestionTemplate interface with archetype, payload, validator |
| Attempts | `src/types/index.ts` | ✅ Complete | AttemptRecord with outcome, timestamp, metadata |
| Sessions | `src/types/index.ts` | ✅ Complete | SessionRecord with student ID, level, status |
| Misconceptions | `src/types/index.ts` | ⚠️ Partial | MisconceptionFlag interface defined; detection logic not yet implemented |
| Validators | `src/validators/index.ts` | ✅ Complete | Validator registry for compare, partition, equal_or_not, etc. |

---

## 2. What's Missing for Phase 3 (L6–L9)

### 2.1 Interactions (Required)

| Archetype | Interaction File | Status | Needed By | Notes |
|-----------|------------------|--------|-----------|-------|
| `compare` | `CompareInteraction.ts` | ⚠️ Partial | L6–L7 gate (W2) | Bars render + validation works; **missing symbolic notation** |
| `benchmark` | `BenchmarkInteraction.ts` | ❌ Missing | L8 gate (W3) | Number-line + zones + drag-to-place cards |
| `order` | `OrderInteraction.ts` | ❌ Missing | L9 gate (W4) | Sequence drag-to-stack for 3–6 fractions |
| `placement` | `PlacementInteraction.ts` | ⚠️ Partial | L8 (optional) | Number-line with draggable fraction card; may reuse for L8 |

### 2.2 Components (Required)

| Component | File | Status | Needed By | Notes |
|-----------|------|--------|-----------|-------|
| SymbolicFractionDisplay | `src/components/SymbolicFractionDisplay.ts` | ❌ Missing | L6 gate (W2) | Renders `numerator/denominator` text below bar models |

### 2.3 Detectors (Critical for Validation)

| Detector | File | Status | Needed By | Notes |
|----------|------|--------|-----------|-------|
| detectWHB01 | `src/engine/misconceptionDetectors.ts` | ❌ Missing | L6 gate (W2) | Whole-number bias (numerator) |
| detectWHB02 | `src/engine/misconceptionDetectors.ts` | ❌ Missing | L7 gate (W2) | Whole-number bias (denominator) |
| detectMAG01 | `src/engine/misconceptionDetectors.ts` | ❌ Missing | L8 gate (W3) | Magnitude blindness |
| detectPRX01 | `src/engine/misconceptionDetectors.ts` | ❌ Missing | L8 gate (W3) | Proximity-to-1 confusion |

### 2.4 Curriculum Content (Required)

| Level | File | Templates | Status | Needed By |
|-------|------|-----------|--------|-----------|
| L6 (compare_same_denominator) | `docs/10-curriculum/levels/level-06.md` | 13 | ❌ Missing | L6 gate (W2) |
| L7 (compare_same_numerator) | `docs/10-curriculum/levels/level-07.md` | 13 | ❌ Missing | L6–L7 gate (W2) |
| L8 (benchmark_sort) | `docs/10-curriculum/levels/level-08.md` | 13 | ❌ Missing | L8 gate (W3) |
| L9 (ordering) | `docs/10-curriculum/levels/level-09.md` | 10 | ❌ Missing | L9 gate (W4) |
| **Total** | — | **49** | ❌ | Phase 3 exit |

### 2.5 Testing (Required)

| Test Suite | File | Status | Needed By | Notes |
|-----------|------|--------|-----------|-------|
| Misconception detector unit tests | `tests/unit/engine/misconceptionDetectors.test.ts` | ❌ Missing | W3 | All 4 detectors, coverage of true-positive + true-negative cases |
| CompareInteraction integration | `tests/integration/compare.test.ts` | ⚠️ Partial | W2 | May exist; verify symbolic notation renders |
| BenchmarkInteraction integration | `tests/integration/benchmark.test.ts` | ❌ Missing | W3 | Zone detection, card placement, timing validation |
| OrderInteraction integration | `tests/integration/order.test.ts` | ❌ Missing | W4 | Sequence validation, all orders |

### 2.6 PWA & Deployment (Required)

| Task | File(s) | Status | Needed By | Notes |
|------|---------|--------|-----------|-------|
| Manifest update | `public/manifest.json` | ⚠️ Partial | W5 | Icons may be missing; verify 192×192 + 512×512 |
| Service worker | `public/sw.js` or Vite config | ⚠️ Check | W5 | Verify offline caching enabled |
| Persistent storage call | `src/main.ts` or init point | ❌ Missing | W5 | Call `navigator.storage.persist()` on first launch |
| Deploy URL | (TBD) | ❌ Missing | W5 | Netlify or Cloudflare Pages |

---

## 3. LevelScene Enhancements Needed

### 3.1 Resume Support

**Current:** LevelScene loads templates on every init, doesn't support resuming a paused session.

**Needed:** 
- Add `resume?: boolean` to `LevelSceneData` interface
- In `create()`, check `this.resume` → if true, load last unclosed session from IndexedDB
- Skip template fetch and jump to `loadQuestion(resumeIndex)`

**Why:** Per playtest protocol (playtest-protocol.md §6), students pause sessions and resume later. Sessions that aren't closed via "Quit" button should auto-resume.

### 3.2 Misconception Detector Runner

**Current:** `onCommit()` validates answer and stores attempt; no detector integration.

**Needed:**
- Import detector functions: `detectWHB01, detectWHB02, detectMAG01, detectPRX01`
- After validation, fetch last 5–8 attempts: `const recent = await attemptRepo.getLastN(this.studentId, 8)`
- Run detectors in sequence:
  ```typescript
  const flag = 
    detectWHB01(recent, this.levelNumber) ??
    detectWHB02(recent, this.levelNumber) ??
    detectMAG01(recent, this.levelNumber) ??
    detectPRX01(recent, this.levelNumber);
  if (flag) await misconceptionFlagRepo.insert(flag);
  ```

---

## 4. Quick Reference: Files to Create vs. Modify

### Create (New)

```
src/components/SymbolicFractionDisplay.ts
src/engine/misconceptionDetectors.ts
src/scenes/interactions/BenchmarkInteraction.ts
src/scenes/interactions/OrderInteraction.ts
tests/unit/engine/misconceptionDetectors.test.ts
docs/10-curriculum/levels/level-06.md
docs/10-curriculum/levels/level-07.md
docs/10-curriculum/levels/level-08.md
docs/10-curriculum/levels/level-09.md
```

### Modify (Existing)

```
src/scenes/LevelScene.ts                           (add resume + detector runner)
src/scenes/interactions/CompareInteraction.ts      (integrate SymbolicFractionDisplay)
src/scenes/utils/levelRouter.ts                    (already set up for new interactions)
public/manifest.json                               (verify + update icons)
src/main.ts or MenuScene.ts                        (persistent storage call)
```

---

## 5. Implementation Order (Recommended)

Based on dependencies and gates:

1. **Week 1:**
   - [ ] SymbolicFractionDisplay.ts + integrate into CompareInteraction
   - [ ] Update LevelScene for resume support
   - [ ] Create level-06.md + level-07.md templates (or stubs)
   - [ ] Begin misconception detectors (WHB-01, WHB-02)

2. **Week 2:**
   - [ ] Finish misconception detectors (WHB-01, WHB-02)
   - [ ] Unit tests for detectors
   - [ ] CompareInteraction tests on 360px + iPad
   - [ ] **L6–L7 Gate:** Verify scenes load, notation renders, detectors fire

3. **Week 3:**
   - [ ] BenchmarkInteraction.ts + tests
   - [ ] MAG-01, PRX-01 detectors + unit tests
   - [ ] Create level-08.md templates
   - [ ] Timing validation: Easy tier < 13 min
   - [ ] **L8 Gate:** Benchmark-sort works, timing passes

4. **Week 4:**
   - [ ] OrderInteraction.ts + tests
   - [ ] Create level-09.md templates
   - [ ] Integration tests: L6–L9 end-to-end
   - [ ] **L9 Gate:** Ordering works, all templates seeded

5. **Week 5:**
   - [ ] PWA hardening: manifest, icons, persistent storage
   - [ ] Deploy to stable URL
   - [ ] Smoke test on real device (iPad + Android)
   - [ ] **Cycle B Readiness:** App installs + data persists

---

## 6. Testing Checklist (Quick Reference)

### Before L6–L7 Gate

```
npm run test:unit                           # SymbolicFractionDisplay, WHB-01, WHB-02
npm run test:integration -- compare         # CompareInteraction on level 6
npm run build                               # No TypeScript errors
npm run preview                             # App loads, L6 plays to completion
```

### Before L8 Gate

```
npm run test:unit                           # All detectors + BenchmarkInteraction
npm run test:integration -- benchmark       # Drag-to-zone validation
npm run test:integration -- timing          # Easy tier < 13 min
npm run build && npm run preview
```

### Before L9 Gate

```
npm run test:unit                           # All interactions
npm run test:integration                    # L6–L9 full sequence
npm run test:e2e -- synthetic               # Hard refresh + resume
npm run build && npm run preview
```

### Before Cycle B

```
npm run test                                # All tests (unit + integration + e2e)
npm run build                               # Final bundle
npm run preview                             # Smoke test on localhost
# Manual test on iPad + Android at deployed URL
```

---

## 7. Risk Summary

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Templates late → scenes stall | High | Stub fallback templates immediately; swap when real ones arrive |
| Timing overruns on L8 | High | Measure early (W2); reduce complexity if needed |
| PWA install fails on iOS | High | Test early (W4); fix manifest issues same day |
| Detectors fire too aggressively | Medium | Start with 5+ attempts + 60% threshold; monitor playtest data |
| Misconception data not persisted | Medium | Verify misconceptionFlagRepo.insert() is wired into onCommit() |

---

## 8. Success Criteria (Phase 3 Done)

All of the following must be true:

- [ ] L6–L9 scenes load and play without crashes
- [ ] All 49 templates seeded and rendering
- [ ] Misconception detectors working: WHB-01, WHB-02, MAG-01, PRX-01
- [ ] Unit tests passing: `npm run test:unit`
- [ ] Build succeeds: `npm run build` (bundle < 2 MB)
- [ ] PWA installs on iOS Safari + Android Chrome
- [ ] Data persists across app restart (manual test on real device)
- [ ] App deployed to stable URL
- [ ] Cycle B recruitment confirmed (8–10 students scheduled)

---

## 9. Key Files to Review First

Read these to understand current state before starting:

1. **`docs/50-roadmap/mvp-l1-l9.md` (§3, §10.5)** — phase gates + effort estimates
2. **`docs/20-mechanic/activity-archetypes.md` (§5, §6, §7, §8)** — archetypes 5–8 (compare, benchmark, order, placement)
3. **`docs/10-curriculum/misconceptions.md` (§3.1–§3.4)** — WHB, MAG, PRX families + detection signals
4. **`PLANS/phase-3-implementation.md`** — this plan (detailed checklist)
5. **`src/scenes/LevelScene.ts`** — router implementation
6. **`src/scenes/interactions/CompareInteraction.ts`** — existing compare logic (extend this)

---

## 10. Next Action

Start with Week 1 checklist:

1. Create `src/components/SymbolicFractionDisplay.ts` (2–3 hours)
2. Integrate into `src/scenes/interactions/CompareInteraction.ts` (2 hours)
3. Add resume support to `LevelScene.ts` (1 hour)
4. Create stub detectors in `src/engine/misconceptionDetectors.ts` (2 hours)
5. Create level-06 + level-07 templates (stubs or real content, 4 hours)

**Total Week 1:** ~11 hours. Aim to finish by Thursday to keep buffer for L6–L7 gate by Friday.

---

*End of Checkpoint*
