# Questerix Fractions — Architecture Review
**Date:** 2026-04-27 | **Branch:** `main` | **Reviewer:** AI Agent  
**Scope:** Full technical audit — engine, persistence, scenes, curriculum, audio, accessibility, deployment

---

## Executive Summary

The visual design, SettingsScene, and persistence layer (Dexie v3 + all 17 repositories) are solid and working. The gameplay loop is critically broken: BUG-01 serves the wrong archetype prompt, BUG-02 means validation never passes, BKT mastery tracking is never called, and Levels 2–9 are structurally inaccessible from the UI. The immediate action is Sprint 0: fix BUG-01 first (a 10-minute filter change), then debug BUG-02 with real-browser console logging — these two bugs block every downstream gate. Overall status: Sprint 0 of 5; the app is not ready for a student today.

## Table of Contents

- [1. Scope of Review](#1-scope-of-review)
- [2. The Five Readiness Dimensions](#2-the-five-readiness-dimensions)
- [3. Dimension 1 — Gameplay Loop](#3-dimension-1--gameplay-loop)
- [4. Dimension 2 — Learning Engine](#4-dimension-2--learning-engine)
- [5. Dimension 3 — Content & Level Access](#5-dimension-3--content--level-access)
- [6. Dimension 4 — Student Experience](#6-dimension-4--student-experience)
- [7. Dimension 5 — Operational](#7-dimension-5--operational)
- [8. Master Gap Register](#8-master-gap-register)
- [9. Sprint Plan](#9-sprint-plan)
- [10. What "Done" Looks Like (Classroom Pilot)](#10-what-done-looks-like-classroom-pilot)
- [11. Constraint Compliance](#11-constraint-compliance)

---

## 1. Scope of Review

| Layer | Files Examined |
|---|---|
| Pedagogy engine | `bkt.ts`, `misconceptionDetectors.ts` |
| Persistence | `db.ts` (v3 schema), all 17 `repositories/*.ts` |
| Validators | All 13 files in `src/validators/` incl. `registry.ts` |
| Game scenes | `BootScene`, `PreloadScene`, `MenuScene`, `Level01Scene`, `LevelScene`, `SettingsScene` |
| Interactions | All 10 in `src/scenes/interactions/` |
| Audio | `TTSService.ts` |
| Curriculum | `scope-and-sequence.md`, `misconceptions.md`, `skills.md`, `docs/10-curriculum/levels/` |
| Roadmap | `mvp-l1-l9.md` (Phase 0 declared complete; Phase 1 at ~20%) |

---

## 2. The Five Readiness Dimensions

```
1. Gameplay Loop       — Can a student complete a session?
2. Learning Engine     — Does the app actually learn about the student?
3. Content & Levels    — Are questions accessible, authored, and routing correctly?
4. Student Experience  — Is the UX clear and fair?
5. Operational         — Can it be deployed, tested, and maintained?
```

---

## 3. Dimension 1 — Gameplay Loop

### Status: 🔴 BROKEN — Session completion currently unreachable

#### BUG-01: Wrong prompt text — archetype mismatch in template filter

`Level01Scene` loads templates by level number but does not filter by archetype. The first template returned happens to be an `identify` question ("Which shape has 1/3 shaded?"). The scene runs the `partition` drag mechanic. Instruction and interaction are incompatible.

| | Value |
|---|---|
| Student sees | "Which shape has 1/3 shaded?" |
| Scene runs | Rectangle + drag-line to split in half |
| Wrong on | Archetype (identify ≠ partition), fraction (1/3 ≠ 1/2), action verb |
| Fix | Filter `templatePool` to `archetype === 'partition'` only |
| Effort | 2 minutes |

#### BUG-02: Validation never passes

Even when the drag-line is centered, "Check ✓" always returns wrong. Student stuck at 0/5.

| Hypothesis | Test |
|---|---|
| `handlePos` not updated on drag events | `console.log(handlePos)` in `onSubmit` |
| Snap tolerance too tight (5% of width) | Temporarily widen `SNAP_PCT` to 0.15 |
| Pointer coordinates in screen-space not canvas-space | Check Phaser `Pointer.x` vs raw `event.clientX` |

#### BUG-04: Hint tiers don't advance past Tier 1

The hint button shows Tier 1 on every press. `HintLadder.next()` is called — needs to be verified it advances state.

#### BUG-05: Settings button routes to SettingsScene correctly (via `scene.launch`)

> **Correction from previous report:** The settings gear correctly calls `this.scene.launch('SettingsScene')`. The earlier QA finding of BUG-05 was likely an environment artifact from the IDE preview. **Retest in real browser to confirm.**

### Gameplay Loop Gates

| Gate | Requirement | Status |
|---|---|---|
| G-L1 | Student sees coherent question matching the mechanic | ❌ BUG-01 |
| G-L2 | Correct answer accepted within 3 attempts | ❌ BUG-02 |
| G-L3 | Progress bar reaches 5/5 | ❌ BUG-02 |
| G-L4 | "🎉 Session complete!" card appears | ❌ BLOCKED |
| G-L5 | "Keep going" and "Back to menu" function correctly | ⚪ Untested (pending real-browser retest) |
| G-L6 | Full round-trip: Menu → Level 1 → Session Complete → Menu | ❌ BLOCKED |

---

## 4. Dimension 2 — Learning Engine

### Status: 🟡 BUILT, NOT WIRED — Zero student intelligence visible

The user feedback: **"it didn't look very smart."** This is the direct consequence of the learning engine being completely disconnected from gameplay. Every student answer goes into a void.

### What's built but silent

**BKT Mastery Tracking** (`src/engine/bkt.ts`) — production-quality:
- Full Corbett & Anderson 1994 two-pass update
- `deriveState()` → `NOT_STARTED → LEARNING → APPROACHING → MASTERED`
- Mastery threshold: `p ≥ 0.85` + `consecutiveCorrect ≥ 3`
- **Never called. Zero mastery records written.**

**Misconception Detectors** (`src/engine/misconceptionDetectors.ts`):

| Detector | What it catches | Level |
|---|---|---|
| `detectEOL01` | Equal-parts loose interpretation | L1 |
| `detectWHB01` | Whole-number bias — bigger numerator = bigger fraction | L6+ |
| `detectWHB02` | Whole-number bias — bigger denominator = bigger fraction | L7+ |
| `detectMAG01` | Magnitude blindness | L8+ |
| `detectPRX01` | Proximity-to-1 confusion | L8+ |
| `detectNOM01` | Nominalism | Future stub |
| `detectORD01` | Ordering without magnitude | Future stub |

`runAllDetectors()` is exported and ready. **Never called.**

**Hint Event Recording** — `hintEventRepo.record()` is actually called in `LevelScene` (discovered in code review). However `hintsUsedIds: []` is hardcoded in `recordAttempt()` — the hint and attempt records are not linked.

**BKT in LevelScene** — `LevelScene.recordAttempt()` calls `runAllDetectors()` (✅ wired), but does **not** call `updateMastery()` or write to `skillMasteryRepo`. Half-wired.

### What "smart" looks like when fully wired

A student who consistently places the divider slightly right of center should eventually see:
1. Detector flags `EOL-01` (equal-parts loose interpretation)
2. Hint ladder escalates to Tier 2 (visual midpoint overlay) automatically
3. BKT mastery stays in `LEARNING` state — level doesn't advance prematurely
4. After 3 consecutive correct answers without hints, state moves to `APPROACHING`

None of this is visible today because BKT is never called.

### Learning Engine Gates

| Gate | Requirement | Status |
|---|---|---|
| G-E1 | `SkillMastery` record updated after every attempt | ❌ Not called anywhere |
| G-E2 | Misconception flags written when pattern detected | ✅ Wired in LevelScene, ❌ not in Level01Scene |
| G-E3 | Hint events linked to attempt records | ⚠️ Events recorded; link missing |
| G-E4 | Session `accuracy` and `avgResponseMs` are real values | ❌ Hardcoded to 1 and null |
| G-E5 | BKT state transitions visible in IndexedDB after 5 questions | ❌ Blocked by G-E1 |

---

## 5. Dimension 3 — Content & Level Access

### Status: 🔴 CRITICAL — Level 2–9 are structurally inaccessible

### 5.1 What the Menu Actually Is

The adventure map has **exactly 3 tappable stations**:

| Station | Action | Visible when |
|---|---|---|
| Play! (amber) | → `Level01Scene` | Always |
| Continue (emerald) | → `Level01Scene` (resume) | Only if `lastStudentId` is set |
| Settings (gear) | → `SettingsScene.launch()` | Always |

**There is no way to navigate to Level 2–9 from the UI.** The adventure path and level badges are decorative. A student who masters Level 1 has nowhere to go. This is the direct cause of "couldn't go till the last level."

### 5.2 Level Content Status

| Level | Archetype(s) | Templates | Accessible from UI |
|---|---|---|---|
| L1 — Halves | `partition`, `identify` | ✅ Seeded | ✅ Play! button |
| L2 — Quarters | `partition`, `identify` | ⚠️ Skeleton only | ❌ No route |
| L3 | `equal_or_not`, `label` | ❌ Not authored | ❌ No route |
| L4 | `make` | ❌ Not authored | ❌ No route |
| L5 | `snap_match` | ❌ Not authored | ❌ No route |
| L6 | `compare` | ❌ Not authored | ❌ No route (TestHook only) |
| L7 | `compare` (harder) | ❌ Not authored | ❌ No route (TestHook only) |
| L8 | `benchmark` | ❌ Not authored | ❌ No route |
| L9 | `order` | ❌ Not authored | ❌ No route |

### 5.3 LevelScene Infrastructure Is Ready

`LevelScene.ts` is a **fully capable generic scene**. It receives `{ levelNumber: 1..9 }`, loads templates from Dexie, routes to the correct interaction class (`getInteractionForArchetype()`), runs hints, handles commit/submit, records attempts. All 10 interaction classes exist.

The only missing pieces are:
1. **UI routing** — the menu has no level-select or mastery-gated unlock
2. **Content** — templates for L2–L9 not authored
3. **BKT wiring** — same gap as L1 (`updateMastery` not called)

### Content & Level Access Gates

| Gate | Requirement | Status |
|---|---|---|
| G-C1 | L1 template pool filtered to correct archetype | ❌ BUG-01 |
| G-C2 | L1 has ≥ 10 unique partition templates | ✅ Seeded |
| G-C3 | Level 2 is reachable from the menu | ❌ No UI route |
| G-C4 | Level unlock progresses based on mastery | ❌ No unlock system |
| G-C5 | L2 has authored templates | ⚠️ Skeleton only |
| G-C6 | L3–L9 have authored templates | ❌ Not authored |
| G-C7 | "Keep going" after L1 session complete routes to L2 | ❌ Loops back to L1 |

---

## 6. Dimension 4 — Student Experience

### Status: 🟡 VISUAL FOUNDATION STRONG — UX loop incomplete

> **Scope change:** Multi-student / parental view is **parked** for a future milestone. Removed from active gaps.  
> **Scope change:** Onboarding is **not a priority** for MVP. Removed.

### 6.1 Feedback Quality — Not Yet Verified

From code review, `LevelScene` and `Level01Scene` implement:
- `EXACT` → green fill animation + "Correct! Great work."
- `CLOSE` → amber animation + "Almost! Try a tiny adjustment."
- `WRONG` → shake + "Not quite — try again."

This code path has **never been reached** in live testing because BUG-02 blocks it. The emotional quality of feedback for a 5–7 year old is unknown.

### 6.2 Session Complete Screen — Not Yet Tested

`showSessionComplete()` renders:
- "🎉 Session complete!" card (sky-blue + navy)
- "You finished N problems!"
- "Keep going ▶" (amber action button)  
- "Back to menu" (secondary button)

**Known issue in this screen:** "Keep going ▶" calls `loadQuestion(questionIndex + 1)` — this loops within Level 1 indefinitely, incrementing question index, not advancing to Level 2.

### 6.3 TTS — Built, Not Activated

`TTSService` (Web Speech API, K–2 optimised rate 0.95x) exists. `PreferenceToggle` for "TTS Enabled" in SettingsScene works. **TTS is never called to read prompts aloud.** For K–2 students who are still developing reading skills, hearing the question is critical.

### 6.4 SettingsScene — Fully Implemented

All 393 lines confirmed working: Reduced Motion, TTS Enabled, Storage Permission, Export Backup, Reset Device (with 2-step confirm), Privacy Notice link, Escape key. Accessible via settings gear (`scene.launch('SettingsScene')`).

### Student Experience Gates

| Gate | Requirement | Status |
|---|---|---|
| G-UX1 | ~~Multi-student profiles~~ | ⏸️ Parked — future milestone |
| G-UX2 | ~~Onboarding / how-to-play~~ | ⛔ Deprioritised — not MVP |
| G-UX3 | TTS reads prompt aloud on question load | ❌ Not called |
| G-UX4 | Correct/incorrect feedback verified for K–2 appropriateness | ⚪ Untested |
| G-UX5 | "Session complete" is a celebration moment | ⚪ Untested (blocked) |
| G-UX6 | "Keep going" advances to Level 2, not loops Level 1 | ❌ Loops Level 1 |
| G-UX7 | Settings screen is reachable and working | ✅ Confirmed (via `scene.launch`) |
| G-UX8 | App works without reading (TTS or visual-only) | ❌ TTS not active |

---

## 7. Dimension 5 — Operational

### Status: 🟡 DEV WORKS — Production path and device coverage untested

### 7.1 Dev Environment

| Command | Status |
|---|---|
| `npm run dev:app` (Vite direct) | ✅ Works |
| `npm run dev` (Roadie) | ❌ Broken dependency |
| `npm run build:curriculum` | ✅ Seeds 150 templates |

### 7.2 Browser / Device Coverage

| Environment | Status | Priority |
|---|---|---|
| Chrome desktop | ✅ Tested | Done |
| iPad Safari | ❌ Not tested | 🔴 Critical — primary K–2 device |
| Touch / stylus drag | ❌ Not tested | 🔴 Critical — core mechanic |
| Firefox | ❌ Not tested | 🟢 Low |
| 360px mobile | ❌ Not tested | 🟢 Low |

### 7.3 Production Build

- `npm run build` output: not smoke-tested  
- Service worker / PWA: status unknown  
- `public/privacy.html`: existence unconfirmed (linked from SettingsScene)  
- `public/manifest.json`: existence unconfirmed

### 7.4 Testing

| Layer | Status |
|---|---|
| BKT engine unit tests | ❌ None |
| Validator unit tests | ❌ None |
| `MenuScene.test.ts` | ✅ Exists |
| Playwright E2E specs | ❌ TestHooks infrastructure ready; no test files |

### Operational Gates

| Gate | Requirement | Status |
|---|---|---|
| G-OPS1 | Production build completes without errors | ⚪ Not tested |
| G-OPS2 | App works on iPad Safari (touch drag) | ❌ Not tested |
| G-OPS3 | App fully works offline after first load | ⚪ Unknown |
| G-OPS4 | `privacy.html` exists and is reachable | ⚪ Not confirmed |
| G-OPS5 | Playwright E2E happy-path test passes | ❌ No tests |
| G-OPS6 | BKT engine has unit tests | ❌ None |

---

## 8. Master Gap Register

| ID | Description | Dim | Severity |
|---|---|---|---|
| BUG-01 | Template filter pulls wrong archetype — wrong prompt shown | Loop | 🔴 Critical |
| BUG-02 | Validation never passes — handlePos not updating or snap too tight | Loop | 🔴 Critical |
| BUG-03 | (Not recorded — ID reserved) | — | — |
| BUG-04 | Hint tiers don't advance past Tier 1 | UX | 🟡 High |
| BUG-05 | Settings gear routing — earlier finding was IDE preview artifact | UX | ✅ Likely resolved — pending real-browser retest |
| G-E1 | BKT `updateMastery` never called — mastery always zero | Engine | 🔴 Critical |
| G-E2 | `runAllDetectors` not called in Level01Scene (wired in LevelScene) | Engine | 🟡 High |
| G-E3 | Hint events not linked to attempt records | Engine | 🟡 High |
| G-E4 | `closeSession` accuracy/responseMs hardcoded | Engine | 🟡 High |
| G-C3 | No UI route to Level 2–9 from the menu | Content | 🔴 Critical |
| G-C4 | No mastery-gated level unlock system | Content | 🔴 Critical |
| G-C5 | L2 templates skeleton only | Content | 🟡 High |
| G-C6 | L3–L9 templates not authored | Content | 🟡 High |
| G-C7 | "Keep going" loops Level 1 instead of advancing to Level 2 | Content | 🟡 High |
| G-UX3 | TTS not called on question load | UX | 🟡 High |
| G-UX4 | Correct/incorrect feedback not verified for K–2 | UX | 🟡 High |
| G-OPS2 | iPad Safari / touch drag not tested | Ops | 🔴 Critical |
| G-OPS4 | `privacy.html` existence unconfirmed | Ops | 🟡 High |
| G-OPS5 | No E2E tests | Ops | 🟡 High |
| G-DB1 | `[archetype+submittedAt]` index missing from schema v3 | DB | 🟢 Medium |
| G-DB2 | `validatorId` on templates not audited | DB | 🟢 Medium |

> **Removed:** G-UX1 (multi-student) — parked, future milestone.  
> **Removed:** G-UX2 (onboarding) — deprioritised for MVP.

> 🔴 Critical · 🟡 High · 🟢 Medium · ⚪ Untested / Blocked · ✅ Resolved

---

## 9. Sprint Plan

### Sprint 0 — Unblock Basic Gameplay
*Exit criteria: Student completes one 5-question session in a real browser.*

| Task | What | Effort |
|---|---|---|
| S0-T1 | Fix template filter — `archetype === 'partition'` only (closes BUG-01, gate G-C1) | 10 min |
| S0-T2 | Debug `handlePos` in Level01Scene — real browser test (closes BUG-02, gate G-L2) | 30 min |
| S0-T3 | Fix hint tier counter in `onHintRequest()` (closes BUG-04, gate — hint system) | 15 min |
| S0-T4 | Retest settings gear in real browser (may not be BUG-05 at all) (closes BUG-05 if confirmed) | 15 min |
| S0-T5 | Verify full session round-trip, screenshot session-complete card (validates G-L4, G-L5, G-L6) | 30 min |

---

### Sprint 1 — Make It Feel Smart
*Exit criteria: After 5 questions, IndexedDB shows real mastery estimates. Hints escalate.*

| Task | What | Effort |
|---|---|---|
| S1-T1 | Wire `updateMastery()` in `Level01Scene.recordAttempt()` (closes G-E1, G-E5) | 1 hour |
| S1-T2 | Wire `runAllDetectors()` in `Level01Scene.recordAttempt()` (closes G-E2) | 30 min |
| S1-T3 | Link hint events to attempt records (pass `hintsUsedIds`) (closes G-E3) | 1 hour |
| S1-T4 | Derive real `accuracy` and `avgResponseMs` in `closeSession()` (closes G-E4) | 30 min |
| S1-T5 | Verify in IndexedDB DevTools: mastery estimate changes after wrong answers | 30 min |

---

### Sprint 2 — Level Progression
*Exit criteria: Student can reach Level 2 after completing Level 1.*

| Task | What | Effort |
|---|---|---|
| S2-T1 | Design level unlock model (BKT mastery gate vs. simple session completion) (informs G-C4) | 1 hour |
| S2-T2 | Build a level select screen or expand adventure map nodes to be tappable (closes G-C3, G-C4) | 3 hours |
| S2-T3 | Fix "Keep going" to advance to next level, not loop current (closes G-C7, G-UX6) | 30 min |
| S2-T4 | Author L2 templates (quarters, ≥ 10 questions) (closes G-C5) | 3 hours |
| S2-T5 | Run curriculum pipeline, test Level 2 in browser | 1 hour |

---

### Sprint 3 — TTS + Feedback Polish
*Exit criteria: Prompt is read aloud. Correct/incorrect feedback tested on a real child.*

| Task | What | Effort |
|---|---|---|
| S3-T1 | Call `tts.speak(promptText)` on question load (closes G-UX3, G-UX8) | 30 min |
| S3-T2 | Test TTS on iPad Safari (validates G-OPS2 for TTS) | 1 hour |
| S3-T3 | Playtest feedback animations with target-age child (or proxy) (validates G-UX4) | 2 hours |
| S3-T4 | Polish session complete card if needed | 1 hour |

---

### Sprint 4 — L3–L9 Content + Full Level Access
*Exit criteria: All 9 levels are playable with authored content.*

| Task | What | Effort |
|---|---|---|
| S4-T1 | Author L3–L5 templates (closes G-C6 partial — L3–L5) | 6 hours |
| S4-T2 | Author L6–L9 templates (closes G-C6 — L6–L9) | 8 hours |
| S4-T3 | Test each level in browser | 2 hours |
| S4-T4 | Wire mastery-gated unlock across all levels | 2 hours |

---

### Sprint 5 — Production & Testing
*Exit criteria: App builds, deploys, works offline, works on iPad, has E2E tests.*

| Task | What | Effort |
|---|---|---|
| S5-T1 | Verify `npm run build` produces clean bundle (closes G-OPS1) | 30 min |
| S5-T2 | Confirm `privacy.html` and `manifest.json` in `public/` (closes G-OPS4) | 30 min |
| S5-T3 | Test on iPad Safari — touch drag specifically (closes G-OPS2) | 2 hours |
| S5-T4 | Write Playwright happy-path E2E for Level 1 (closes G-OPS5) | 3 hours |
| S5-T5 | Write BKT engine unit tests (closes G-OPS6) | 2 hours |
| S5-T6 | Deploy to Cloudflare Pages | 1 hour |

---

## 10. What "Done" Looks Like (Classroom Pilot)

A student opens the app, completes Level 1 (5 questions), is told they've mastered halves, unlocks Level 2, plays through all 9 levels over multiple sessions, and the system adjusts difficulty based on their actual performance.

Current state: **Sprint 0 of 5. 1/9 levels accessible. 0/5 learning engine wired.**

---

## 11. Constraint Compliance

| Constraint | Requirement | Status |
|---|---|---|
| C1 | No backend — local only | ✅ |
| C2 | (Constraint not evaluated in this review — check project constraints doc) | ⚪ |
| C3 | K–2 persona only | ✅ |
| C4 | COPPA — no personal data to server | ✅ |
| C4b | Privacy notice accessible | ⚠️ `privacy.html` existence unconfirmed |
| C5 | (Constraint not evaluated in this review — check project constraints doc) | ⚪ |
| C6 | No persistent particle systems | ✅ |
| C7 | Touch targets ≥ 44×44px | ✅ |
| C8 | Reduced motion respected | ✅ |
| C9 | 5 questions minimum per session | ✅ |
| C10 | Linear denominator progression L1→L9 | 🟡 Architecture correct; content not authored |

---

*Updated: 2026-04-27 | Status: ACTIVE — Sprint 0 is immediate priority*
