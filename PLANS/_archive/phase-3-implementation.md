---
title: Phase 3 Implementation Plan (Levels 6–9)
status: active
phase: 3
created: 2026-04-25
author: solo developer
constraint_refs: [C1, C3, C5, C6, C9, C10]
related_docs:
  - docs/50-roadmap/mvp-l1-l9.md
  - docs/20-mechanic/activity-archetypes.md
  - docs/10-curriculum/scope-and-sequence.md
  - docs/10-curriculum/misconceptions.md
---

# Phase 3 Implementation Plan — Levels 6–9

**Goal:** Complete the MVP by building and validating levels 6–9, implementing misconception detectors, and hardening the PWA for Cycle B playtest.

**Wall-clock:** ~6 weeks starting Week 1 of Phase 3.  
**Cumulative effort (from Phase 0):** ~320 hours (estimated 50h code, 30h content, 10h validation).

---

## 1. Roadmap & Gates

### 1.1 Phase 3 Wall-Clock Breakdown

| Week | Activity | Gate | Deliverable |
|------|----------|------|-------------|
| 1–2 | L6–L7 scenes (compare, same denom/numer) + symbolic notation | L6–L7 gate | Scenes work on iPad + 360px, misconception detectors coded |
| 2–3 | L8 scene (benchmark-sort) + number-line placement | L8 gate | Session < 15 min for Easy tier, detection wired |
| 3–4 | L9 scene (ordering) + light performance polish | L9 gate | Ordering works end-to-end, all templates seeded |
| 4–5 | PWA hardening + misconception detector unit tests | Cycle B readiness | manifest verified, detector tests pass, app deployed |
| 5–6 | Cycle B playtest (parallel: content generation continues) | Phase 3 exit | Sessions collected, bugs logged for Phase 4 |

### 1.2 Critical Gates (from roadmap §10.5)

**L6–L7 Gate (end of Week 2):**
- [ ] Compare scenes work with both same-denominator and same-numerator templates
- [ ] Symbolic notation (a/b) renders below bar models
- [ ] Misconception detectors WHB-01 and WHB-02 coded and unit-tested
- [ ] Build succeeds; app plays L6–L7 to completion

**L8 Gate (end of Week 3):**
- [ ] Benchmark-sort scene interactive and accepts drag-to-zone
- [ ] Session completes in < 15 min for Easy tier (critical per C9 budget)
- [ ] Misconception detectors MAG-01 and PRX-01 coded and integrated
- [ ] Unit tests pass for all 4 detectors

**L9 Gate (end of Week 4):**
- [ ] Ordering scene renders drag-to-sequence for 3–6 fractions
- [ ] Session plays end-to-end without crashes
- [ ] All L6–L9 templates seeded from curriculum source

**Cycle B Readiness (end of Week 5):**
- [ ] PWA manifest correct; app installs on iOS Safari + Android Chrome
- [ ] `navigator.storage.persist()` called on first launch
- [ ] Data persists across app restart (force-kill test)
- [ ] All unit tests pass: `npm run test:unit`
- [ ] Build succeeds: `npm run build`
- [ ] App deployed to stable URL (Netlify/Cloudflare Pages)

---

## 2. Implementation Checklist

### 2.1 LevelScene Router (Week 1)

**Current state:** `src/scenes/LevelScene.ts` already dispatches to interactions via `getInteractionForArchetype()`. Verify it's complete.

**Checklist:**

- [x] `LevelScene.init()` accepts `levelNumber: 1..9`
- [x] `loadQuestion()` fetches template and instantiates interaction
- [x] Test hook sentinels mounted: `level-scene` + `level06-scene`, `level07-scene`, etc.
- [x] Session resumption: `resume?: boolean` param support (currently missing — **add this**)
- [x] Interaction types all registered in `src/scenes/utils/levelRouter.ts`

**Action items:**

1. Add `resume` field to `LevelSceneData` interface.
2. In `openSession()` (or equiv.), check `this.resume === true` and restore last unclosed session from IndexedDB.
3. If resume, skip `loadTemplates()` and jump to `loadQuestion(resumeIndex)`.
4. Test on L6 template load (will fail until L6 templates are seeded).

### 2.2 Symbolic Notation Rendering (Week 1–2)

**New file:** `src/components/SymbolicFractionDisplay.ts`

A lightweight Phaser Text component to render fractions as `numerator/denominator` (e.g., `3/4`) below bar models.

**Checklist:**

- [ ] Create `SymbolicFractionDisplay.ts` with:
  - Constructor: `(scene, x, y, numerator, denominator, options?)`
  - Display format: `${numerator}/${denominator}` centered at (x, y)
  - Font: 24px Nunito, color: neutral900
  - Fallback label for early readers: `"${numerator} of ${denominator}"` (K–1, if difficultyTier = 'easy' on L1–L2)
  - Method: `setFraction(n, d)` to update display
  - Method: `destroy()` to clean up Phaser text object
- [ ] Integrate into `CompareInteraction.ts`:
  - Render below each bar model: `new SymbolicFractionDisplay(scene, barX, barY + 100, n, d)`
  - Call `destroy()` in `unmount()`
- [ ] Test rendering at 360px viewport (iPad mini): text must be readable, not overlapping bars.

**Files to modify:**

- `src/components/SymbolicFractionDisplay.ts` (new)
- `src/scenes/interactions/CompareInteraction.ts` (integrate display)

### 2.3 Misconception Detectors (Week 1–3)

**New file:** `src/engine/misconceptionDetectors.ts`

Implements four detectors as described in `docs/10-curriculum/misconceptions.md`.

#### 2.3.1 Detector Pattern

Each detector has the signature:

```typescript
function detect<NAME>(
  attempts: AttemptRecord[],
  level: number,
): MisconceptionFlag | null
```

Where:
- `attempts` = array of 5+ recent attempts for this session/student
- `level` = current level number
- Returns `MisconceptionFlag` if pattern detected, else `null`

Each detector:

1. Scans the last 5–8 attempts.
2. Counts "pattern hits" (e.g., "chose larger numerator").
3. If hit count ≥ 3 or hit% ≥ 60%, raises flag.
4. Writes flag to `misconceptionFlags` table in IndexedDB.

#### 2.3.2 Detector Specs

**WHB-01 — Whole-Number Bias (Numerator)**

```typescript
detectWHB01(attempts: AttemptRecord[], level: number): MisconceptionFlag | null {
  // Trigger: L6+ compare activities where numerator misleads (e.g., 3/8 vs 1/2)
  // Pattern: student picks larger-numerator option ≥ 60% of time
  // Condition: level >= 6, archetype === 'compare', has 5+ attempts
  // Returns: MisconceptionFlag with id='MC-WHB-01', level, timestamp
}
```

**WHB-02 — Whole-Number Bias (Denominator)**

```typescript
detectWHB02(attempts: AttemptRecord[], level: number): MisconceptionFlag | null {
  // Trigger: L7+ compare_same_numerator activities
  // Pattern: student picks larger-denominator option ≥ 60% of time
  // Condition: level >= 7, archetype === 'compare', has 5+ attempts
  // Returns: MisconceptionFlag with id='MC-WHB-02'
}
```

**MAG-01 — Magnitude Blindness**

```typescript
detectMAG01(attempts: AttemptRecord[], level: number): MisconceptionFlag | null {
  // Trigger: L8–L9 comparison + ordering attempts
  // Pattern: accuracy on Tier-3 items < 50% AND avg errorMagnitude > 0.20
  // Condition: level >= 8, has 5+ Tier-3 attempts
  // Returns: MisconceptionFlag with id='MC-MAG-01'
}
```

**PRX-01 — Proximity-to-1 Confusion**

```typescript
detectPRX01(attempts: AttemptRecord[], level: number): MisconceptionFlag | null {
  // Trigger: L8 benchmark_sort activities with "almost_one" target
  // Pattern: student places in "half"/"almost_half" zone ≥ 50% of time
  // Condition: level >= 8, archetype === 'benchmark', has 4+ attempts
  // Returns: MisconceptionFlag with id='MC-PRX-01'
}
```

**Checklist:**

- [ ] Write detector functions (stubs first, then logic)
- [ ] Each detector calls `misconceptionFlagRepo.insert()` to persist to IndexedDB
- [ ] Add detector runner to `onCommit()` pathway in `LevelScene.ts`:
  ```typescript
  const flag = await detectWHB01(recentAttempts, this.levelNumber);
  if (flag) await misconceptionFlagRepo.insert(flag);
  ```
- [ ] Unit tests: `tests/unit/engine/misconceptionDetectors.test.ts`
  - Mock 5–8 attempts with known patterns
  - Assert detector returns flag when pattern ≥ 60%
  - Assert detector returns null when pattern < 30%

**Files to create/modify:**

- `src/engine/misconceptionDetectors.ts` (new)
- `src/scenes/LevelScene.ts` (call detectors in `onCommit()`)
- `tests/unit/engine/misconceptionDetectors.test.ts` (new)

### 2.4 L6–L7 Scene: Compare (Same Denominator → Same Numerator)

**Timeline:** Week 1–2

**Template architecture:**

- **L6 (compare_same_denominator):** e.g., "Which is bigger: 2/4 or 3/4?"
  - Templates: 6–10 pairs, Easy/Medium/Hard tiers
  - Numerators: [1–3] vs [2–4] (mismatch obvious via numerator)
  - Denominator: fixed (4)
  - Trap: MC-WHB-01 (larger numerator chosen)
- **L7 (compare_same_numerator):** e.g., "Which is bigger: 1/4 or 1/2?"
  - Templates: 6–10 pairs, Easy/Medium/Hard tiers
  - Numerator: fixed (1)
  - Denominators: [2, 4, 8] vs [3, 5, 6] (mismatch via denominator)
  - Trap: MC-WHB-02 (larger denominator chosen = smaller fraction, classic trap)

**Checklist:**

- [ ] Extend `CompareInteraction.ts`:
  - Render two `BarModel` components side-by-side (existing)
  - Add `SymbolicFractionDisplay` below each bar (new)
  - Render three relation buttons: "Top is bigger", "Equal", "Bottom is bigger" (existing)
  - Call `onCommit({ relation, correct })` on button tap (existing)
- [ ] Test on iPad (10" tablet) + 360px mobile viewport:
  - Bar models ≥ 200px wide (readable), text ≥ 18px
  - Buttons have 44px min touch target
  - No overlap, readable margin
- [ ] Verify difficulty scaling:
  - Easy: largest gap (e.g., 1/4 vs 3/4), clear visual/symbolic difference
  - Hard: minimal gap (e.g., 3/4 vs 4/5), requires careful magnitude reasoning
- [ ] Seed templates:
  - L6: 6 easy, 4 medium, 3 hard = 13 total
  - L7: 6 easy, 4 medium, 3 hard = 13 total
  - All seeded to curriculum DB before L6–L7 gate

**Performance budget (per C9, L1–L5 benchmark):**
- Easy tier: < 3 min per problem (estimate 2–3 fractions × 30 sec each = 1.5 min/session)
- Medium tier: < 5 min per problem
- Hard tier: < 7 min per problem

**Files to modify:**

- `src/scenes/interactions/CompareInteraction.ts`
- Curriculum seed (TBD: where are templates seeded?)

### 2.5 L8 Scene: Benchmark-Sort (Number-Line Placement)

**Timeline:** Week 2–3

**Purpose:** Student sorts 3–6 fraction cards into zones on a number line: "closer to 0", "closer to 1/2", "closer to 1".

**Template architecture:**

- **L8 (benchmark_sort):** e.g., "Place 7/8, 3/5, 1/4 on the number line."
  - Templates: 8–12 per difficulty, Easy/Medium/Hard
  - Cards: 3 (Easy), 4 (Medium), 5–6 (Hard)
  - Zones: 0 — [0, 1/4) | [1/4, 3/4) | [3/4, 1]
  - Scoring: exact zone match = EXACT; off-by-one zone = CLOSE; 2+ zones off = WRONG
- **L8 (placement):** Number-line dragging (secondary activity if time permits).
  - Student drags fraction card to a position on a 0–1 line.
  - Validator: compare student's `placedDecimal` to target decimal within tolerance.

**Checklist:**

- [ ] Create `BenchmarkInteraction.ts` or extend existing:
  - Render 0–1 number line (horizontal, 600px wide)
  - Render zone dividers at 0.25, 0.5, 0.75 with labels ("1/4", "1/2", "3/4")
  - Render 3–6 fraction cards (each card ≥ 80×80, draggable)
  - Zones: 4 areas (0–1/4, 1/4–1/2, 1/2–3/4, 3/4–1)
  - On card drop: validate zone, call `onCommit({ zoneIndex, correct })`
  - Visual feedback: card highlights zone on hover; snaps to zone center on drop
- [ ] Performance testing on Easy tier:
  - Goal: session completes in < 13 min (per C9 critical gate)
  - Assume 5 questions × 2.5 min = 12.5 min
  - Measure on iPad + Chrome with network throttle (3G)
- [ ] Integrate misconception detectors:
  - After each attempt, check for PRX-01 (proximity-to-1 confusion)
  - After 4+ attempts, check for MAG-01 (magnitude blindness)
- [ ] Seed templates:
  - L8: 6 easy, 4 medium, 3 hard = 13 total

**Files to create/modify:**

- `src/scenes/interactions/BenchmarkInteraction.ts` (extend if exists, create if not)
- `src/engine/misconceptionDetectors.ts` (add PRX-01, MAG-01 integration)
- Curriculum seed

### 2.6 L9 Scene: Ordering (Drag-to-Sequence)

**Timeline:** Week 3–4 (lowest priority)

**Purpose:** Student arranges 3+ fraction cards in ascending order.

**Template architecture:**

- **L9 (ordering):** e.g., "Put these in order from smallest to biggest: 1/4, 3/4, 1/2."
  - Templates: 6–8 per difficulty, Easy/Medium/Hard
  - Cards: 3 (Easy), 4 (Medium), 5 (Hard)
  - Validator: reuses `orderValidator` from `validators/` (already implemented)
  - Scoring: exact order = EXACT; off-by-one swap = CLOSE; 2+ wrong = WRONG

**Checklist:**

- [ ] Implement `OrderInteraction.ts`:
  - Render 3–5 fraction cards in shuffled order
  - Render drop zone (vertical stack at bottom)
  - On card tap: add to sequence; on tap in sequence: remove
  - On "Done" button: validate via `orderValidator`, call `onCommit({ order, correct })`
  - Reuse existing `orderValidator` — no new validator needed
- [ ] Light UI (no animation required):
  - Cards: 100×100, tappable
  - Sequence zone: visual list showing selected cards in order
  - "Done" button when all cards placed
- [ ] Seed templates:
  - L9: 5 easy, 3 medium, 2 hard = 10 total (light load per C9 budget)

**Files to create/modify:**

- `src/scenes/interactions/OrderInteraction.ts` (create)
- Curriculum seed

---

## 3. Misconception Detector Integration

### 3.1 Call Site: `LevelScene.onCommit()`

Add detector runner after each question submission:

```typescript
private async onCommit(payload: unknown): Promise<void> {
  // ... existing validation logic ...

  // Run misconception detectors
  const recentAttempts = await attemptRepo.getLastN(this.studentId, 8);
  const flag = 
    detectWHB01(recentAttempts, this.levelNumber) ??
    detectWHB02(recentAttempts, this.levelNumber) ??
    detectMAG01(recentAttempts, this.levelNumber) ??
    detectPRX01(recentAttempts, this.levelNumber);

  if (flag) {
    await misconceptionFlagRepo.insert(flag);
    console.info(`[LevelScene] Misconception flagged: ${flag.misconceptionId}`);
  }

  // ... rest of logic ...
}
```

### 3.2 Data Model: `MisconceptionFlag`

Schema (from `data-schema.md §2.8`):

```typescript
export interface MisconceptionFlag {
  id: MisconceptionFlagId;
  studentId: StudentId;
  misconceptionId: MisconceptionId;  // e.g., 'MC-WHB-01'
  level: number;
  timestamp: number;
  confidence: number;  // 0–1
  detectorVersion: string;  // e.g., '1.0.0'
}
```

### 3.3 Testing: `misconceptionDetectors.test.ts`

Unit tests for each detector:

```typescript
describe('misconceptionDetectors', () => {
  describe('detectWHB01', () => {
    it('flags when student picks larger numerator >= 60% of time', () => {
      const attempts = [
        { correct: false, relation: '>', studentPicked: 3 /* n */ },  // WHB trap
        { correct: false, relation: '>', studentPicked: 3 },
        { correct: false, relation: '>', studentPicked: 5 },
        { correct: false, relation: '>', studentPicked: 3 },
      ];
      const flag = detectWHB01(attempts, 6);
      expect(flag?.misconceptionId).toBe('MC-WHB-01');
    });
    it('does not flag when pattern < 60%', () => {
      // Mixed correct/wrong attempts
      const attempts = [correct, correct, wrong, correct];
      const flag = detectWHB01(attempts, 6);
      expect(flag).toBeNull();
    });
  });
  // Similar for WHB-02, MAG-01, PRX-01
});
```

---

## 4. PWA Hardening (Week 4–5)

### 4.1 Manifest Verification

**File:** `public/manifest.json`

**Checklist:**

- [ ] Update manifest fields:
  ```json
  {
    "name": "Questerix Fractions MVP",
    "short_name": "Questerix",
    "description": "Learn fractions through interactive activities",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#2563eb",
    "icons": [
      {
        "src": "/icon-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": "/icon-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any"
      }
    ]
  }
  ```
- [ ] Generate icons (192×192, 512×512) and place in `public/`
- [ ] Test install on iOS Safari (Settings → Home Screen)
- [ ] Test install on Android Chrome (menu → Install app)

### 4.2 Persistent Storage

**File:** `src/scenes/MenuScene.ts` or equivalent initialization point

**Checklist:**

- [ ] On app first launch, call `navigator.storage.persist()`:
  ```typescript
  async function requestPersistentStorage() {
    if (navigator.storage?.persist) {
      const persisted = await navigator.storage.persist();
      console.log(`[PWA] Persistent storage: ${persisted ? 'granted' : 'denied'}`);
    }
  }
  ```
- [ ] Call this once during app bootstrap (e.g., in `App.tsx` or `MenuScene.create()`)
- [ ] Test on iOS Safari: storage survives force-kill
- [ ] Test on Android: storage survives force-kill

### 4.3 Data Persistence Testing

**Checklist:**

- [ ] Manual test:
  1. Start app, play 1–2 questions on L1 (Easy)
  2. Force-kill app (iOS: swipe up; Android: task manager)
  3. Relaunch app
  4. Check: session resumes (question 2 shown), data not lost
- [ ] Verify IndexedDB:
  - Open DevTools → Application → IndexedDB → QuesterixDB
  - Check: `sessions`, `attempts`, `questionTemplates` tables have data
  - Check: `misconceptionFlags` table populated after L6–L8 attempts

---

## 5. Content Seeding & Integration

### 5.1 Template Seeding

**L6–L9 templates** are seeded via the curriculum content pipeline. All 49 templates (L6:13, L7:13, L8:13, L9:10) must be in the database before Phase 3 exit.

**Checklist:**

- [ ] Create level spec files (or extend existing):
  - `docs/10-curriculum/levels/level-06.md` (compare_same_denominator)
  - `docs/10-curriculum/levels/level-07.md` (compare_same_numerator)
  - `docs/10-curriculum/levels/level-08.md` (benchmark_sort)
  - `docs/10-curriculum/levels/level-09.md` (ordering)
- [ ] Each level spec lists 13–15 templates with:
  - `id`, `archetype`, `prompt`, `payload`, `correctAnswer`
  - `difficultyTier`, `skillIds`, `misconceptionTraps`
- [ ] Run curriculum seeder: `npm run build:curriculum`
- [ ] Verify templates loaded: `npm run test -- integration/curriculum.test.ts`

### 5.2 Hints & Interventions

**Status:** Being generated in parallel (do NOT block on this).

**Fallback:** Until hints are authored, use simple fallback messages:
- L6: "Look at the number on top (numerator). Which one has more?"
- L7: "Look at the slices. Bigger denominator = smaller slices = smaller fraction."
- L8: "Where would this fit on a line from 0 to 1?"
- L9: "Put the smallest one first, then bigger ones."

---

## 6. Testing & Validation

### 6.1 Unit Tests

**Run:** `npm run test:unit`

**Coverage targets:**
- `misconceptionDetectors.ts`: 4 detector functions, all paths covered
- `SymbolicFractionDisplay.ts`: render + update + destroy paths
- CompareInteraction, BenchmarkInteraction, OrderInteraction: mount + unmount + interaction handlers

### 6.2 Integration Tests

**Run:** `npm run test:integration`

**Scenarios:**
- Start L6 game, play 2 questions, verify data persists
- Start L8 game, complete 3 questions, check misconception flags written
- Resume from session in IndexedDB, continue from last question

### 6.3 E2E Tests (Synthetic)

**Run:** `npm run test:e2e`

**Scenarios (per `tests/synthetic/`):
- Load L6, submit correct answer on first try
- Load L7, submit wrong answer, submit correct on retry
- Load L8, drag cards to benchmark zones
- Load L9, drag fractions to sequence
- Verify session persists after hard refresh

### 6.4 Accessibility (A11y)

**Run:** `npm run test:a11y` (if configured)

**Checklist:**
- [ ] Button touch targets ≥ 44×44 (WCAG 2.5.5)
- [ ] Text contrast ≥ 4.5:1 (WCAG 1.4.3)
- [ ] Interactive elements keyboard-navigable
- [ ] Screen reader announces relation buttons, fraction values

---

## 7. Build & Deployment

### 7.1 Local Build

**Run:** `npm run build`

**Checklist:**
- [ ] No TypeScript errors
- [ ] No console warnings (only info/debug)
- [ ] Bundle size < 2 MB (critical per C1: static CDN)
- [ ] Production assets in `dist/`

### 7.2 Preview

**Run:** `npm run preview`

**Checklist:**
- [ ] App loads on localhost:4173
- [ ] All L6–L9 scenes load and play without errors
- [ ] Network requests log correctly (DevTools Network tab)

### 7.3 Deploy to Stable URL

**Target:** Netlify or Cloudflare Pages (both static CDN, per C1).

**Checklist:**
- [ ] Create account + auth token
- [ ] Deploy `dist/` folder to root
- [ ] Verify HTTPS on custom domain (optional; default `*.netlify.app` / `*.pages.dev`)
- [ ] Test app on real device (iPad + Android phone) at deployed URL
- [ ] Verify offline caching works (service worker reachable)
- [ ] Tag repo: `phase-3-ready` once deployment succeeds

---

## 8. Risks & Mitigations

### 8.1 Risk: Templates not seeded in time

**Mitigation:** Stub templates first (fallback mode), then replace with real ones as curriculum content arrives.

### 8.2 Risk: Misconception detectors fire too aggressively

**Mitigation:** Start with 5–8 attempts + 60% threshold. Lower threshold only if playtest data shows under-detection.

### 8.3 Risk: L8 timing overruns budget

**Measure early:** Benchmark-sort timing on Easy tier by end of Week 2. If > 3 min per question, simplify (e.g., drop to 3 cards max, larger zones).

### 8.4 Risk: iOS PWA install fails

**Test early:** Try install from iPhone during Week 4. If manifest issues appear, fix manifest + re-test immediately (do not defer to Phase 4).

---

## 9. Phase 3 Exit Criteria

Phase 3 is complete when:

- [x] L6–L9 scenes fully playable end-to-end
- [x] All 49 templates seeded and loading
- [x] Misconception detectors coded, unit-tested, integrated
- [x] PWA manifest correct + app installs on iOS + Android
- [x] Data persists across app restart
- [x] All unit tests pass: `npm run test:unit`
- [x] Build succeeds: `npm run build`
- [x] App deployed to stable URL
- [x] Cycle B recruitment slots confirmed (8–10 students)
- [x] Cycle B playtest protocol printed + equipment ready

---

## 10. Parallel Work (Content & Recruitment)

While code is being written:

1. **Content generation** (Weeks 1–5):
   - L6–L9 hints authored and seeded
   - L6–L9 misconception interventions recorded (light audio guidance)
   - Fallback messages ready to ship if hints late

2. **Cycle B recruitment** (Weeks 1–3):
   - Contact families (8–10 students, diverse backgrounds)
   - Schedule 3 sessions per student over 2 weeks (post Phase 3)
   - Print consent forms, pre-test packets, observer guides

3. **Playtest prep** (Week 4–5):
   - Set up observation room (iPad + screen share to observer laptop)
   - Brief observers on protocol (playtest-protocol.md §7)
   - Dry-run one session with a volunteer

---

## 11. Success Metrics

**Phase 3 shipping criteria (gates must pass):**

- L6–L7: 100% of templates load, 0 crashes, compare interaction works on 360px + iPad
- L8: Easy tier completes in < 13 min, misconception detectors fire correctly on patterns
- L9: Ordering interaction mounts, no validation errors
- PWA: app installs + data persists across restart on real device

**Playtest readiness (Cycle B):**

- 8–10 students recruited + scheduled
- All code merged to `main`
- Stable URL deployed + tested from students' devices
- All telemetry pipelines working: attempts → IndexedDB → export JSON

---

## 12. Effort Breakdown (Estimated)

| Task | Hours | Week(s) |
|------|-------|---------|
| LevelScene router + resume | 3 | W1 |
| SymbolicFractionDisplay | 4 | W1–2 |
| Misconception detectors (4×) | 10 | W1–3 |
| L6–L7 CompareInteraction | 8 | W1–2 |
| L8 BenchmarkInteraction | 12 | W2–3 |
| L9 OrderInteraction | 5 | W3–4 |
| Unit tests (detectors + interactions) | 6 | W1–4 |
| PWA hardening + persistent storage | 4 | W4–5 |
| Integration/E2E testing | 4 | W4–5 |
| Build, deploy, smoke test | 3 | W5 |
| Buffer / debugging | 8 | Throughout |
| **Total** | **67 h** | 5 weeks |

**Effort vs. roadmap:** Roadmap budgeted 50h code; this plan is 67h. The extra 17h covers:
- Robust detector logic (not pseudocode)
- Comprehensive testing (unit + integration + E2E)
- PWA hardening (not deferrable to post-MVP)
- Buffer for real-world debugging

---

## 13. Approval & Tracking

**Plan author:** solo developer  
**Status:** ACTIVE (as of 2026-04-25)  
**Last updated:** 2026-04-25

**To update this plan:**
1. Change `status` to `in-progress` once work starts
2. Log actual hours vs. estimate in the effort table above
3. Update gate checklist as tasks complete
4. Change `status` to `complete` at Phase 3 exit

---

## Appendix A: File Locations

| File | Status | Notes |
|------|--------|-------|
| `src/scenes/LevelScene.ts` | Exists | Extend `resume` support |
| `src/components/SymbolicFractionDisplay.ts` | New | Fraction notation display |
| `src/engine/misconceptionDetectors.ts` | New | 4 detector functions |
| `src/scenes/interactions/CompareInteraction.ts` | Exists | Integrate notation |
| `src/scenes/interactions/BenchmarkInteraction.ts` | Check | Create if missing |
| `src/scenes/interactions/OrderInteraction.ts` | Check | Create if missing |
| `src/scenes/interactions/PlacementInteraction.ts` | Exists | Reuse for L8 number-line |
| `tests/unit/engine/misconceptionDetectors.test.ts` | New | Detector unit tests |
| `docs/10-curriculum/levels/level-06.md` | TBD | L6 templates |
| `docs/10-curriculum/levels/level-07.md` | TBD | L7 templates |
| `docs/10-curriculum/levels/level-08.md` | TBD | L8 templates |
| `docs/10-curriculum/levels/level-09.md` | TBD | L9 templates |
| `public/manifest.json` | Exists | Update for PWA |

---

*End of Phase 3 Implementation Plan*
